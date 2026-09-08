-- Members worth re-running the admin panel's Fonzip check on, before treating
-- anything as a data error.
--
-- Two groups, both cheap to clear and neither needing a data fix:
--   * 'yok' written before 2026-09-08 — that predates the email/phone fallback
--     (findFonzipMemberByContact), so it only ever meant "the computed
--     membership_no didn't match". Re-checking now also tries email and phone.
--   * never checked at all (fonzip_membership_status is null) — these joined
--     before the check existed and have never been asked about.
--
-- Whatever is still 'yok' after this is the real pool: not found by number,
-- email or phone. Those can only be settled from Fonzip's side — searching it
-- by name and reading the member's own membership_no, whose first four digits
-- are the true graduation year.
select
  case
    when fonzip_membership_status is null then 'hiç kontrol edilmemiş'
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
