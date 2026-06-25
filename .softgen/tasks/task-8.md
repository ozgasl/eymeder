---
title: Job Board & Referral System
status: done
priority: high
type: feature
tags: [jobs, career, referrals]
created_by: agent
created_at: 2026-04-11T18:14:44Z
position: 8
---

## Notes
İş ilanları ve referans sistemi - üyeler iş ilanı paylaşabilir, başvuru yapabilir, referans verebilir.

Requirements:
- İş ilanı oluşturma (başlık, şirket, konum, açıklama, gereksinimler)
- İş listesi (filtreleme: şehir, sektör, deneyim seviyesi)
- Başvuru sistemi (CV yükleme veya profil gönderme)
- Referans sistemi (üyeler birbirini referans edebilir)
- İlan sahibi başvuruları görebilir

## Checklist
- [x] Create jobs table with company, location, requirements
- [x] Create job_applications table for tracking
- [x] Create JobService with post, apply, referral methods
- [x] Create /jobs page with job listings and filters
- [x] Create /jobs/create page for posting jobs
- [x] Create /jobs/[id] detail page with apply button
- [x] Add referral modal for recommending candidates