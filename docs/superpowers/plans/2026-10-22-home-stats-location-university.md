# Ana Sayfa İstatistikleri: Üniversite / Şehir / Ülke + Konum Verisi Standardizasyonu + Fonzip'ten Doldurma

> Durum: **PLAN** (kod yazılmadı). Kullanıcı kararları 2026-10-22 oturumunda alındı, aşağıda "Kararlar" bölümünde.

**Amaç:** Ana sayfadaki "X döneminden / Y meslek grubundan N üye" karolarının yanına "aynı üniversiteden", "aynı şehirde", "aynı ülkede yaşayan" N üye karolarını eklemek; bunun güvenilir çalışması için ülke/şehir verisini standart listelere çevirmek ve boş profilleri Fonzip'ten doldurmak. Ayrıca istatistik karolarını küçültmek.

**Kaynak:** Sayılar Fonzip'ten DEĞİL, kendi `profiles` / `profile_universities` tablolarımızdan gelir (`get_home_stats()` genişletilir). Fonzip yalnızca **veri doldurma** kaynağıdır.

---

## 1. Mevcut durum (prod'dan ölçüldü, 2026-10-22, salt okunur sayım)

| Metrik | Değer |
|---|---|
| Toplam profil | 207 |
| `country` dolu | 58 (Türkiye 50, Diğer 4, ABD 2, İngiltere 1, Hollanda 1) |
| `city` dolu | 54 (15 ham değer → normalize edince 13) |
| Üniversitesi olan üye | 50 (62 satır, 28 farklı üniversite) |

