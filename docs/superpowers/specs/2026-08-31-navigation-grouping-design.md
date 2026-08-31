# Navigasyon Barı Gruplama — Design Spec

Date: 2026-08-31
Status: Approved by user, ready for implementation planning

## Background

`Navigation.tsx` (579 satır) tek bir yatay masaüstü bar içinde 12+ ayrı öğe
render ediyor: Ana Sayfa, Hakkımızda (dropdown), Mezun Store, Üyeler
(dernek_uyesi'ne özel), İndirimli Markalar, Etkinlikler, EYB İK, Galeri,
Haberler, Başarı Hikayeleri, Gruplar, Mentorluk, Mesajlar (dernek_uyesi'ne
özel), Üyelik (dropdown), Admin (staff'a özel). Bu, geniş ekranlarda bile
sıkışık ve karmaşık görünüyor. Bu spec bu kapsamla sınırlı: **UI değişiklikleri**
oturumunda konuşulan dört alt-konudan (navigasyon, sayfa yeniden tasarımı,
genel tasarım sistemi, küçük düzeltmeler) sadece navigasyon/yerleşim ele
alınıyor; diğerleri ayrı, sonraki spec'lerde ele alınacak.

## Goal

12+ düz öğeyi mantıksal gruplara ayırarak masaüstü bar'ı sadeleştirmek, mobil
menüde de aynı gruplamayı accordion bölümleri olarak yansıtmak — sayfa
iskeletini (üst yatay bar yapısı) değiştirmeden.

## Approved Grouping

Masaüstünde sabit kalan öğeler (dropdown'a girmiyor):
- Ana Sayfa
- Etkinlikler
- Üyeler (yalnızca `membership_tier === "dernek_uyesi"` ise görünür)
- Admin (yalnızca `role === "admin" | "moderator"` ise görünür, en sağda, mevcut haliyle)

Dropdown grupları:

| Grup | İçerik | Not |
|---|---|---|
| Hakkımızda ▾ | Başkanın Mesajı, Yönetim Kurulu | Mevcut haliyle, değişmiyor |
| Topluluk ▾ | Gruplar, Mentorluk, Mesajlar | Mesajlar yalnızca dernek_uyesi'ne görünür |
| Kaynaklar ▾ | Haberler, Galeri, Başarı Hikayeleri, EYB İK | Yeni grup |
| Avantajlar ▾ | Mezun Store, İndirimli Markalar | Yeni grup |
| Üyelik ▾ | Neden Üye Olmalıyım, Üyelik Başvuru, Aidat Öde, Bağış Yap | Mevcut haliyle, değişmiyor |

## Component Architecture

`Navigation.tsx` şu an "Hakkımızda" ve "Üyelik" dropdown'larının JSX'ini elle
tekrarlıyor (`DropdownMenu` + map). 5 dropdown'a çıkınca bu tekrar 2.5 kat
artacağından hafif bir refactor yapılıyor:

- **`navGroups` veri yapısı** (Navigation.tsx içinde tanımlı, ayrı dosyaya
  çıkarmaya gerek yok): `{ key, label, items: [{ href, label, external?,
  requiresDernekUyesi? }] }[]`. Beş grubun tamamını (Hakkımızda, Topluluk,
  Kaynaklar, Avantajlar, Üyelik) kapsar. `items` her render'da
  `isDernekUyesi` state'ine göre filtrelenir (şu an sadece Mesajlar bu koşula
  sahip).
- **`NavDropdownGroup` bileşeni** (yeni, küçük, `Navigation.tsx` içinde
  local): `{ label, items }` alır, mevcut `DropdownMenu` pattern'ini üretir.
  5 yerde tekrar yerine 5 kez çağrılır.
- **Mobil**: projede zaten kurulu olan `src/components/ui/accordion.tsx`
  (Radix Accordion) kullanılarak aynı `navGroups` verisinden accordion
  bölümleri üretilir — her grup başlığı tıklanınca açılır/kapanır.
- Sabit kalan 3 link (Ana Sayfa, Etkinlikler, Üyeler) ve Admin linki, koşullu
  görünürlük/aktif-durum stil mantıkları (`aria-current`, `router.pathname`
  karşılaştırması) farklı olduğundan veri yapısına dahil edilmiyor, mevcut
  JSX halleriyle kalıyor.

## Data Flow

Auth/üyelik verisi çekme mantığı (`loadUser`, `loadAccess`,
`isDernekUyesi`/`isStaff` state'leri, Supabase sorguları) hiç değişmiyor —
yalnızca bu state'in nav öğelerini render ederken nasıl gruplandığı
değişiyor.

## Mobile Behavior

Mobil menüde (`mobileMenuOpen` açıkken) her `navGroups` grubu bir Accordion
bölümü olarak render edilir (başlığa tıklayınca açılır/kapanır). Sabit kalan
3 link ve Admin linki, mevcut haliyle düz liste olarak üstte/altta kalır.

## Non-Goals (this spec)

- Sayfa içerik/tasarım değişiklikleri (ayrı spec).
- Renk/tipografi/genel tasarım sistemi güncellemesi (ayrı spec).
- Üst yatay bar yerine farklı bir navigasyon paradigmasına (sidebar vb.)
  geçiş — kullanıcı bunu bu oturumda seçmedi.
- Hangi sayfaların `mezun_uye` için kısıtlanacağı — ayrı, önceden bilinen bir
  karar konusu (`memory/project_eymeder_member_onboarding.md`'de "undecided"
  olarak not düşülmüş), bu spec'i etkilemiyor çünkü menü görünürlüğü zaten
  şu an tier'a göre değil sadece `dernek_uyesi` özel-durumlarına göre.

## Testing Plan

- Yeni özel test dosyası yazılmıyor — `Navigation.tsx` için mevcut test yok,
  bu bir salt sunum-katmanı refactor'ü.
- `npm run lint` ve `npm run build` çalıştırılacak.
- Dev server üzerinden tarayıcıda manuel kontrol: masaüstü genişlikte 5
  dropdown'ın hepsi açılıp doğru öğeleri gösteriyor mu; mobilde her accordion
  bölümü açılıp kapanıyor mu; `isDernekUyesi=false` durumunda Üyeler linki ve
  Topluluk içindeki Mesajlar öğesi gizli mi; `isStaff=false` durumunda Admin
  linki gizli mi; Ana Sayfa/Etkinlikler linklerinin aktif-sayfa stili
  (`aria-current`) hâlâ çalışıyor mu.
