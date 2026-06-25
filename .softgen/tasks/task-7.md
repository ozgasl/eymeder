---
title: Event Management System
status: done
priority: high
type: feature
tags: [events, rsvp, calendar]
created_by: agent
created_at: 2026-04-11T18:14:44Z
position: 7
---

## Notes
Etkinlik yönetimi sistemi - kullanıcılar etkinlik oluşturabilir, katılım onayı verebilir (RSVP), takvim görünümü görebilir.

Requirements:
- Etkinlik oluşturma formu (başlık, açıklama, tarih, yer, kapasite)
- Etkinlik listesi (yaklaşan, geçmiş)
- Detay sayfası (açıklama, katılımcılar, RSVP butonu)
- RSVP sistemi (attending, maybe, not attending)
- Takvim görünümü (future enhancement)
- Admin moderasyonu

## Checklist
- [x] Create events table with RLS policies
- [x] Create event_attendees table for RSVP tracking
- [x] Create EventService with CRUD operations
- [x] Create /events page with event list and filters
- [x] Create /events/create page with form
- [x] Create /events/[id] detail page with RSVP
- [x] Update navigation to include Events link