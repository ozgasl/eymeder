---
title: Push Notifications System
status: done
priority: medium
type: feature
tags: [notifications, realtime, alerts]
created_by: agent
created_at: 2026-04-11T19:04:44Z
position: 12
---

## Notes
Bildirim sistemi - kullanıcılar mesaj, etkinlik davetleri, iş başvuruları, mentorluk talepleri gibi aktiviteler için bildirim alır.

Requirements:
- Bildirim tablosu (type, message, read/unread)
- Gerçek zamanlı bildirimler (Supabase realtime)
- Bildirim zili (navigation'da badge ile sayı)
- Bildirim listesi dropdown
- Okundu işaretleme

## Checklist
- [x] Create notifications table with type, message, is_read
- [x] Create NotificationService with mark as read
- [x] Add notification bell to Navigation with badge count
- [x] Create notifications dropdown with list
- [x] Add realtime subscription for new notifications
- [x] Trigger notifications on key events (message, RSVP, job application)