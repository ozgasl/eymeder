---
title: News Feed & Community Interactions
status: done
priority: medium
type: feature
tags: [feed, posts, interactions]
created_by: agent
created_at: 2026-04-11T18:14:44Z
position: 9
---

## Notes
Haber akışı ve topluluk etkileşimleri - kullanıcılar gönderi paylaşabilir, beğenebilir, yorum yapabilir.

Requirements:
- Gönderi oluşturma (metin, görsel)
- Gönderi tipi (duyuru, güncelleme, soru, paylaşım)
- Beğeni ve yorum sistemi
- Admin duyuru yetkisi
- Ana sayfada feed görünümü

## Checklist
- [x] Create posts table with types
- [x] Create post_likes and post_comments tables
- [x] Update index.tsx with news feed
- [x] Add post creation form
- [x] Add like and comment interactions
- [x] Add admin announcement capability