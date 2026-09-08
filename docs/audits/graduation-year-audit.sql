-- Wrong-graduation_year audit.
--
-- Two members (Aysın Gün, Şinasi Yılmaz) turned out to have the wrong
-- `profiles.graduation_year`, which silently breaks Fonzip matching: the
-- membership_no we look them up by is graduation_year + school_number
-- (src/lib/fonzipMembershipNo.ts), so a wrong year means no Fonzip match, no
-- "Dernek Üyesi" tag, and the member is shown as mezun_uye. Both cases were
-- found because someone complained, not because we looked.
--
-- What this can and cannot decide, from our own data alone:
--
--   HIGH confidence — the row contradicts itself, so something IS wrong:
--     * `high_school_graduation_year` still holds a different year than
--       `graduation_year` (the Aysın Gün case: a university year ended up in
--       graduation_year). That old column is no longer read by the app, but
--       it is the closest thing we have to a second opinion.
--     * `graduation_year` equals, or comes after, `university_graduation_year`.
--     * The year is outside any plausible range.
--     * `school_number` is unusable by buildFonzipMembershipNo (no digits, or
--       more than 4), so this member can never match Fonzip whatever the year.
--     * Two members computing the same Fonzip membership_no — at least one is
--       wrong (note that "88" and "0088" collide once zero-padded).
--
--   Before treating any "Fonzip found nobody" row as a data problem, check
--   `kontrol_tarihi`: the email/phone fallback (findFonzipMemberByContact)
--   only shipped on 2026-09-08, so a 'yok' written before that date means no
--   more than "the computed membership_no didn't match" — re-running the check
--   may resolve it with no data fix at all. `bayat_kontrol = EVET` marks those.
--
--   LOW confidence — only "Fonzip found nobody". A wrong year produces this,
--   but so does a member who simply is not registered in Fonzip, and nothing
--   in our data separates the two. There is no digit pattern to exploit here:
--   Şinasi Yılmaz's 2016 should have been 1996, which is not a century slip
--   (96 and 16 differ), just a wrong entry. Settling these needs an outside
--   source — trying candidate years against Fonzip's /users search.
--
-- Run query 1 for the leads worth acting on, then query 2 for the size of the
-- unverifiable pool.

-- ============================ 1) İşaretli üyeler ============================
with temiz as (
  select
    p.id,
    p.full_name,
    p.email,
    p.graduation_year                          as gy,
    p.high_school_graduation_year              as lise_yil,
    p.university_graduation_year               as uni_yil,
    p.school_number                            as okul_no,
    regexp_replace(coalesce(p.school_number, ''), '\D', '', 'g') as okul_no_rakam,
    p.membership_tier,
    p.fonzip_membership_status                 as fonzip,
    p.fonzip_tags,
    p.fonzip_checked_at
  from profiles p
),
ayni_numara as (
  -- Same graduation_year + zero-padded school number = same Fonzip membership_no
  select gy, lpad(okul_no_rakam, 4, '0') as no4, count(*) as kisi
  from temiz
  where gy is not null and okul_no_rakam <> '' and length(okul_no_rakam) <= 4
  group by 1, 2
  having count(*) > 1
),
isaretli as (
  select
    t.*,
    -- Contradictions: these mean the data is wrong, independently of Fonzip.
    array_remove(array[
      case when t.gy is null
        then 'graduation_year boş — Fonzip eşleşmesi imkânsız'
      end,
      case when t.okul_no_rakam = ''
        then 'okul numarası yok/rakamsız — Fonzip numarası hiç üretilemiyor'
      end,
      case when length(t.okul_no_rakam) > 4
        then 'okul numarası 4 haneden uzun (' || t.okul_no || ') — Fonzip numarası üretilemiyor'
      end,
      case when t.gy is not null and t.gy < 1980
        then 'yıl çok eski (' || t.gy || ')'
      end,
      case when t.gy is not null and t.gy > extract(year from now())::int + 1
        then 'yıl gelecekte (' || t.gy || ')'
      end,
      case when t.lise_yil is not null and t.gy is not null and t.lise_yil <> t.gy
        then 'kayıtlı lise mezuniyet yılı farklı: ' || t.lise_yil
      end,
      case when t.uni_yil is not null and t.gy is not null and t.gy = t.uni_yil
        then 'graduation_year üniversite mezuniyet yılına eşit (' || t.uni_yil || ')'
      end,
      case when t.uni_yil is not null and t.gy is not null and t.gy > t.uni_yil
        then 'liseyi üniversiteden sonra bitirmiş görünüyor (üni: ' || t.uni_yil || ')'
      end,
      case when an.kisi is not null
        then 'aynı Fonzip numarası ' || an.kisi || ' üyede birden: ' || t.gy || lpad(t.okul_no_rakam, 4, '0')
      end
    ], null) as celiskiler,
    -- The only correction our own data states outright.
    case
      when t.lise_yil is not null and t.gy is not null and t.lise_yil <> t.gy
           and t.lise_yil between 1980 and extract(year from now())::int + 1
        then t.lise_yil
    end as onerilen_yil
  from temiz t
  left join ayni_numara an
    on an.gy = t.gy and an.no4 = lpad(t.okul_no_rakam, 4, '0')
)
select
  case when cardinality(celiskiler) > 0 then 'YÜKSEK' else 'düşük' end as oncelik,
  full_name                                   as ad,
  email                                       as eposta,
  gy                                          as kayitli_yil,
  onerilen_yil,
  okul_no,
  case when gy is not null and okul_no_rakam <> '' and length(okul_no_rakam) <= 4
       then gy || lpad(okul_no_rakam, 4, '0') end as hesaplanan_fonzip_no,
  fonzip                                      as fonzip_eslesme,
  fonzip_checked_at::date                     as kontrol_tarihi,
  case when fonzip = 'yok' and (fonzip_checked_at is null or fonzip_checked_at < '2026-09-08')
       then 'EVET' else 'hayır' end           as bayat_kontrol,
  fonzip_tags,
  membership_tier,
  coalesce(
    nullif(array_to_string(celiskiler, ' · '), ''),
    'Fonzip''te eşleşme yok — yıl dışarıdan doğrulanmalı'
  )                                           as sebepler
from isaretli
where cardinality(celiskiler) > 0
   or fonzip = 'yok'
order by cardinality(celiskiler) desc, ad;
