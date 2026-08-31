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

- **Üyelik tipi ekseni**: `profiles.membership_tier` — `dernek_uyesi` (aidat
  ödeyen) / `mezun_uye` (kayıtlı ama aidatsız). Fonzip üzerinden
  `graduation_year` + `school_number` → `membership_no` ile doğrulanıyor
  (`src/lib/fonzipMembershipNo.ts`, `src/services/membershipProvider.ts`).
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

## ⚠️ Bilinen, ÇÖZÜLMEMİŞ güvenlik açığı

**`profiles` tablosunda hiç RLS yok.** Yani herhangi bir authenticated (hatta
belki anon) client, doğrudan Supabase REST API çağrısıyla TÜM üyelerin telefon,
e-posta, LinkedIn gibi bilgilerini okuyabilir — dizin sayfası UI'da
`dernek_uyesi`'ye kısıtlansa bile, bu sadece UI seviyesinde bir kısıtlama,
veritabanı seviyesinde değil. Bunu düzeltmek, `profiles`'a dayanan çok sayıda
mevcut okuma akışını (admin paneli, galeri, haberler yazar bilgisi, iş ilanı
sahibi vb.) kırmadan yapılması gereken, dikkatli test isteyen ayrı bir iş.
Henüz kimse elini sürmedi — sürerken bu notu güncelle.

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

## Oturum günlüğü

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
