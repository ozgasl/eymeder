---
title: Real-time Messaging & Connections
status: done
priority: high
type: feature
tags: [messaging, realtime]
created_by: agent
created_at: 2026-04-10T21:57:12Z
position: 3
---

## Notes
Gerçek zamanlı mesajlaşma sistemi. Supabase Realtime kullanarak birebir sohbet. Bağlantı istekleri (LinkedIn-style).

## Checklist
- [x] messages tablosu: sender_id, receiver_id, content, created_at, read
- [x] connections tablosu: requester_id, receiver_id, status (pending/accepted)
- [x] MessagesPage.tsx: sohbet listesi + aktif sohbet görünümü
- [x] Realtime subscription setup: yeni mesajları canlı göster
- [x] Connection requests: gönder, kabul et, reddet
- [x] messageService.ts: send, fetch, markAsRead