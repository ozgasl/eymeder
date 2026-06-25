---
title: Mentorship Matching System
status: done
priority: low
type: feature
tags: [mentorship, matching, career]
created_by: agent
created_at: 2026-04-11T18:14:44Z
position: 11
---

## Notes
Mentor-mentee eşleştirme sistemi - deneyimli mezunlar mentorluk verebilir, yeni mezunlar mentorluk talep edebilir.

Requirements:
- Profilde mentor durumu (is_mentor flag, bio, uzmanlık alanları)
- Mentorship talep sistemi (mentee → mentor)
- Talep onay/red mekanizması
- Aktif mentorlukları görüntüleme
- Mentor arama ve filtreleme

## Checklist
- [x] Add is_mentor, mentor_bio, mentorship_areas to profiles
- [x] Create mentorship_requests table
- [x] Create MentorshipService with request/accept/reject
- [x] Create /mentorship page with mentor list
- [x] Create request and acceptance flow
- [x] Add mentorship status to profiles