Çıkarımlar:
- **Veri çok seyrek**: üyelerin ~%72'sinin ülkesi, ~%74'ünün şehri boş. Yeni karolar çoğu üyede çıkmayacak. Bu yüzden Fonzip'ten doldurma (Faz 3) ve boş profile "tamamla" yönlendirmesi planın ayrılmaz parçası.
- **Şehir kirliliği küçük ve elle çözülebilir**: `İstanbul` (40) / `istanbul` (2) / `Istanbul` (1), `HATAY`, ayrıca ülkesi boş `İzmir`. Yurtdışı: Brüksel, Cape Town, Girne - Kıbrıs, Selanik, Londra, New York, New Jersey (4'ü ülke "Diğer").
- Şehir/ülke `member_profiles` view'inde **dernek üyesi olmayanlara maskeli**; üniversite adı herkese açık (bkz. `member_profile_universities`). Bu, karo tıklamalarını etkiler (Bölüm 5).

---

## 2. Kararlar (kullanıcıdan)

1. **Türkiye şehirleri listeden seçim** (81 il), mevcut kayıtlar güncellenecek.
2. **Ülke listesi dünya ülkeleri** olacak (listeden seçim). Türkiye dışı ülkeler için şehir listesi YOK (serbest metin kalır).
3. **Çok üniversiteli üye**: üyenin üniversitelerinden **herhangi biri ortaksa sayılır**. Karoda, o üyenin en kalabalık üniversitesi gösterilir.
4. **Alan boşsa** karo yerine "Profilini tamamla" yönlendirmesi gösterilir.
5. **Fonzip sorgulanacak**; alınabiliyorsa Fonzip verisi her zaman daha doğru kabul edilir ve profiller oradan güncellenir (çakışmada Fonzip kazanır).
6. Ana sayfadaki istatistik karoları **küçültülecek**.

### Plan sırasında varsayılan (itiraz edilirse değişir)
- **Sayıma kendisi dahil** (mevcut dönem/meslek karolarıyla tutarlı). Yalnızca kendisinin olduğu karo (sayı 1) **gösterilmez**; "ilk sen olabilirsin" diye bir boşluk yaratmaz.
- **Üniversite eşleşmesi durumdan bağımsız** (okuyor/mezun fark etmez); karo metni "aynı üniversiteden", "mezun" demez. 3 satırda durum boş.
- **Türkiye'de yaşayanlar için ülke karosu gösterilmez** (150 üyeden "Türkiye'de 150 üye" bilgi taşımaz); Türkiye'de ise şehir karosu, yurtdışındaysa ülke + (varsa) şehir karosu. En fazla 7 karo yerine tipik olarak 5–6.
- **Fonzip çakışma politikası (kullanıcı kararı, 2026-10-22: "Fonzip her zaman daha doğrudur")**: Fonzip'te değer varsa profildeki değerin üzerine yazılır; Fonzip'te boşsa profile dokunulmaz. Dry-run raporu yine yazılacak değer sayısını ve ezilecek (çakışan) kayıt sayısını gösterir.
- **Migration'ları Claude uygular (kullanıcı kararı)**: Supabase MCP `apply_migration` ile `eymeder` projesine. Yine de her migration'dan önce SQL ve etkisi özetlenir, sonrasında doğrulama sayımı yapılır.
---

## 3. Fazlar ve sıra

```
Faz 0  Fonzip keşif (salt okunur)      ──┐ paralel
Faz 1  Konum verisi + profil formu      ──┤
Faz 4  Karoları küçült (sadece UI)      ──┘ bağımsız, hemen yapılabilir
Faz 2  get_home_stats genişletme + yeni karolar   (Faz 1'e bağlı)
Faz 3  Fonzip → profil doldurma         (Faz 0 ve 1'e bağlı)
```

Önerilen PR bölünmesi: **PR-A** = Faz 4 · **PR-B** = Faz 0 · **PR-C** = Faz 1 · **PR-D** = Faz 2 · **PR-E** = Faz 3.

---

## Faz 0 — Fonzip keşif (salt okunur, PR-B) — **uygulandı**

Uygulama: `src/lib/fonzipProbe.ts`, `POST /api/admin/fonzip-probe` ve Admin → Kullanıcılar sekmesindeki "Fonzip alan keşfi" kartı. Preview'da kartı çalıştırıp çıkan JSON'u paylaşmak yeterli.

**Neden ayrı:** Bu ortamda Fonzip kimlik bilgisi yok (`FONZIP_CLIENT_ID/SECRET` yalnızca Vercel'de / kullanıcının `.env.local`'inde). Canlı doğrulama olmadan "Fonzip'te üniversite var mı, şehir/ülke 403 verir mi" bilinmiyor. Geçmiş ders: Fonzip `/users` `tags` seçilince 403 veriyor; adres alanları için de aynı kısıt çıkabilir.

**Yapılacak:** `GET /api/admin/fonzip-probe` (staff-only, `requireStaff`, `src/pages/api/admin/` deseni; **yalnızca toplu sayım döner, kişi verisi dönmez**):
1. `GET /user-defined-values` → UDV listesi (id, name, key_type). İçinde "üniversite" benzeri alan var mı.
2. `POST /users` ile `values_list: ["id","country_text"]`, sonra `["id","city_text"]`, sonra UDV anahtarı: her biri **ayrı istek** (biri 403 verirse diğerleri etkilenmesin). Her istek için HTTP durumu.
3. Alan başına: toplam kullanıcı, dolu sayısı, farklı değer sayısı, en sık 30 değer (şehir/ülke metni kişi verisi sayılmaz; üniversite UDV de aynı).
4. `total` değeri (Fonzip'te kaç kişi var; bizde 207 profil var).

**Çıktı:** Faz 3'ün kapsamını netleştirir: şehir/ülke alınabiliyor mu, üniversite alınabiliyor mu, dolu oranı, Fonzip ↔ profil eşleşme potansiyeli.

**Çalıştırma:** Route'u preview deploy'a koyup kullanıcının staff oturumuyla açması gerekir (kimlik bilgisi orada). Doğrulama sonrası route silinir ya da Faz 3'ün dry-run moduna evrilir.

---

### Faz 0 sonucu (ilk keşif çalıştırması, 2026-10-22; Fonzip'te ~505 kullanıcı)

Hiçbir alan 403 vermedi, yani alanlar alınabiliyor. Ama doluluk düşük ve veri kirli:

| Alan | Doluluk | Not |
|---|---|---|
| `country_text` | **3 / 500** (hepsi "Türkiye") | Fiilen boş. Ülke doğrudan Fonzip'ten gelmeyecek. |
| Özel alan `ulke` (Ülke, çoklu seçim) | ilk çalıştırmada probe edilmedi | İkinci çalıştırmada bakılacak. |
| `city_text` | 145 / 400 (~%36) | 111 "İstanbul", 11 "Istanbul", 5 "İSTANBUL"; çöp: "34", "Kadıköy" (ilçe), "NJ 07310, USA", "Turkiye", "Vaud". |
| `district_text` | 140 / 400 | Çoğu İstanbul ilçesi (Kadıköy 50, Ataşehir 22...). İl eksikse ilçeden il çıkarılabilir. |
| `mezun-oldugu-universite` (Lisans) | **167 / 500** (134 farklı) | Serbest metin, çok kirli: "İTÜ" ↔ "İstanbul Teknik Üniversitesi", "Istanbul Üniversitesi", "İstanbul Üniversitesi İşletme Fakültesi" (bölüm gömülü), "-", "Öğrenci", "3.sınıf öğrencisiyim". |
| `...-bolumu` (Bölüm) | 18 / 300 | Az. |
| Yüksek lisans / doktora | 5 / 0 | Önemsiz. |
| `mezun-oldugu-yil` | 332 / 400 | Bizim `graduation_year` ile çapraz kontrol edilebilir (yanlış yıl vakaları). |

İlk çalıştırma Fonzip'in hız sınırına (429) takıldı: alan başına ayrı sayfalama yapıp 12 alanı paralel çekiyordu; çoğu alan 400-500 kullanıcıda kesildi ve **profil eşleşme sayımı (`overlap`) hiç çalışmadı**. Probe tek geçişli (tüm alanlar tek `values_list`) ve 429'da bekleyip yeniden deneyen hâle getirildi; seçim tipi alanlar ("[object Object]") artık okunuyor. **Keşfin bir kez daha çalıştırılması gerekiyor.**

Sonuçlar Faz 3'ü şöyle şekillendiriyor:
- **Ülke:** Fonzip'ten değil, **şehirden çıkarım**: şehir (veya ilçe) Türkiye'de bir il/ilçe ise ülke = Türkiye. Yurtdışı şehirleri için ülke boş kalır, profil formu "tamamla" der.
- **Şehir:** il listesine normalize eşleşme + takma ad ("Istanbul", "Izmir", "34" → plaka kodu) + ilçeden il çıkarımı. Eşleşmeyen sayımlı listelenir.
- **Üniversite:** en zor kısım. Takma ad tablosu (İTÜ, ODTÜ, YTÜ, Boğaziçi...), sondaki fakülte/bölüm metnini `department`'a ayırma, çöp değerleri ("-", "Öğrenci") eleme. Dry-run, eşleşmeyen üniversite değerlerini sayımla listeler; takma ad tablosunu o listeden birlikte genişletiriz. Eşleşmeyen değer **yazılmaz**.

## Faz 1 — Konum verisi standardizasyonu ve profil formu (PR-C)

### 1a. Listeler (saf, testli)
- `src/lib/countries.ts`: ISO 3166-1 dünya ülkeleri, **statik, commit'li** `{ code, name }` listesi (Türkçe adlar). `Intl.DisplayNames('tr')` ile **bir kerelik** üretilir, sonra dosyaya sabitlenir; çalışma zamanında Intl'e güvenilmez çünkü ICU sürümüne göre isimler değişir ve SQL tarafındaki eşleşme kayar. Elle düzeltmeler: kısa/bilinen adlar (`ABD`, `İngiltere`, `Türkiye`), ISO dışı **"Kuzey Kıbrıs (KKTC)"** satırı. Sıralama: Türkiye en üstte, sonra alfabetik (`localeCompare("tr")`).
- `src/lib/turkishCities.ts`: 81 il, resmi yazımıyla (`Afyonkarahisar`, `Kahramanmaraş`, `Şanlıurfa`...).
- `src/lib/placeNormalize.ts`: `normalizePlace(s)` = Türkçe farkındalıklı katlama (`İ→i`, `I→ı→i`, `ç,ğ,ö,ş,ü→c,g,o,s,u`, trim, boşluk sıkıştırma, küçük harf). **Aynı fonksiyon SQL'de de olacak** (`public.normalize_place(text)`, IMMUTABLE); ikisinin aynı sonucu verdiğini ortak test vektörleriyle doğrula.
- Testler (`vitest`): 81 il, tekrar yok; ülke kodları tekil, Türkiye var; `normalizePlace("HATAY") === normalizePlace("Hatay")`, `"Istanbul" ≡ "İstanbul" ≡ "istanbul"`.

### 1b. Profil formu (`src/pages/profile.tsx`, Lokasyon bölümü)
- Ülke: sabit 9'lu `Select` yerine **aranabilir combobox** (~250 satır). `UniversityCombobox`'ın "listede olmayanı da kaydet" davranışı burada **istenmez** (ülke kapalı liste) → ortak bir `Combobox` bileşenine çıkar, `allowCustom` bayrağı ile (üniversitede true, ülkede/şehirde false).
- Şehir: ülke **Türkiye** ise 81 il combobox'ı; değilse mevcut serbest metin input'u. Ülke Türkiye'den başka bir şeye değişince Türkiye ili şehir alanından temizlenir (aksi halde "Almanya / Ankara" kalır).
- Kayıtta `country` ve `city` **kanonik adla** yazılır (şema aynı, `profiles.country`/`city` text kalır; yeni kolon yok).

### 1c. Mevcut kayıtların güncellenmesi (migration)
`supabase/migrations/20261022100000_normalize_profile_locations.sql` — **tamamen idempotent**, `TRIM`/`normalize_place` ile eşleşir (geçmiş ders: ham eşitlik görünmez boşluklarda kaçırıyor):

| Şu an | Sonra |
|---|---|
| `İstanbul` / `istanbul` / `Istanbul` (+ country boş ise) | `İstanbul`, ülke `Türkiye` |
| `HATAY` | `Hatay` |
| `İzmir` (ülke boş) | `İzmir`, ülke `Türkiye` |
| `Bolu`, `Tekirdağ` | olduğu gibi |
| ülke `ABD`, `Hollanda`, `İngiltere`, `Türkiye` | listedeki kanonik ad |
| ülke `Diğer` + şehir `Brüksel` | `Belçika` / `Brüksel` |
| ülke `Diğer` + `Cape Town` | `Güney Afrika` / `Cape Town` |
| ülke `Diğer` + `Girne - Kıbrıs` | `Kuzey Kıbrıs (KKTC)` / `Girne` |
| ülke `Diğer` + `Selanik` | `Yunanistan` / `Selanik` |
| ülke dolu, şehri Türkiye listesinde olmayan Türkiye'li | **dokunma**, rapora yaz |

Migration sonunda **kalan eşleşmeyenleri listeleyen** denetim sorgusu `docs/audits/location-normalize-audit.sql` olarak eklenir (mevcut `docs/audits/*` deseni). `'Diğer'` değeri **kaldırılır**: mevcut 4 kayıt yukarıda taşınır, eşleşmeyen olursa NULL'a çekilir ve profil formu "tamamla" gösterir.

Hatırlatma (PROJECT_MEMORY dersleri): SQL Editor tek transaction çalıştırır → "uyguladım" kanıt değil, sonrasında `information_schema`/sayım sorgusuyla doğrula; `gen_random_uuid()` kullan; uygulanmış migration'a dokunma; `NOTIFY pgrst, 'reload schema'`.

### 1d. Diğer tüketiciler
- `directory.tsx`: ülke filtresi zaten üyelerden dinamik türüyor; şehir filtresi `getCities()`. Kanonik veriyle tutarlı olur, kod değişikliği gerekmez (filtre dropdown'ları `Diğer` yerine gerçek ülkeleri gösterir).
- `mentorship.tsx`, `gamificationService.ts` (`profile.city` doluluk): etkilenmez.
- Kayıt akışı şehir/ülke sormuyor (yalnız `profile.tsx`); ek form yok.

---

## Faz 2 — `get_home_stats()` genişletme + yeni karolar (PR-D)

### 2a. SQL (`20261022110000_home_stats_location_university.sql`)
`RETURNS TABLE` değiştiği için **`DROP FUNCTION IF EXISTS public.get_home_stats();` + `CREATE`** (PROJECT_MEMORY'de not var; `CREATE OR REPLACE` yetmez). Yeni kolonlar mevcutların **sonuna** eklenir; yeniden `GRANT EXECUTE ... TO authenticated` + `NOTIFY pgrst`.

Yeni çıktı kolonları:
```
university text, university_count int,        -- en kalabalık ortak üniversite
city text, city_count int,                     -- (country, normalize_place(city)) eşleşmesi
country text, country_count int
```
Mantık (hepsi `SECURITY DEFINER`, yalnızca **sayı** döner, başka üyenin satırı dönmez; mevcut fonksiyonun gerekçesiyle aynı):
- **Üniversite:** üyenin her `profile_universities.university`'si için, o üniversiteye sahip **farklı `profile_id`** sayısı; en yüksek olan seçilir (eşitlikte alfabetik). Karşılaştırma `normalize_place`.
- **Şehir:** `country` + `normalize_place(city)` eşit olan profil sayısı (Ankara/Almanya ile Ankara/Türkiye karışmasın; Türkiye'de ülke de eşit olmalı).
- **Ülke:** `country` eşit olan profil sayısı.
- Alan boşsa ilgili kolonlar NULL (frontend "profilini tamamla" gösterir).

İndeks: 207 satırda gerekmez; yine de `profile_universities.university` için `lower(...)` indeksi sonraya, ölçek gerekirse.

Test (geçmiş derslerin gereği): **yerel Postgres 16'da gerçek rolle** (`SET ROLE authenticated`, `auth.uid()` stub'ı): (i) aynı üniversiteli iki üye, (ii) çok üniversiteli üye, (iii) `istanbul`/`İstanbul` aynı sayılır, (iv) farklı ülkede aynı şehir adı ayrı sayılır, (v) anon boş döner, (vi) boş alanda NULL. SQL Editor superuser olduğundan orada doğrulama **yetmez**.

### 2b. Servis + tipler
`HomeStats` arayüzü (`src/services/profileService.ts`) ve `database.types.ts`'teki `get_home_stats` dönüş tipi güncellenir. Dağıtım sırası: **önce migration, sonra deploy** (eski client yeni kolonları yok sayar, güvenli; ters sırada yeni client eksik kolonla gelir).

### 2c. Karolar (`src/pages/index.tsx`)
- Sıra: dönem, meslek grubu, üniversite, şehir, ülke (yalnızca Türkiye dışı), yeni üye, marka.
- Karo hedefleri: `/directory?university=...`, `?city=...&country=...`, `?country=...`. `directory.tsx`'e bu query parametrelerinin ön-filtre okuması eklenir (mevcut `graduationYear`/`professionGroup` deseniyle).
- Alan boşsa: karo yerine tek satırlık "Profilini tamamla" kartı (`/profile`), eksik alanları sayarak ("üniversite, şehir eksik").
- Sayı 1 (yalnız kendisi) → karo gösterilmez.

---

## Faz 3 — Fonzip → profil doldurma (PR-E)

**Ön koşul:** Faz 0 sonucu + Faz 1 listeleri (Fonzip'in serbest metnini kanonik adlara çevirmek için).

`POST /api/admin/fonzip-sync-locations` (staff-only, `requireStaff`):
1. Fonzip `/users`'ı sayfalayarak çek (`how_many` ≤ 100, `start_page` artırarak): `id, membership_no, email, country_text, city_text` (+ Faz 0'da çıkarsa üniversite UDV'si). Token `fonzip_token_cache` ile; 429'da bekle-yeniden-dene; istek başına 5 sn zaman aşımı mevcut `fetchWithTimeout`.
2. Eşleştirme: profil `buildFonzipMembershipNo(graduation_year, school_number)` → yoksa e-posta → yoksa telefon son 10 hane (mevcut `findFonzipMemberByContact` mantığı, **belirsiz eşleşme asla yazılmaz**).
3. Çeviri: `country_text` → `countries.ts` (normalize + takma ad tablosu: `Turkey`, `Türkiye Cumhuriyeti`, `TR`, `TÜRKİYE`...); `city_text` → ülke Türkiye ise 81 il listesi (normalize eşleşme; eşleşmezse **yazılmaz**, rapora girer), yurtdışıysa trim'lenmiş metin.
4. **Dry-run varsayılan**: yazmadan rapor döner: eşleşen/eşleşmeyen sayı, doldurulacak alan sayıları, çakışmalar (üyenin değeri ≠ Fonzip değeri), çevrilemeyen değerlerin sayımlı listesi. Gerçek yazma `?apply=1` + admin tıklaması.
5. Yazma: service-role, `country`/`city` için Fonzip değeri çevrilebiliyorsa **profildekinin üzerine yazar** (Fonzip kazanır); çevrilemeyen değer yazılmaz. Üniversite Fonzip'ten gelirse `profile_universities`'e satır (YÖK listesine normalize edilerek) eklenir; üyenin mevcut üniversite satırları silinmez.
6. Admin panelinde (`src/pages/admin.tsx`) küçük bir "Fonzip'ten konum doldur" kartı (dry-run sonucu + onay). `TabsList` ↔ `TabsContent` eşleşmesini iki yönlü kontrol et (geçmiş ders).

**Maksimum süre riski:** `vercel.json`'da `maxDuration` yok; ~207–500 kullanıcı için birkaç sayfa yeterli, yine de sayfa başına çağrı + `cursor` parametresiyle kısmen çalıştırılabilir tasarla.

Testler (`vitest`, ağ yok): ülke/şehir çevirici, eşleştirme önceliği, "belirsiz eşleşme yazma", "dolu alanı ezme" politikası, route yetkisi (`membershipRecheckRoute.test.ts` deseni; testi `src/pages/api` altına koyma).

---

## Faz 4 — Karoları küçült (PR-A, bağımsız) — **uygulandı**

`src/components/StatTile.tsx` + `index.tsx` refaktörü; etiketler dar ekranda 2 satıra iniyor (tam metin `title`'da).

Şu an her karo `p-6`, ikon `p-4` + `h-8 w-8`, değer `text-2xl`, ızgara `gap-6 mb-12`, `lg:grid-cols-4`.

- Tek bir `StatTile` bileşeni (`src/components/StatTile.tsx`): `href?`, `icon`, `tone`, `value`, `label`, `lockedLabel?`. `index.tsx`'teki 4 kopya Card/CardContent bloğu buna iner (7 karoda kopya çoğalmasın diye şart).
- Boyutlar: `CardContent p-3 sm:p-4`, ikon `p-2 rounded-xl` + `h-5 w-5`, değer `text-lg font-semibold`, etiket `text-xs text-muted-foreground`, `gap-3`, bölüm `mb-8`.
- Izgara: `grid-cols-2 md:grid-cols-3 lg:grid-cols-4` (mobilde 2 sütun; eski 1 sütun 4 uzun kart demekti).
- Erişilebilirlik: mevcut `aria-label` metinleri, `focus-within:ring` ve `Link` sarmalayıcıları aynen korunur; dar karoda uzun metin için `truncate` + `title`.
- Doğrulama: mobil (375px), tablet, masaüstü ekran görüntüsü (Playwright/Chromium bu ortamda var); `npm run lint`, `npm run build`, `npm test`.

---

## 5. Riskler / açık noktalar

1. **Karo → dizin tıklaması dernek üyesi olmayanda boş döner.** `member_profiles` şehir/ülkeyi maskeler; mezun üye `?city=İstanbul` ile dizine gidince filtre eşleşmez ve "0 sonuç" görür. (Meslek grubu karosu da aynı sorunda; üniversite adı herkese açık olduğu için üniversite karosu çalışır.) Öneri: şehir/ülke/meslek karolarında sayı herkese, **tıklama yalnızca dernek üyesi/staff'a**; diğerlerinde marka karosundaki gibi "Dernek üyelerine özel" kilidi. Karar bekliyor.
2. **Sayı sızıntısı:** `SECURITY DEFINER` sayım, maskeli alanlar hakkında toplu bilgi verir (zaten dönem/meslek için böyle). Küçük kitlede (ör. "Cape Town: 2 üye") kişi çıkarımı mümkün; **sayı < 2 gizleme** bunu kısmen azaltır, tam çözüm değil. Dernek bunu kabul ediyor mu teyit edilmeli.
3. **Fonzip alanları 403 verebilir** ya da şehir/ülke boş çıkabilir (Faz 0 belirleyecek). En kötü durumda Faz 3 küçülür, Faz 1–2 yine değer üretir.
4. **Fonzip ↔ profil eşleşmesi kusurlu olabilir** (yanlış `graduation_year` vakaları PROJECT_MEMORY'de). Bu yüzden belirsizde yazmama + dry-run.
5. **Ülke adı biçimi:** `İngiltere` mi `Birleşik Krallık` mı, `ABD` mi `Amerika Birleşik Devletleri` mi? Plan mevcut üye alışkanlığını (kısa adlar) korur; değişirse migration eşleme tablosu güncellenir.
6. **Migration'lar:** kullanıcı kararıyla Claude uygular (Supabase MCP, `eymeder`). Prod verisi değiştiği için her uygulamadan önce SQL özetlenir, sonrasında `information_schema`/sayım ile doğrulanır.

## 6. Doğrulama kontrol listesi (her PR öncesi)
`npm run lint` · `npm run build` · `npm test` · yeni SQL için yerel Postgres 16 + gerçek rol testi · UI için mobil/masaüstü ekran görüntüsü · migration sonrası prod'da sayım/`information_schema` doğrulaması.
