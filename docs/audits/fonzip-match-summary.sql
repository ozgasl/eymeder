-- Fonzip match pool sizes, split out of graduation-year-audit.sql because the
-- Supabase SQL editor only shows the LAST statement's result: running both in
-- one tab silently discarded the audit rows.
select
  count(*) filter (where fonzip_membership_status = 'yok')  as fonzip_eslesmeyen,
  count(*) filter (where fonzip_membership_status = 'var')  as fonzip_eslesen,
  count(*)                                                 as toplam_uye,
  -- status null splits in two, and the difference matters: a set
  -- fonzip_checked_at means the check RAN and gave no answer (threw, or
  -- outran the route's 8s timeout), so nothing was established either way.
  count(*) filter (
    where fonzip_membership_status is null and fonzip_checked_at is not null
  )                                                        as yanit_alinamadi,
  count(*) filter (
    where fonzip_membership_status is null and fonzip_checked_at is null
  )                                                        as hic_kontrol_edilmemis,
  -- 'yok' rows written before the email/phone fallback shipped (2026-09-08)
  -- only mean "the computed membership_no didn't match" and are worth re-checking.
  count(*) filter (
    where fonzip_membership_status = 'yok'
      and (fonzip_checked_at is null or fonzip_checked_at < '2026-09-08')
  )                                                        as bayat_yok_kaydi
from profiles;
