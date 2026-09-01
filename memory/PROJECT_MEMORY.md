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

## Oturum günlüğü

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
