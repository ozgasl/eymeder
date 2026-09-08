-- Members whose Fonzip state needs another look, and why. Three different
-- situations get conflated if you only read `fonzip_membership_status`:
--
--   * "Fonzip yanıt vermedi" — status is null but `fonzip_checked_at` is set.
--     The check ran and produced no answer: it threw, or it outran the 8s
--     timeout in the API route. Since checkMembership gained the email/phone
--     fallback on 2026-09-08 it makes up to three sequential Fonzip searches,
--     so that budget is much easier to blow than when it made one. These
--     members were never established either way — retry them.
--   * "hiç kontrol edilmemiş" — status and checked_at both null. Joined before
--     the check existed and has never been asked about.
--   * "bayat kontrol" — 'yok' written before 2026-09-08, i.e. before the
--     email/phone fallback, so it only ever meant "the computed membership_no
--     didn't match". A re-check now also tries email and phone.
--
-- Whatever is still 'yok' after re-checking these is the real pool: not found
-- by number, email or phone. Those can only be settled from Fonzip's side —
-- search it by name and read the member's own membership_no, whose first four
-- digits are the true graduation year.
select
  case
    when fonzip_membership_status is null and fonzip_checked_at is not null
      then 'Fonzip yanıt vermedi (kontrol tamamlanamadı)'
    when fonzip_membership_status is null
      then 'hiç kontrol edilmemiş'
    else 'bayat kontrol (yedek arama öncesi)'
  end                                                as neden,
  full_name                                          as ad,
  email                                              as eposta,
  graduation_year                                    as kayitli_yil,
  school_number                                      as okul_no,
  fonzip_checked_at::date                            as kontrol_tarihi,
  membership_tier
from profiles
where fonzip_membership_status is null
   or (fonzip_membership_status = 'yok'
       and (fonzip_checked_at is null or fonzip_checked_at < '2026-09-08'))
order by neden, ad;
