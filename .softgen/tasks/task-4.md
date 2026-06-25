---
title: Gamification & Activity Points
status: done
priority: medium
type: feature
tags: [gamification, engagement]
created_by: agent
created_at: 2026-04-10T21:57:12Z
position: 4
---

## Notes
Kullanıcı engagement için puanlama ve rozet sistemi. Her aktivite (profil doldurma, mesaj, bağlantı) puan kazandırır. Belirli başarılar rozet verir.

## Checklist
- [x] activity_points tablosu: user_id, points, activity_type, created_at
- [x] badges tablosu: name, description, icon, criteria
- [x] user_badges tablosu: user_id, badge_id, earned_at
- [x] GamificationService: awardPoints, checkBadges, getBadges
- [x] Profilde puan ve rozet gösterimi
- [x] Rozetler: "İlk Bağlantı", "Profil Tamamlandı", "Aktif Üye"
- [x] gamificationService.ts: awardPoints, checkBadges
- [x] Default badges inserted to database