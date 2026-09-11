# EYMeder — Proje Hafızası

Bu dosya, oturumlar arasında tekrar keşfedilmemesi gereken kararları, mimariyi ve
(özellikle) pahalıya mal olmuş dersleri tutar. Yeni bir oturuma başlamadan önce
oku. Her oturum sonunda kendi bölümünü buraya ekle (üstte en yeni).

## Proje künyesi

- Repo: `ozgasl/eymeder` · Production: https://eyb-network.vercel.app
- Supabase projesi: **`hphimagmntysakwhwdss`** (kullanıcının kendi hesabında).
  SQL Editor'de her zaman bu proje referansını doğrula — geçmişte birden fazla
  proje karışıklığı ihtimali oldu (taşıma öyküsü aşağıda).
- Dernek: Eyüboğlu Eğitim Kurumları Mezunlar Derneği. İletişim: info@eymeder.com,
  +90 540 396 33 37, Esenevler Mah. Dr. Rüstem Eyüboğlu Sk. No:8, Ümraniye/İstanbul.
- Ana site (eymeder.com) bu ortamdan erişilemiyor (egress proxy engelliyor) —
  KVKK/marka metni tutarlılığı için oraya bakılamıyor, kullanıcıya sorulmalı.

## Mimari kararlar (kalıcı, değişmedikçe geçerli)

