---
title: Groups & Forums
status: done
priority: medium
type: feature
tags: [groups, forums, discussions]
created_by: agent
created_at: 2026-04-11T18:14:44Z
position: 10
---

## Notes
Gruplar ve forumlar - şehir, sektör, ilgi alanı bazlı topluluklar.

Requirements:
- Grup oluşturma (isim, açıklama, kategori)
- Grup üyeliği (join/leave)
- Grup içi mesajlaşma/tartışma
- Grup etkinlikleri
- Admin moderasyonu

## Checklist
- [x] Create groups table with name, category, members
- [x] Create group_members and group_posts tables
- [x] Create GroupService with join, post methods
- [x] Create /groups page with group list
- [x] Create /groups/[id] page with discussions
- [x] Add group creation form
- [x] Enable group-specific posts and events