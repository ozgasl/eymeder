-- Fonzip match pool sizes, split out of graduation-year-audit.sql because the
-- Supabase SQL editor only shows the LAST statement's result: running both in
-- one tab silently discarded the audit rows.
select
  count(*) filter (where fonzip_membership_status = 'yok')  as fonzip_eslesmeyen,
  count(*) filter (where fonzip_membership_status = 'var')  as fonzip_eslesen,
  count(*) filter (where fonzip_membership_status is null)  as hic_kontrol_edilmemis,
  count(*)                                                 as toplam_uye,
  -- 'yok' rows written before the email/phone fallback shipped (2026-09-08)
  -- only mean "the computed membership_no didn't match" and are worth re-checking.
  count(*) filter (
    where fonzip_membership_status = 'yok'
      and (fonzip_checked_at is null or fonzip_checked_at < '2026-09-08')
  )                                                        as bayat_yok_kaydi
from profiles;