- **Üyelik tipi ekseni**: `profiles.membership_tier` — `dernek_uyesi` / `mezun_uye`.
  Fonzip üzerinden `graduation_year` + `school_number` → `membership_no` ile
  üye bulunuyor (`src/lib/fonzipMembershipNo.ts`), sonra Fonzip'teki **Tags**
  alanına bakılıyor (`src/lib/fonzipClient.ts`, `src/services/membershipProvider.ts`):
  `Dernek Üyesi` veya `Yönetim` etiketi varsa (diğer etiketler ne olursa olsun)
  `dernek_uyesi`; yoksa (etiket yok, ya da sadece `Mezun Üye`/`Bağışçı`/`Fahri Üye`
  varsa, ya da Fonzip'te üye hiç bulunamadıysa) `mezun_uye`. **Eskiden**
  `unpaid_debt_count` (aidat borcu) kullanılıyordu — bu, 2026-08-31'de gerçek
  API'de güvenilmez çıktığı için (bkz. aşağıdaki ders) tamamen terk edildi;
  artık borç kavramı üyelik tipini hiç etkilemiyor.
- **Yetki ekseni** (bağımsız): `roles.role` — `admin` / `moderator` / `member`.
  Admin paneli ve resmi içerik (haber/etkinlik oluşturma, galeri yükleme) buna
  bakar, üyelik tipine değil.
- Kısıtlama tablosu (hangi özellik hangi eksene bakıyor) için
  `docs/superpowers/specs/2026-08-29-member-onboarding-design.md` ve bu dosyanın
  altındaki "2026-08-30" oturum notuna bak.
- `useAccessControl` hook (`src/hooks/useAccessControl.ts`) ve `AccessRestricted`
  bileşeni (`src/components/AccessRestricted.tsx`) — yeni bir sayfa/özellik
  kısıtlanacaksa bunları kullan, tekrar yazma.
- Admin panelindeki üyelik tipi değiştirme / Fonzip yeniden kontrol, client'tan
  direkt Supabase çağrısı DEĞİL — `/api/admin/membership-tier` ve
  `/api/admin/recheck-fonzip` route'ları üzerinden, `src/lib/requireStaff.ts` ile
  sunucu tarafında doğrulanıyor. Yeni admin-only aksiyon eklerken bu deseni
  kullan (client-side `roles` kontrolü tek başına yeterli GÜVENLİK değil, sadece
  UX — bkz. aşağıdaki RLS dersi).
- **`graduation_year` tek kaynak (kullanıcı kararı, 2026-09-01)**: Kayıt
  sırasında girilen mezuniyet yılı `profiles.graduation_year`'a yazılıyor ve
  bundan sonra **değiştirilemez** — profil sayfasında salt okunur gösteriliyor
  (`src/pages/profile.tsx`). Fonzip `membership_no` hesaplaması
  (`graduation_year` + `school_number`, bkz. `fonzipMembershipNo.ts`) ve
  dizin/detay sayfalarındaki gösterim hep bu alanı kullanıyor.
  `profiles.high_school_graduation_year` kolonu DB'de hâlâ duruyor ama kod
  artık hiçbir yerde okumuyor/yazmıyor — iki ayrı "mezuniyet yılı" alanının
  senkron kalmaması yüzünden üye listesi/profil arasında tutarsızlık
  yaşanmıştı (bkz. aşağıdaki ders), o yüzden tek alana indirildi.
- **Kayıt/kod doğrulama ve şifre sıfırlama arası bekleyen veri `localStorage`'da**
  (`pendingSignup`, `pendingReset` — `src/pages/auth/signup.tsx`,
  `verify-code.tsx`, `forgot-password.tsx`, `reset-password.tsx`).
  `sessionStorage` DEĞİL, çünkü sekmeye özel: mobilde e-posta uygulamasına
  geçip tarayıcıya dönen kullanıcı (özellikle yeni sekme/pencere bağlamı
  oluşursa) verisini kaybediyordu.
- **Sosyal medya alanları DB'de tam URL, UI'da kullanıcı adı**:
  `profiles.linkedin_url/twitter_url/instagram_url/facebook_url` ve
  `brands.instagram_url/twitter_url` kolonları tam URL saklıyor (şema
  değişmedi), ama formlar sadece `@kullaniciadi` isteyip
  `src/lib/socialLinks.ts`'teki `buildSocialUrl`/`getSocialHandle` ile
  kaydetmeden önce/gösterirken dönüştürüyor. Yeni bir sosyal medya alanı
  eklerken bu yardımcı fonksiyonları kullan, aynı deseni tekrar yazma.
- **Fonzip üyelik eşleşmesi artık iki aşamalı** (`src/services/membershipProvider.ts`):
  önce `membership_no` (`graduation_year`+`school_number`) ile arama
  (`findFonzipMember`), bulamazsa e-posta (tam eşleşme) → telefon (son 10
  hane) ile yedek arama (`findFonzipMemberByContact`,
  `src/lib/fonzipClient.ts`). Birden fazla farklı Fonzip kullanıcısına denk
  gelen belirsiz sonuçlar asla "bulundu" sayılmıyor. Bkz. aşağıdaki ders —
  bu, sanıldığı gibi bir "eski numaralandırma şeması" sorunu değil, kendi
  DB'mizdeki hatalı `graduation_year`/`school_number` verilerine karşı bir
  güvenlik ağı olarak eklendi.
- **Fonzip OpenAPI spec'i artık repoda**: `docs/fonzip-api/fonzip-api-v2.yaml`
  (2026-09-01'de kullanıcı tarafından paylaşıldı). Yeni bir Fonzip endpoint'i
  kullanmadan önce burayı kontrol et — `/events`, `/tickets`,
  `/fundraising-*` gibi daha önce keşfedilmemiş endpoint'ler burada tam
  şema ile mevcut.
- **Gruplarda dış link**: `groups.external_link` (WhatsApp/Telegram grup
  linki gibi) — grup oluşturma formunda opsiyonel, doluysa grup detayında
  "Gruba Bağlan" butonu çıkıyor (`src/pages/groups/create.tsx`,
  `groups/[id].tsx`).
- **Yükleme kuralları tek yerde: `src/lib/fileUpload.ts` (2026-09-08)**
  (eski adı `imageUpload.ts`, video da kapsadığı için yeniden adlandırıldı).
  Üç yükleme yolu var, her biri kendi kovasına: marka logosu (`brand-logos`,
  2 MB, görsel), profil fotoğrafı (`avatars`, 5 MB, görsel), galeri
  (`media`, foto 10 MB / video 50 MB). Hepsi `UploadPreset` olarak tanımlı,
  `validateUpload(file, preset)` ile kontrol ediliyor.
  - **Sınırlar HEM kovada HEM kodda**: kova gerçek zorlayıcı (yüklemeler
    client'tan gidiyor, form atlanabilir), kod ise reddi Türkçe açıklıyor.
    `20260908190000` (brand-logos) ve `20260908200000` (avatars + media)
    migration'larındaki sayılar `fileUpload.ts` ile aynı olmalı — bunu
    doğrulayan bir test var (`preset limits match the bucket migration`).
  - **`media` kovası foto ve videoyu paylaşıyor**, kova tek limit tutabildiği
    için kovadaki değer büyük olan (50 MB); fotoğrafın 10 MB tavanı sadece
    uygulamada zorlanıyor.
  - **Supabase'in proje geneli yükleme limiti ayrı**: kovadaki 50 MB'tan
    düşükse geçerli olan o. Daha büyük video için dashboard'dan
    (Storage → Settings) yükseltilmeli.
  - **`profileService.uploadAvatar` ÖLÜ KOD**: profil sayfası sadece
    "Profil Fotoğrafı URL" metin alanı kullanıyor, fonksiyonu hiçbir yer
    çağırmıyor. Silinmedi, doğrulandı — biri gerçek bir seçici bağlarsa
    kontrolsüz başlamasın. Gerçek maruziyet `gallery.tsx` → `uploadMedia`'daydı.
  - **`wrongKindMessage` neden preset'te**: galeri foto/video seçicisi olduğu
    için "yanlış tür seçtin" mesajı orada anlamlı; marka logosunda video
    seçilince "Video'yu seçin" demek olmayan bir seçeneği işaret eder. Bu
    mesaj yalnızca ikili presetlerde tanımlı.
- **Marka logosu dosya yükleme (2026-09-08)**: `brands.logo_url` ŞEMA OLARAK
  DEĞİŞMEDİ — hem yüklenen dosyanın public URL'i hem elle yapıştırılan dış
  adres aynı kolonda. Yükleme `brand-logos` kovasına
  (`20260908190000_brand_logos_bucket.sql`), client'tan (marka yazma işlemleri
  de RLS üzerinden client'tan; ayrıca API route'un 4.5 MB gövde limitine
  takılmaz).
  - **Sınırlar KOVADA zorlanıyor** (`allowed_mime_types`, `file_size_limit`
    2 MB), sadece UI'da değil: yükleme client'tan gittiği için staff biri
    doğrudan storage'a çağrı atıp formu atlayabilir. `src/lib/imageUpload.ts`
    aynı listeyi tutar ama işi sadece hatayı Türkçe anlatmak.
  - **SVG bilinçli olarak DIŞARIDA**: public kovadaki SVG `<img>` içinde
    zararsız ama dosya URL'i doğrudan açıldığında script çalıştırır.
    HEIC/HEIF de dışarıda: tarayıcılar `<img>`'de gösteremiyor, yüklenir ama
    kırık görünür. İkisi de kullanıcıya ayrı, açıklayıcı mesaj veriyor.
  - **Uzantı MIME'dan türetiliyor, `file.name`'den DEĞİL**
    (`buildLogoObjectPath`) — tarayıcının bildirdiği ad saldırgan kontrolünde.
  - **Eski dosya silme sırası kritik**: `deleteLogo` yalnızca satır artık o
    URL'e işaret etmedikten SONRA çağrılıyor (`handleUpdateBrand` başarılı
    update'ten sonra, `handleDeleteBrand` satır silindikten sonra). Bileşen
    içinde "değiştir/kaldır" anında silmek, iptal edilen bir düzenlemede
    markayı kırık görsele düşürürdü. `logoObjectPathFromUrl` dış URL'lerde
    null döner — marka kendi sitesindeki logoyu barındırıyorsa asla silinmez.
  - **Bilinen sınır**: yükleyip formu kaydetmeden vazgeçilirse dosya kovada
    yetim kalır (kırık referans değil, sadece atık). Ara depolama alanı
    olmadan kaçınılmaz.
  - **`avatars` ve `media` kovalarında HİÇ doğrulama yok** (dashboard'dan elle
    açılmışlar, `20260414171443`'te insert yorum satırı) —
    `galleryService.uploadMedia` ve `profileService.uploadAvatar` ne tür ne
    boyut kontrol ediyor. Bu ayrı ve gerçek bir açık, bu işin kapsamı dışında
    bırakıldı; `imageUpload.ts` oraya da uygulanabilir.
- **Marka indirim kodları (2026-09-08)**: Kodlar `brands` tablosunda DEĞİL,
  kendi tablolarında: `brand_discount_codes` (marka başına N kod/kampanya;
  `code` platform genelinde `lower(code)` üzerinde UNIQUE, `label`,
  koda özel `discount_info`, `source` = `brand`/`generated`, `is_single_use`,
  `valid_from`/`valid_until`, `max_redemptions`, `is_active`) ve
  `brand_code_usages` (kampanya × üye başına TEK satır = üyenin o kampanyadaki
  DURUMU: `member_code`, `first_viewed_at`, `issued_at`, `expires_at`, ve EN SON
  kullanımı gösteren `redeemed_at`/`redeemed_by`/`redeem_note`) ve
  `brand_code_redemptions` (kullanım başına BİR satır = append-only defter:
  `usage_id`, `code_used` snapshot'ı, `redeemed_at`, `redeemed_by`, `note`).
  Migration'lar: `20260908160000_brand_discount_codes.sql` +
  `20260908170000_brand_code_redemptions.sql` (ikincisi mevcut
  `brand_code_usages.redeemed_at` kayıtlarını deftere backfill ediyor —
  idempotent).
  - Kod üretimi `src/lib/discountCode.ts` (saf, testli): `%10` → `EYB10`,
    oran yoksa marka adından `EYBSISL`, çakışırsa `EYB10TK` → `EYB10-2`.
    Üyeye özel tek kullanımlık kod `EYB10-7F3K2A` (I/O/0/1 içermeyen alfabe).
  - **`brands`'in aksine RLS gerçek**: `members_read_brand_codes` sadece
    `dernek_uyesi` + staff'a SELECT veriyor, yani kod UI'da değil VERİTABANINDA
    kısıtlı. Yardımcılar: `public.is_staff()`, `public.is_dernek_uyesi()`
    (ikisi de SECURITY DEFINER — bkz. 42P17 recursion dersi).
  - **`brand_code_usages`'a üye INSERT/UPDATE politikası YOK, bilinçli**: tüm
    yazma işlemleri service-role API route'larından geçiyor
    (`/api/brand-codes/view`, `/api/brand-codes/issue`,
    `/api/admin/brand-codes/redeem`), böylece üye kendi sayacını şişiremiyor.
    Yeni bir sayaç/kod aksiyonu eklerken bu deseni koru.
  - **Sayaç mantığı (kullanıcıya açıklandı ve onaylandı)**: İndirim markanın
    kasasında verildiği için "kullanıldı" bilgisi otomatik ölçülemez. Metrikler
    ve isimleri kasıtlı: `Görüntüleyen` = kodu açan üye sayısı (otomatik, sadece
    ilgi göstergesi), `Kod alan` = tek kullanımlık kod üretmiş üye sayısı,
    `Kullanım` = staff'ın `/api/admin/brand-codes/redeem` üzerinden onayladığı
    gerçek kullanım SAYISI (+ parantezde kaç ayrı üye). Sayaçlar sayaç
    kolonundan değil iki defterden hesaplanıyor (`brandCodeService.getStats`).
    `max_redemptions` SADECE toplam kullanım sayısını kapatıyor; kod dağıtımı
    kontenjanı doldurmuyor.
  - **Tekrarlı kullanım sayılıyor (2026-09-08, ikinci tur)**: Paylaşılan bir kodu
    aynı üye tekrar tekrar kullanabilir ve her kullanım `brand_code_redemptions`'da
    ayrı satır. Tek kullanımlık kişisel kod ise hâlâ bir kez harcanıyor
    (`brand_code_usages.redeemed_at` "bu kişisel kod tükendi" işareti olarak
    duruyor). Yanlışlıkla iki kez kaydı engellemek için 2 dakikalık yineleme
    penceresi var (`isDuplicateRedemption`, `DUPLICATE_REDEMPTION_WINDOW_MS`) —
    gerçek ikinci ziyaret engellenmiyor, sadece aynı satışın çift girişi.
    **Bir kullanımı `brand_code_usages`'a yazarak sayma refleksine dönme**: o
    tablo kampanya × üye başına tekil, sayım defteri o değil.
  - **`brands.discount_code` kolonu DB'de var ama ÖLÜ (kullanıcı kararı: bırak)**:
    ilk planda tek kolon öngörülmüştü, kullanıcı o ALTER'ı elle çalıştırdı; sonra
    "marka başına birden fazla kod" talebiyle tasarım `brand_discount_codes`
    tablosuna taşındı. Hiçbir migration onu oluşturmuyor, hiçbir kod satırı
    okumuyor/yazmıyor, `database.types.ts`'te de yok. Şaşırma, kullanma —
    `fonzip_debt_status` ile aynı statüde (bilinçli olarak DROP edilmedi).
  - Üye QR kod sistemi (`user_qr_codes`, `generate_user_qr_code()` trigger'ı)
    **hiç değiştirilmedi** — kullanıcının açık talebi; kimlik doğrulama
    kimliği olarak kalıyor (paylaşılan kod kullanımında üyeyi tanımlamak için
    de bu QR giriliyor) ve ileride etkinliklerde kullanılabilir.
- **Markalarda sosyal medya + bağlantılı üye**: `brands.instagram_url`,
  `brands.twitter_url`, `brands.connected_member_id` (→ `profiles.id`).
  Admin panelinde (`src/pages/admin.tsx`, "Markalar" sekmesi) kayıtlı
  üyelerden dropdown ile seçiliyor, `brandService.ts`'teki sorgular
  `connected_member:profiles!brands_connected_member_id_fkey(...)` join'i
  ile ismini getiriyor.

## 🔥 Ders: Kolon seviyesi REVOKE, tablo seviyesi GRANT varken HİÇBİR ŞEY yapmaz (2026-09-11)

`20260830110000_lock_membership_tier_column.sql` şunu yazıyordu:
`REVOKE UPDATE (membership_tier) ON profiles FROM authenticated;` — ve bu
dosyada "kapatıldı" diye kayıtlıydı. **Hiçbir zaman etkisi olmadı.** Postgres
yetkileri TOPLAMSALDIR: kolon seviyesi bir REVOKE, tablo seviyesi bir GRANT'i
geri alamaz. Supabase `authenticated`'a public tablolarda tablo seviyesi UPDATE
verdiği için `has_column_privilege('authenticated','profiles','membership_tier',
'UPDATE')` hep `true` kaldı — yani **herhangi bir üye kendini `dernek_uyesi`
yapabiliyordu** (dizin, indirim kodları, iş ilanı, grup, mesajlaşma).

**Nasıl bulundu**: yerel Postgres'te Supabase'in rollerini (`anon`,
`authenticated`, `service_role`) ve varsayılan `GRANT ALL`'unu kurup `SET ROLE`
ile test ederek. Supabase SQL Editor superuser çalıştığı için bunu ASLA
göstermez — bu, RLS recursion dersinin tekrarı: **yetki/politika değişikliğini
gerçek rolle test et.**

**Doğru düzeltme iki yoldan biri**:
1. `REVOKE UPDATE ON profiles FROM authenticated` + izinli kolonlara tek tek
   `GRANT UPDATE (...)` — Postgres zorlar ama liste her yeni profil alanında
   güncellenmeli, unutulursa profil formu kırılır.
2. `BEFORE UPDATE` trigger'ı korunacak kolonları OLD değerine geri yazar
   (seçilen yol: liste kısa ve sabit, yeni düzenlenebilir alan eklenince
   kendiliğinden çalışır).

**Trigger'da SECURITY DEFINER KULLANMA**: o modda `current_user` fonksiyon
SAHİBİNİ döndürür, çağıran rolü değil — `current_user IN ('authenticated',
'anon')` kontrolü hiç eşleşmez ve trigger sessizce hiçbir şey korumaz. Bu da
testte yakalandı (ilk sürüm tam olarak böyle yazılmıştı).

## ⚠️ Bilinen açık: `profiles` okuma hâlâ kolon bazlı kısıtlı DEĞİL

**Aşama 1 tamamlandı** (`20260911100000_profiles_rls.sql`): RLS açık,
`authenticated` tüm satırları OKUR, herkes yalnızca KENDİ satırını günceller,
kimse silemez, `anon` hiçbir profili okuyamaz. Sistem alanları
(`membership_tier`, `fonzip_*`, `graduation_year`, `school_number`) trigger ile
korunur. Herkese açık `/brands` sayfasındaki "Bağlantılı mezun" adı
`brand_connected_members` view'i ile yaşıyor (yalnızca markaya bağlanmış
üyelerin id+ad'ı, `security_invoker = false`, anon'a GRANT'li) —
`brandService` bunu embed ile değil AYRI SORGU ile okuyup birleştiriyor, çünkü
PostgREST'in bir view'i FK üzerinden embed edip edemediği doğrulanamadı ve
herkese açık sayfayı ona bağlamak istemedik.

**Aşama 2 kuralı NETLEŞTİ (kullanıcı, 2026-09-11)**: `Dernek Üyesi` etiketi
olan **her şeyi**; olmayan (Mezun/Bağışçı/Fahri) başka bir üyenin yalnızca
**Ad Soyad (`full_name`), Okul (`university`), Mezuniyet yılı
(`graduation_year`)** bilgisini görür. Kendi satırını herkes tam görür, staff
de her şeyi görür. Arayüz etiketleri kolon eşlemesini kesinleştirdi:
`graduation_year` = "Lise Mezuniyet", `department` = "Lise Bölümü",
`university` = "Üniversite".
- **`avatar_url` maskelenenler arasında** (kullanıcının listesinde yok). Sonucu:
  dernek üyesi olmayan, haber/galeri/grup sayfalarında yazar fotoğrafı yerine
  baş harf görür (`AvatarFallback` zaten var, kırılmıyor). Tek satırlık karar,
  geri alınabilir.
- Uygulama: `public.member_profiles` view'i (`20260911110000`), kural tek
  yerde `public.member_sees_full_profile(profile_id)` fonksiyonunda.
  **Maskelenen kolon filtre olarak da kullanılamıyor** (yerel testte
  `where email = '...'` 0 satır) — yoksa maskeleme bir "oracle" bırakırdı.
- **Sıra bilinçli**: önce yalnızca `galleryService` view'e geçirildi (canary),
  `profiles` politikaları hiç değişmedi. Sebep: PostgREST'in bir view'i taban
  tablonun FK'si üzerinden embed edip edemediği canlı API olmadan
  doğrulanamıyor. Galeri preview'da çalışırsa kalan 11 servis + `profiles`
  SELECT daraltması ikinci PR'da.

**Kalan (Aşama 2, ikinci adım)**: giriş yapmış her üye hâlâ herkesin e-posta/telefonunu
okuyabiliyor. Kullanıcı kararı: **`Dernek Üyesi` etiketi olanlar her şeyi,
olmayanlar (Mezun/Bağışçı) yalnızca mezuniyet yılını** görsün. ⚠️ Bu kararın
harfi harfine uygulanması haber/galeri/iş ilanı/grup/etkinlik embed'lerindeki
**yazar adlarını da siler** — bu sayfalar `full_name`/`avatar_url` gösteriyor.
Aşama 2'ye başlamadan bu çelişki kullanıcıyla netleştirilmeli.
RLS satır bazlı olduğu için çözüm view/RPC gerektirir; 12 servisin embed'i
yeniden yazılacak ve PostgREST'in view embed'i **önce tek bir servisle
sınanmalı**.

## 🔥 Ders: Supabase RLS'te self-referencing policy → infinite recursion (42P17)

**Ne oldu**: `roles` tablosundaki `"Admins can manage roles"` politikası kendi
`USING` ifadesi içinde `roles` tablosunu sorguluyordu
(`EXISTS (SELECT 1 FROM roles WHERE user_id = auth.uid() AND role = 'admin')`).
Bu, `roles`'a dokunan HER sorguda (doğrudan ya da başka bir tablonun
"admin yönetir" politikası üzerinden — brands, products, orders, vb. hepsi
`roles`'u aynı şekilde sorguluyor) RLS'in kendi kendini yeniden tetiklemesine
ve Postgres'in `42P17: infinite recursion detected in policy for relation
"roles"` hatasıyla sorguyu iptal etmesine yol açtı.

**Neden bulmak bu kadar uzun sürdü**: `admin.tsx`'teki `checkAdminAccess()`
sadece `{ data: role }`'ü destructure ediyordu, `error`'u hiç kontrol
etmiyordu — yani gerçek bir Postgres hatası, "rol satırı bulunamadı" ile
AYNI ŞEKİLDE ele alınıp kullanıcıya hep "Erişim Reddedildi" gösteriliyordu.
Ayrıca Supabase SQL Editor'de yapılan TÜM doğrulama sorguları `postgres`
superuser olarak çalışır ve **RLS'i tamamen bypass eder** — yani veri doğru,
politika metni doğru görünüyordu (`pg_policies` ile bakıldığında), çünkü
superuser hiçbir zaman recursion'a girmiyordu. Gerçek recursion sadece
`authenticated` rolüyle, PostgREST üzerinden (yani tarayıcıdan) tetikleniyordu.

**Çıkarılan dersler / yeni bir role/permission tablosu tasarlarken**:
1. Bir RLS politikası, korumakta olduğu tablonun KENDİSİNİ sorguluyorsa
   (`"admin can manage X" ON X USING (EXISTS (SELECT ... FROM X ...))`),
   bunu asla ham `EXISTS` ile yazma — bir `SECURITY DEFINER` fonksiyona
   sar (`SET search_path = public`, `STABLE`), politika o fonksiyonu
   çağırsın. Bkz. `supabase/migrations/20260831120000_fix_roles_rls_recursion.sql`
   (`public.is_admin(uuid)` fonksiyonu, örnek olarak kullan).
2. Client'ta bir Supabase sorgusundan `error`'u ASLA görmezden gelme —
   özellikle "yetkisiz/bulunamadı" gibi bir varsayılan davranışa düşen
   kodlarda. `error.code === "PGRST116"` (0 satır) ile gerçek bir hatayı
   ayırt et, gerçek hatayı `console.error` + ayrı bir toast ile göster.
3. Supabase SQL Editor'deki bir sorgunun "doğru" görünmesi, aynı sorgunun
   `authenticated`/`anon` rolüyle (yani gerçek uygulamadan) de doğru
   çalışacağı anlamına GELMEZ — RLS'i superuser bypass eder. Şüpheli bir RLS
   durumunda tarayıcının Network sekmesinden gerçek isteği/yanıtı kontrol et.
4. Sistem üzerinde ne kadar zaman harcarsan harca (yaklaşık 1,5 saatlik bir
   teşhis süreci oldu), veri/politika/deploy'un "doğru göründüğü" ama yine de
   çalışmadığı bir durumda önce `pg_policies` + `relrowsecurity` kontrolüne,
   olmadıysa doğrudan tarayıcı Network sekmesine bak — SQL Editor'den daha
   fazla dolaylı kontrol yapmak zaman kaybettirir.

## 🔥 Ders: Fonzip `/users` arama endpoint'i — gerçek response şekli

**PR #8** (`findFonzipMember`, `src/lib/fonzipClient.ts`) merge olduktan sonra migration
(`20260831150000_fonzip_status_columns.sql`) production'a hemen uygulanmamıştı — admin
panelinde "Yeniden Kontrol Et" `Could not find the 'fonzip_checked_at' column` hatası
veriyordu. Migration pooler üzerinden uygulandı (`NOTIFY pgrst, 'reload schema';` ile).

Migration'ı uygularken PR #8'in `findFonzipMember` kodunda, gerçek Fonzip API'sine
canlı istek atarak (kredentials `.env.local`'den, pooler'daki `fonzip_token_cache`'teki
geçerli token kullanılarak — yeni token istemek "Token already created" 409'u veriyor,
çünkü Fonzip client_credentials başına tek aktif token'a izin veriyor) **iki gerçek bug**
bulundu ve düzeltildi:

1. **Response zarfı `data.rows` değil `data.user_list`.** Kod `data.rows?.[0]` okuyordu;
   gerçek anahtar hep `user_list` olduğu için `row` HER ZAMAN `undefined` oluyordu —
   yani `membershipFound` gerçek Fonzip durumundan bağımsız olarak HER ZAMAN `false`
   dönüyordu (canlıya çıkmış ama hiç doğru sonuç üretmemiş bir kod).
2. **`unpaid_debt_count`, `values_list` içinde SEÇİLEMEZ** — bir filtre koşulu (`filter.attributes`)
   olarak geçerli (`condition: "eq"`, `value: 0` ile eşleşiyor, canlıda 339 sonuçla
   doğrulandı), ama `values_list: ["id", "unpaid_debt_count"]` şeklinde çıktı kolonu
   olarak istenince API `400 { "error": "Geçersiz değerler" }` döndürüyor. Yani debt
   sayısını tek sorguda "oku" diye bir yol yok — sadece "debt=0 filtresiyle eşleşiyor mu"
   diye sorulabiliyor.

**Düzeltme**: `findFonzipMember` artık iki ayrı arama yapıyor — (1) sadece `membership_no`
filtresiyle `membershipFound` (total>0 mı), (2) bulunduysa `membership_no AND
unpaid_debt_count=0` filtresiyle `hasDebt` (bu ikinci sorgu 0 sonuç dönerse borç VAR
demektir). `row`/`Array.isArray` mantığı tamamen kaldırıldı, artık sadece `total`
sayısına bakılıyor.

**Doğrulama**: Bu, admin `ozgasl@gmail.com`'un kendi Fonzip kaydında test edildi
(membership_no `19920089`, hesaplama: `graduation_year` + `school_number` zero-padded —
bkz. `fonzipMembershipNo.ts`). Sonuç: membershipFound=true, hasDebt=true (yani bu hesapta
şu an Fonzip'te ödenmemiş aidat var) — bu **gerçek bir production hesabının
`membership_tier`'ını değiştirebilecek bir bulgu** olduğu için, recheck endpoint'i bu
hesap üzerinde GERÇEKTEN tetiklenmedi (sadece read-only arama sorgularıyla test edildi),
kullanıcıya bildirilip onayı bekleniyor.

**Güncelleme (2026-09-01)**: Fonzip'in OpenAPI spec'i artık mevcut —
`docs/fonzip-api/fonzip-api-v2.yaml`. Yeni entegrasyonlarda (örn. `/events`,
`/tickets`) önce bu dosyaya bakılabilir; aşağıdaki dersler spec olmadan
keşfedilen kısımlar için hâlâ geçerli.

**Genel ders**: Fonzip'in OpenAPI spec'i (`documentation-json.json`) bu ortamda yok —
"hangi alan filter'da mı yoksa values_list'te mi geçerli" sorusunu spec'ten değil,
canlıda küçük, yan etkisiz (read-only arama) deneylerle cevapla. Yazma işlemi
(profiles güncellemesi) gerektiren gerçek recheck'i, kullanıcının onayı ya da bilgisi
olan bir hesapla test et, rastgele/kendi admin hesabınla değil — sonuç üyenin
`membership_tier`'ını gerçekten değiştirir.

## 🔥 Ders: Fonzip `tags` alanı — nasıl okunur, `unpaid_debt_count` neden terk edildi

`unpaid_debt_count` düzeltildikten sonra bile (yukarıdaki ders) kullanıcı canlı admin
panelinde "Yeniden Kontrol Et"i denedi ve borç/üyelik sütunları hâlâ boş geldi (merge
edilmemiş branch'te test edildiği için — ayrı bir konu), ama bu arada kullanıcı asıl
kaynağı (Fonzip'in tuttuğu gerçek üyelik durumu) **Tags** alanına taşımaya karar verdi.
`unpaid_debt_count` zaten güvenilmezdi: `eq 0`, `eq -1`, `lt 0`, `lte 0` API'de TAMAMEN
AYNI 339 kullanıcı setini döndürüyordu (value parametresi filtre motorunda görmezden
geliniyor, sadece "> 0 mı değil mi" ikili ayrımı var) ve bir kullanıcıyla başka bir
attribute'u (`id`, `membership_no`) AND ile birleştirmek her zaman 0 sonuç veriyordu
(Fonzip'in kendi API bug'ı).

**Yeni tasarım — `tags` alanı**: `GET /tags` (parametresiz) bu derneğin sabit 5 etiketini
id'leriyle döndürüyor: `Dernek Üyesi`=1297198, `Mezun Üye`=1297199, `Bağışçı`=1297221,
`Fahri Üye`=1297222, `Yönetim`=1297468 (bu id'ler `src/lib/fonzipClient.ts`'te
hardcoded — Fonzip'in OpenAPI spec'i bu ortamda yok, canlı `GET /tags` ile keşfedildi).
`/users` aramasında `values_list: ["id","tags"]` istenince **LEFT JOIN gibi davranıyor**:
bir üyenin N etiketi varsa N satır (her biri aynı `id`, farklı `tags` sayısal id'siyle),
hiç etiketi yoksa TEK satır `tags: null`, `membership_no` hiç eşleşmiyorsa SIFIR satır.
Bu, `unpaid_debt_count`'un aksine güvenilir ve tek sorguda tüm bilgiyi veriyor.

**Kullanıcının verdiği gerçek üye export'unda (497 kişi) görülen**: 312 kişide (%63) HİÇ
etiket yok; 134 kişide tam olarak `Dernek Üyesi,Mezun Üye`; 14 kişide
`Dernek Üyesi,Mezun Üye,Yönetim` — yani birçok üye BİRDEN FAZLA etiketi aynı anda
taşıyor. **Öncelik kuralı (kullanıcı onayladı)**: `Dernek Üyesi` veya `Yönetim`
etiketi varsa diğerleri ne olursa olsun `dernek_uyesi`; yoksa (etiket yok dahil)
`mezun_uye`. Export'taki "Donor" tag adı sadece İngilizce görüntüleme farkıydı —
gerçek/Türkçe adı `Bağışçı` (API `GET /tags`'te böyle döndü, kullanıcının mapping'iyle
birebir eşleşti).

**profiles şeması**: `fonzip_debt_status` kolonu artık hiç yazılmıyor/okunmuyor ama
DROP edilmedi (ayrı, bilinçli bir temizlik gerektirir — bkz. "Prod Hotfix Workflow"),
yerine `fonzip_tags TEXT` eklendi (`20260831200000_fonzip_tags_column.sql`) — ham
etiket adlarını virgülle ayırıp tutuyor (örn. "Dernek Üyesi, Yönetim"), admin
panelinde "Fonzip Etiketleri" sütununda gösteriliyor (eskiden "Aidat Borcu" idi).

## 🔥 Ders: "Fonzip'te numara farklı" varsayımı yanlış çıktı — önce kendi DB'ne bak (Sinasi Yılmaz vakası, 2026-09-08)

**Bildirilen belirti**: Bir üye (Sinasi Yılmaz) Fonzip'te "Dernek Üyesi" ve
"Yönetim" etiketleriyle, borcu olmadan görünüyordu ama uygulamada
"Mezun Üye" olarak görünüyordu.

**İlk (yanlış) teşhis**: Kullanıcının verdiği iki numaradan (5288380 ve
19960758) ikincisinin `buildFonzipMembershipNo(1996, "0758")` ile birebir
eşleşmesi, "Fonzip'te bu üyenin numarası bizim hesapladığımızdan farklı,
eski bir numaralandırma şemasından kalma" sonucuna vardırdı — mantıklı
görünen ama YANLIŞ bir çıkarımdı.

**Gerçek kök neden**: Kullanıcı Fonzip ekran görüntüsünü paylaşınca, Fonzip'in
kendi "Üye No" alanının tam olarak **19960758** olduğu görüldü — yani
hesaplanan numara zaten doğruydu! "5288380" membership_no değil, ayrı bir
alandı (kurum kayıt no/tckno benzeri). Sorgu (`select graduation_year,
school_number from profiles where email=...`) gerçek kök nedeni ortaya
çıkardı: bizim DB'mizde `graduation_year=2016` kayıtlıydı (olması gereken:
1996) — yani uygulama `20160758`'i arıyordu, Fonzip'teki gerçek `19960758`
ile hiç eşleşmiyordu. **Bu, oturumun başındaki Aysın Gün vakasıyla birebir
aynı sınıf hata**: Fonzip'in numaralandırmasıyla ilgisi yok, sadece kayıt
sırasında yanlış mezuniyet yılı girilmiş/kaydedilmiş.

**Çıkarılan dersler**:
1. Hesaplanan bir değer (membership_no gibi) dış sistemde "bulunamadı"
   döndüğünde, önce "dış sistemin şeması/numaralandırması farklı olabilir"
   diye karmaşık bir teoriye atlama — önce KENDİ verini sorgula
   (`graduation_year`/`school_number` gibi girdileri). Basit veri hatası,
   sistemsel şema uyuşmazlığından çok daha olası.
2. Kullanıcının paylaştığı ekran görüntüsündeki hangi sayının hangi alana
   ait olduğunu (etiket/ikon farkı) doğrulamadan sayısal bir örtüşmeye
   ("bu iki sayı formülle eşleşiyor") güvenip teşhis kurma — yanlış
   etiketlenmiş bir alan kolayca yanlış sonuca götürür.
3. Yine de bu oturumda eklenen e-posta/telefon yedek araması
   (`findFonzipMemberByContact`) boşa gitmedi: kök neden ne olursa olsun
   (gerçek numaralandırma farkı ya da bizim yanlış verimiz), üyeyi e-posta
   üzerinden bulup doğru etiketlere ulaşabiliyor — kalıcı bir güvenlik ağı
   olarak tutulmalı.
4. Düzeltme sadece veri düzeltmesiydi (`update profiles set graduation_year
   = 1996 where email = 'snsylm@gmail.com'`) + admin panelinden
   "Fonzip'i Yeniden Kontrol Et". `fonzip_membership_status = 'yok'` olan
   üyeler arasında başka benzer yanlış-veri vakaları olabilir, taranmadı.

## 🔥 Ders: Cevapsız Fonzip kontrolü "üye değil" sayılıyordu — sessiz düşürme (2026-09-08)

**Nasıl bulundu**: `graduation_year` taramasında 4 üyenin
`fonzip_membership_status = null` AMA `fonzip_checked_at` **dolu** olduğu
görüldü. Sorgumda bunlara "hiç kontrol edilmemiş" demişim — yanlış etiket.
`fonzip_checked_at` dolu olduğu için kontrol ÇALIŞMIŞ, sadece cevap
üretmemiş.

**Üç durumu asla karıştırma** (`profiles`):
| status | checked_at | anlamı |
|---|---|---|
| `var`/`yok` | dolu | Fonzip cevap verdi |
| `null` | **dolu** | kontrol çalıştı, **cevap alınamadı** (exception ya da timeout) |
| `null` | null | hiç sorulmamış |

**Gerçek bug**: `membershipFound === null` (cevapsız), `isMember: false`'a
düşüyor ve `recheck-fonzip` bunu `membership_tier = 'mezun_uye'` olarak
YAZIYORDU — yani yavaş bir Fonzip çağrısı gerçek bir dernek üyesini sessizce
mezun üyeye düşürüyor, üstelik `formatFonzipTags([])` ile kayıtlı etiketlerini
de siliyordu. Düzeltme: cevapsızsa **hiçbir şey yazılmıyor**, route 503 +
"Fonzip'ten yanıt alınamadı, üyenin kaydı değiştirilmedi" dönüyor.
`verify-code`'da (kayıt) ise cevapsızsa `fonzip_checked_at` YAZILMIYOR — kayıt
akışı asla bloke edilmiyor (tasarım kararı) ama profil dürüstçe
"kontrol edilmemiş" görünüyor.

**Neden bugün ortaya çıktı (şüphe)**: `checkMembership` artık numara → e-posta
→ telefon diye **üç ardışık** Fonzip araması yapıyor (e-posta/telefon yedeği
bugün girdi, PR #16), route'ların bütçesi ise hâlâ `withTimeout(..., 8000)`.
Eskiden tek arama vardı. **Nedene dokunulmadı** — aramaları paralelleştirmek
akla geliyor ama `getAccessToken()` boş önbellekte yeni token istiyor ve Fonzip
client başına tek aktif token'a izin veriyor ("Token already created" 409), yani
naif paralelleştirme token çakışması üretir. Yapılacaksa: önce token'ı bir kez
ısıt, sonra üç aramayı paralel çalıştır.

## 🔥 Ders: Yanlış `graduation_year` taraması — hangi hatayı kendi verimizle bulabiliriz, hangisini bulamayız (2026-09-08)

`docs/audits/graduation-year-audit.sql` bu taramayı yapıyor (yerel Postgres'te,
iki bilinen vakayı da içeren fixture'la test edildi). Ayrım kritik:

- **Kendi verimizle KANITLANABİLENLER** (sorgu bunlara "YÜKSEK" diyor): satır
  kendi kendiyle çelişiyor. `high_school_graduation_year` (kod artık okumuyor
  ama veri duruyor — bu yüzden DROP etmek zararlı olurdu, ikinci görüş kaynağı)
  `graduation_year`'dan farklı; `graduation_year` >= `university_graduation_year`;
  yıl aralık dışı; `school_number` `buildFonzipMembershipNo`'nun kullanamayacağı
  halde (rakamsız ya da 4 haneden uzun → o üye yıl ne olursa olsun ASLA
  eşleşemez); iki üyenin aynı membership_no'ya düşmesi ("88" ile "0088"
  zero-pad sonrası çakışıyor).
- **KANITLANAMAYANLAR** ("düşük"): tek bulgusu `fonzip_membership_status='yok'`
  olanlar. Yanlış yıl da bunu üretir, Fonzip'e hiç kayıtlı olmamak da; verimizde
  ikisini ayıran hiçbir şey yok. Ancak dışarıdan (Fonzip'e aday yıllarla
  `/users` sorgusu) çözülür.

**Kendi heuristiğimde bulunan hata (yerel test sayesinde)**: "19/20 basamak
takası" diye bir desen varsayıp `gy - 100` öneriyordum. Şinasi Yılmaz vakası
2016 → **1996**'ydı; 96 ile 16 aynı değil, yani yüzyıl takası DEĞİL, düpedüz
yanlış giriş. Heuristik 1916 gibi anlamsız yıllar öneriyordu. **Ders**: bilinen
bir vakadan desen çıkarırken sayıları gerçekten karşılaştır; bir tarama
sorgusunu yazdıktan sonra bilinen vakaları içeren fixture'la (yerel Postgres 16
bu ortamda mevcut, `initdb` root'la çalışmaz — `su postgres` gerekir) çalıştır.

## 🔥 Ders: "Migration'ı uyguladım" doğrulanmadan güvenilmez + PostgREST şema önbelleği (2026-09-08)

**İki kez aynı sınıf sorun**: (1) Marka indirim kodu migration'ı "uygulandı"
denmesine rağmen ikinci migration `42P01: relation "brand_discount_codes" does
not exist` verdi — yani ilk script hiç etki etmemişti. (2) Hemen ardından admin
panelinde `Could not find the 'connected_member_id' column of 'brands' in the
schema cache` çıktı; o kolonu ekleyen `20260908140000` de bu dosyada
"uygulandı" olarak kayıtlıydı.

**Neden fark edilmiyor**: Supabase SQL Editor tüm script'i TEK transaction'da
çalıştırır — script'in sonundaki bir hata baştaki `CREATE TABLE`'ları da geri
alır. Kullanıcı "çalıştırdım" der, tablolar yoktur. Bu yüzden **bu dosyadaki
"kullanıcı uyguladı" notları kanıt değil**; şema bağımlılığı olan bir işe
başlamadan önce doğrula (`information_schema.columns` / `.tables` sorgusu).

**İki ayrı hata mesajını karıştırma**:
- `42P01 relation ... does not exist` → nesne gerçekten yok (SQL'i çalıştır).
- `Could not find the 'X' column ... in the schema cache` → bu PostgREST'in
  cümlesi; kolon YOK ya da VAR ama PostgREST önbelleği eski. İkisini birden
  kapatan onarım: `ADD COLUMN IF NOT EXISTS` + `NOTIFY pgrst, 'reload schema';`

**`uuid_generate_v4()` tuzağı**: eski migration'lar bunu kullanıyor ama repoda
hiçbir yer `CREATE EXTENSION "uuid-ossp"` çalıştırmıyor — eklenti/search_path
yoksa fonksiyon çözülmez ve TÜM script geri alınır. Yeni migration'larda
**`gen_random_uuid()`** kullan (Postgres 13+ çekirdeğinde, her zaman çözülür).

**Sessiz hata yutmanın bedeli (RLS dersinin tekrarı)**: `admin.tsx`'te
`loadBrands` sadece `{ data }` alıyordu. `brandService.getAllBrands()`
`connected_member_id` FK'si üzerinden `profiles`'a join attığı için kolon
yokken sorgu TAMAMEN hata veriyor → `data` null → panel "marka yok" gösteriyor,
sebep hakkında tek kelime yok. Üstelik indirim kodu ekranındaki marka
dropdown'ı da aynı listeden beslendiği için boş kalıyor: **tek kök neden, iki
farklı görünen belirti**. `loadBrands` (admin + brands sayfası) artık `error`'u
gösteriyor. Yeni bir Supabase okuması yazarken `{ data, error }`'un ikisini de
al — bu ders bu projede üçüncü kez bedel ödetti.

## 🔥 Ders: Admin panelinde yeni bir sekme (`TabsContent`) eklerken `TabsList`'e `TabsTrigger` eklemeyi unutma

`src/pages/admin.tsx`'te marka yönetimi için eksiksiz bir `TabsContent
value="brands"` bloğu vardı, ama `TabsList`'te ona karşılık gelen
`TabsTrigger` hiç yoktu — yani sekme çubuğunda tıklanacak bir "Markalar"
sekmesi yoktu, o bölüme UI'dan ulaşmak mümkün değildi. Kullanıcı bunu
"marka ekleyemiyorum" diye bildirmişti; gerçek neden kısmen bu basit
gözden kaçmaydı (RLS sonsuz döngü ayrı, gerçek bir sorundu ama tek başına
yeterli açıklama değildi). **Yeni bir admin sekmesi eklerken/var olanı
denetlerken her zaman `TabsList` ↔ `TabsContent` eşleşmesini iki yönlü
kontrol et** — bir `TabsContent` yazıp `TabsTrigger`'ı eklemeyi unutmak,
konsolda hiçbir hata vermeyen, sessiz bir UI bug'ı.

## Oturum günlüğü

### 2026-09-08 — Yanlış graduation_year taraması (Bugfix 2 oturumu, ikinci talep)

Hafızada "sıradaki iyi aday" olarak duran tarama yapıldı. **Sonuç: kendi
verimizde kanıtlanabilir tek bir yanlış `graduation_year` yok** — denetim
sorgusu ([PR #19](https://github.com/ozgasl/eymeder/pull/19),
`docs/audits/`) production'da 17 satır döndürdü ve hiçbiri YÜKSEK değil.
Yani Aysın/Şinasi sınıfı hatanın başka örneği bulunamadı; o iki vaka
kanıtlanabilirdi çünkü ikinci bir yıl kaydı vardı, bu 17 kişide yok.

**Production tablosu**: 49 üye · 28 Fonzip'te eşleşen · 17 eşleşmeyen ·
4 cevapsız kontrol. 17'nin 5'i yedek arama öncesinden bayat kayıttı.

**Taramanın gerçek getirisi başka yerden geldi**: 9 üye (5 bayat + 4 cevapsız)
yeniden kontrol edildi ve **2'si gerçekten dernek üyesi çıkıp güncellendi** —
yani hakları olan üyelik geri verildi. Ayrıca tarama, cevapsız Fonzip
kontrolünün üyeyi sessizce düşürdüğü bug'ı ortaya çıkardı (bkz. yukarıdaki
ders) — bu, aranan hatadan daha önemliydi.

**Kalan havuz**: numara + e-posta + telefon üçüyle de bulunamayan ~12 üye.
Bunları ancak Fonzip tarafından çözmek mümkün: `name` parametresiyle ara
(spec'te `contains` koşulu var), tek eşleşme varsa `membership_no`'yu oku
(spec'te `values_list`'te SEÇİLEBİLİR olduğu iki resmi örnekle doğrulandı) —
ilk 4 hanesi gerçek mezuniyet yılı. Şinasi vakası tam olarak böyle çözüldü.
12 kişi için elle yapmak önerildi; üye sayısı büyürse `findFonzipMemberByName`
+ salt-okunur admin raporu kurulabilir. Bir kısmı zaten hata değil: 2019/2021/
2025 mezunları henüz aidat ödeyen dernek üyesi olmamış olabilir.

### 2026-09-08 — Marka indirim kodu sistemi (Bugfix 2 oturumu, ilk talep)

Kullanıcının talebi: "İndirimli Marka eklerken markaların verebileceği indirim
kodlarını girebileceğimiz bir alan olmalı, firma vermezse biz üretelim (örn.
%10 için EYB10). Mevcut üyeye özel karekod sistemini değiştirme."

Plan sunuldu, kullanıcı 3 karar noktasını önerildiği gibi onayladı (oran yoksa
marka adından kod, kod tekilliği zorunlu, kod DB seviyesinde gizli) ve
başlangıçta kapsam dışı bırakılan 4 özelliği de istedi: geçerlilik tarihi,
kullanım sayacı, marka başına çoklu kod, üyeye özel tek kullanımlık kod.
Hepsi uygulandı — tasarımın tamamı için yukarıdaki "Marka indirim kodları"
mimari kararına bak.

**Planın onaylanan halinden bilinçli bir sapma**: Plan `brands.discount_code`
adında TEK bir kolon öngörüyordu; "marka başına birden fazla kod" talebi
gelince kod ayrı bir tabloya (`brand_discount_codes`) taşındı. Bunun yan
faydası: kodlar ayrı tabloda olduğu için RLS ile `dernek_uyesi`'ye kısıtlamak
bedava geldi — planda "UI seviyesinde gizlemek yeterli, DB'de herkes okuyabilir"
diye kabul edilen sınır artık geçerli değil, gerçek koruma var.

Eklenen dosyalar: `supabase/migrations/20260908160000_brand_discount_codes.sql`,
`src/lib/discountCode.ts` (+ 31 test), `src/lib/brandCodes.ts`,
`src/lib/requireMember.ts` (`requireDernekUyesi` — `requireStaff`'ın üye
karşılığı), `src/services/brandCodeService.ts`,
`src/pages/api/brand-codes/{view,issue}.ts`,
`src/pages/api/admin/brand-codes/redeem.ts`,
`src/components/admin/BrandCodesManager.tsx`,
`src/components/BrandDiscountCodes.tsx`. Değişen: `admin.tsx` (Markalar
sekmesine kod yöneticisi), `brands.tsx` (üyeye kod gösterimi), README,
`database.types.ts`.

**Supabase'de manuel çalıştırılması gereken migration**:
`20260908160000_brand_discount_codes.sql` — Vercel deploy'u migration
çalıştırmıyor, kullanıcıya ayrıca söylendi.

**Canlıda test EDİLMEDİ** (bu ortamdan Supabase'e yazma yapılmadı): kod ekleme,
üyeye özel kod üretme ve "kullanıldı olarak işaretle" akışları migration
uygulandıktan sonra gerçek admin hesabıyla denenmeli.

**İkinci tur (aynı oturum, aynı PR)**: Kullanıcı ilk migration'ı Supabase'de
uyguladıktan sonra "tekrarlı kullanım da sayılsın" dedi. İlk migration ARTIK
PRODUCTION'DA olduğu için o dosya değiştirilmedi; kullanım defteri ayrı bir
migration ile eklendi (`20260908170000_brand_code_redemptions.sql`, mevcut
kayıtlar backfill'li). **Ders**: kullanıcı bir migration'ı uyguladığını
söyledikten sonra o dosya dokunulmaz — şema değişikliği yeni bir migration
olarak gelir, aksi halde onun DB'si ile repo birbirinden ayrı düşer.

### 2026-09-01 — 2026-09-08 — Mezuniyet yılı bugfix'i, mobil sekme kaybı, 6 yeni talep, Fonzip üyelik yedek araması

Uzun, çok konulu bir bugfix + geliştirme oturumu. PR'lar sırayla:

- **[#10](https://github.com/ozgasl/eymeder/pull/10)**: Aysın Gün'ün "üye
  listesinde üniversite mezuniyeti görünüyor" şikayeti → kök neden:
  `graduation_year` (kayıt anında girilen, Fonzip eşleşmesinde kullanılan)
  ile `high_school_graduation_year` (profil sayfasında ayrı düzenlenebilen)
  senkron değildi. `graduation_year` tek kaynak yapıldı, profilde salt
  okunur. Bkz. yukarıdaki mimari karar.
- **[#11](https://github.com/ozgasl/eymeder/pull/11)**,
  **[#12](https://github.com/ozgasl/eymeder/pull/12)**: Mobilde kayıt/kod
  doğrulama ve şifre sıfırlama akışlarında e-posta uygulamasına geçip
  dönünce form verisi kayboluyordu (`sessionStorage` sekmeye özel) →
  `localStorage`'a taşındı.
- **[#13](https://github.com/ozgasl/eymeder/pull/13)**: Tek oturumda
  onaylanan 6 talep — ana sayfada "EYB İK" etiketi, etkinlik sayfasında
  Fonzip'ten canlı etkinlik + bilet linki (kullanıcının paylaştığı Fonzip
  OpenAPI spec'i sayesinde gerçek API entegrasyonu yapılabildi, bkz.
  `docs/fonzip-api/fonzip-api-v2.yaml`), yeni kayıtta info@eymeder.com'a
  bilgi maili, gruplara dış link alanı, sosyal medya hesapları kullanıcı
  adıyla, ve marka ekleme sorunu + gerçek QR kod + test markaları.
- **[#14](https://github.com/ozgasl/eymeder/pull/14)**,
  **[#15](https://github.com/ozgasl/eymeder/pull/15)**: Canlı testte
  bulunan iki takip bug'ı — admin panelinde "Markalar" sekmesi hiç
  görünmüyordu (bkz. yukarıdaki ders), Fonzip "Bilet Al" linki yanlış yola
  gidip 404 veriyordu (doğrusu `/eymeder/etkinlikler/{slug}`).
- **[#16](https://github.com/ozgasl/eymeder/pull/16)**: Sinasi Yılmaz
  vakası → Fonzip üyelik eşleşmesine e-posta/telefon yedek araması eklendi
  (bkz. yukarıdaki ders — gerçek kök neden bizim DB'deki yanlış
  `graduation_year` idi, ama yedek arama kalıcı bir güvenlik ağı). Aynı
  PR'a (henüz merge edilmemişken) markalara Instagram/X + bağlantılı
  mezun dropdown'u ve ana sayfada kişiselleşmiş karşılama başlığı
  ("Hoş Geldin {Ad}") eklendi.

**Uygulanan ama Supabase'de manuel çalıştırılması gereken migration'lar**
(session sırasında her birinde hatırlatıldı, hepsi kullanıcı tarafından
uygulandı): `20260901120000_groups_external_link.sql`,
`20260901130000_seed_test_brands.sql`,
`20260908140000_brands_social_and_member_link.sql`. Yeni bir migration
eklediğinde bunu ayrıca söyle — Vercel deploy'u migration'ları OTOMATİK
çalıştırmıyor.

**Veri düzeltmeleri** (kullanıcı tarafından SQL ile manuel yapıldı):
Aysın Gün (`graduation_year` yanlış girilmiş), Sinasi Yılmaz (aynı sınıf
hata, `2016` → `1996`). `fonzip_membership_status = 'yok'` olan üyeler
arasında başka benzer vakalar olabilir, taranmadı — **sıradaki oturum için
iyi bir aday**.

**Süreç notu**: Bu oturumda her düzeltme ayrı bir PR olarak açılıp
(designated branch her seferinde `origin/main`'den `git checkout -B` ile
sıfırlanarak, çünkü önceki PR merge olmuştu) kullanıcı onayıyla merge
edildi — bir istisna: #16'ya, henüz merge edilmemişken, art arda gelen 2
küçük ek talep (marka sosyal medya alanları, karşılama başlığı) ayrı PR
açmak yerine aynı dala commit olarak eklendi.

### 2026-08-31 — Fonzip debt/membership ayrımı doğrulaması, iki gerçek bug bulundu

- Migration (`fonzip_status_columns`) production'a pooler üzerinden uygulandı (bkz.
  yukarıdaki ders bölümü).
- `findFonzipMember`'daki response-şekli varsayımı yanlış çıktı (`rows` yerine
  `user_list`, `unpaid_debt_count` values_list'te seçilemiyor) — düzeltildi, bkz. yukarı.
- **Ertelenen/kullanıcıya sorulan**: gerçek recheck endpoint'inin canlı bir üye
  üzerinde tetiklenip admin panelinde doğrulanması (kullanıcı bilinen bir üye
  seçecek), PR açılıp merge edilmesi.

### 2026-08-30/31 — Üye tipi kısıtlamaları, admin araçları, KVKK, RLS recursion fix

- Üye tipi/rol tabanlı özellik kısıtlaması uçtan uca uygulandı (bkz. yukarıdaki
  mimari kararlar). PR: [#2](https://github.com/ozgasl/eymeder/pull/2).
- Admin panelinde üyelik tipi manuel değiştirme + Fonzip yeniden kontrol
  eklendi; bu sırada `profiles.membership_tier` kolonunun client'tan herhangi
  bir giriş yapmış kullanıcı tarafından yazılabilir olduğu (kendi kendine
  `dernek_uyesi` yapabilme) fark edilip kapatıldı (`REVOKE UPDATE
  (membership_tier)`). PR: [#2](https://github.com/ozgasl/eymeder/pull/2).
- `ozgasl@gmail.com` ve `orhunhoca@gmail.com` admin yapıldı (e-posta bazlı
  seed migration). PR: [#3](https://github.com/ozgasl/eymeder/pull/3).
- `/kvkk` ve `/cerez-politikasi` sayfaları + kayıt formunda zorunlu KVKK onay
  kutusu eklendi. **Hukuki inceleme yapılmadı, avukata gösterilmesi
  önerildi.**
- Yukarıdaki RLS recursion bug'ı bulunup düzeltildi (bkz. "Ders" bölümü). PR:
  [#4](https://github.com/ozgasl/eymeder/pull/4) — bu düzeltme önce production'a
  doğrudan (pooler üzerinden `psql`/`pg` ile) uygulandı, sonra migration olarak
  repoya işlendi. **Ders**: acil bir prod-breaking bug'da doğrudan DB
  müdahalesi kabul edilebilir, ama HEMEN ardından aynı SQL'i migration dosyası
  olarak commit'le — aksi halde bir sonraki `supabase db push` düzeltmeyi geri
  alır.
- **Ertelenen**: UI değişiklikleri (3. ana konu, hiç başlanmadı), `profiles`
  RLS açığı (yukarıda), KVKK metninin hukuki incelemesi.
