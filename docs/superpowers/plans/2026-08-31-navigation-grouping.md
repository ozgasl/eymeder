# Navigasyon Barı Gruplama Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** `Navigation.tsx`'teki 12+ düz nav öğesini 5 mantıksal dropdown grubuna (Hakkımızda, Topluluk, Kaynaklar, Avantajlar, Üyelik) ayırıp masaüstü barı sadeleştirmek, mobil menüde aynı gruplamayı accordion bölümleri olarak yansıtmak.

**Architecture:** Tek bir modül-seviyesi `NAV_GROUPS` veri dizisi tanımlanır (grup adı + öğeler, her öğede opsiyonel `requiresDernekUyesi` bayrağı). Bu veriden masaüstünde `NavDropdownGroup` bileşeni (Radix `DropdownMenu`), mobilde ise mevcut `src/components/ui/accordion.tsx` (Radix Accordion) render edilir. Sabit kalan Ana Sayfa/Etkinlikler/Üyeler/Admin linkleri değişmeden JSX'te kalır.

**Tech Stack:** Next.js (Pages Router), React, Radix UI (`@radix-ui/react-dropdown-menu`, `@radix-ui/react-accordion` — ikisi de zaten kurulu), TypeScript, Tailwind.

Spec: [`docs/superpowers/specs/2026-08-31-navigation-grouping-design.md`](../specs/2026-08-31-navigation-grouping-design.md)

---

## File Structure

Tek dosya değişiyor, yeni dosya oluşturulmuyor:

- **Modify:** `src/components/Navigation.tsx` (579 satır → tahmini ~510 satır). Grup verisi ve `NavDropdownGroup` bileşeni bu dosyanın içinde, modül seviyesinde (component fonksiyonunun dışında, üstünde) tanımlanır — ayrı bir dosyaya çıkarmayı gerektirecek kadar büyük değil; refactor sonrası dosya mevcut halinden daha kısa olacak (tekrarlanan dropdown JSX'i kalkıyor).

Bu component için mevcut bir test dosyası yok ve projede React component test altyapısı (jsdom / `@testing-library/react`) kurulu değil (`vitest.config.ts` → `environment: "node"`, mevcut testler `src/lib`/`src/services` altında salt mantık testleri). Bu altyapıyı bu değişiklik için kurmak kapsam dışı — spec'in Testing Plan bölümünde de kararlaştırıldığı gibi doğrulama `npm run lint` + `npm run build` + manuel tarayıcı kontrolü ile yapılıyor.

---

### Task 1: Navigation.tsx — grup verisi, `NavDropdownGroup`, masaüstü ve mobil render

**Files:**
- Modify: `src/components/Navigation.tsx`

- [ ] **Step 1: Accordion import'unu ekle**

Modify `src/components/Navigation.tsx` — mevcut `NavigationMenu` import bloğunun (satır 21-28) hemen altına, `import { authService }` satırından (satır 29) önce ekle:

```tsx
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
```

- [ ] **Step 2: `NAV_GROUPS` verisini ve `NavDropdownGroup` bileşenini ekle**

Modify `src/components/Navigation.tsx` — `export function Navigation() {` satırından (mevcut satır 37) hemen önce, aşağıdaki bloğu ekle:

```tsx
type NavGroupItem = {
  href: string;
  label: string;
  external?: boolean;
  requiresDernekUyesi?: boolean;
};

type NavGroup = {
  key: string;
  label: string;
  items: NavGroupItem[];
};

const NAV_GROUPS: NavGroup[] = [
  {
    key: "about",
    label: "Hakkımızda",
    items: [
      { href: "https://eymeder.com/baskanin-mesaji", label: "Başkanın Mesajı", external: true },
      { href: "https://eymeder.com/yonetim-kurulu", label: "Yönetim Kurulu", external: true },
    ],
  },
  {
    key: "community",
    label: "Topluluk",
    items: [
      { href: "/groups", label: "Gruplar" },
      { href: "/mentorship", label: "Mentorluk" },
      { href: "/messages", label: "Mesajlar", requiresDernekUyesi: true },
    ],
  },
  {
    key: "resources",
    label: "Kaynaklar",
    items: [
      { href: "/news", label: "Haberler" },
      { href: "/gallery", label: "Galeri" },
      { href: "/testimonials", label: "Başarı Hikayeleri" },
      { href: "/jobs", label: "EYB İK" },
    ],
  },
  {
    key: "perks",
    label: "Avantajlar",
    items: [
      { href: "/store", label: "Mezun Store" },
      { href: "/brands", label: "İndirimli Markalar" },
    ],
  },
  {
    key: "membership",
    label: "Üyelik",
    items: [
      { href: "http://eymeder.com/neden-uye-olmaliyim", label: "Neden Üye Olmalıyım?", external: true },
      { href: "https://fonzip.com/eymeder/form/uyelik-basvuru-formu", label: "Üyelik Başvuru", external: true },
      { href: "https://fonzip.com/eymeder/odeme", label: "Aidat Öde", external: true },
      { href: "https://fonzip.com/eymeder/bagis-yap", label: "Bağış Yap", external: true },
    ],
  },
];

function NavDropdownGroup({
  group,
  isDernekUyesi,
}: {
  group: NavGroup;
  isDernekUyesi: boolean;
}) {
  const visibleItems = group.items.filter(
    (item) => !item.requiresDernekUyesi || isDernekUyesi
  );
  if (visibleItems.length === 0) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-1 text-sm font-medium hover:text-primary transition-colors outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm px-2 py-1"
        aria-label={`${group.label} menüsü`}
        aria-haspopup="true"
      >
        {group.label}
        <ChevronDown className="h-3 w-3" aria-hidden="true" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-64" role="menu">
        {visibleItems.map((item) => (
          <DropdownMenuItem key={item.href} asChild>
            {item.external ? (
              <a
                href={item.href}
                target="_blank"
                rel="noopener noreferrer"
                className="cursor-pointer"
                role="menuitem"
              >
                {item.label}
              </a>
            ) : (
              <Link href={item.href} className="cursor-pointer" role="menuitem">
                {item.label}
              </Link>
            )}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
```

- [ ] **Step 3: Eski `aboutItems`/`membershipItems` sabitlerini component içinden kaldır**

Modify `src/components/Navigation.tsx` — component fonksiyonu içindeki (mevcut satır 137-147) şu bloğu tamamen sil:

```tsx
  const aboutItems = [
    { href: "https://eymeder.com/baskanin-mesaji", label: "Başkanın Mesajı", external: true },
    { href: "https://eymeder.com/yonetim-kurulu", label: "Yönetim Kurulu", external: true },
  ];

  const membershipItems = [
    { href: "http://eymeder.com/neden-uye-olmaliyim", label: "Neden Üye Olmalıyım?", external: true },
    { href: "https://fonzip.com/eymeder/form/uyelik-basvuru-formu", label: "Üyelik Başvuru", external: true },
    { href: "https://fonzip.com/eymeder/odeme", label: "Aidat Öde", external: true },
    { href: "https://fonzip.com/eymeder/bagis-yap", label: "Bağış Yap", external: true },
  ];
```

(İçerikleri artık Step 2'de eklenen `NAV_GROUPS`'ta yaşıyor.)

- [ ] **Step 4: Masaüstü nav bloğunu değiştir**

Modify `src/components/Navigation.tsx` — mevcut satır 165-282 arasındaki (`{/* Desktop Navigation */}` yorumundan sonraki `<div className="hidden lg:flex ...">` bloğunun tamamı, Admin linki dahil, kapanış `</div>`'ine kadar) şu içerikle değiştir:

```tsx
        <div className="hidden lg:flex items-center gap-6 flex-1 justify-center" role="menubar">
          <Link href="/" className="text-sm font-medium hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm px-2 py-1" role="menuitem">
            Ana Sayfa
          </Link>

          <NavigationMenuItem>
            <Link
              href="/events"
              className={cn(
                "group inline-flex h-10 w-max items-center justify-center rounded-md bg-background px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus:bg-accent focus:text-accent-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                "text-base",
                router.pathname === "/events" && "bg-accent text-accent-foreground"
              )}
              aria-current={router.pathname === "/events" ? "page" : undefined}
            >
              Etkinlikler
            </Link>
          </NavigationMenuItem>

          {isDernekUyesi && (
            <Link href="/directory" className="text-sm font-medium hover:text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm px-2 py-1" role="menuitem">
              Üyeler
            </Link>
          )}

          {NAV_GROUPS.map((group) => (
            <NavDropdownGroup key={group.key} group={group} isDernekUyesi={isDernekUyesi} />
          ))}

          {isStaff && (
            <Link href="/admin" className="text-sm font-medium hover:text-primary transition-colors hidden lg:block focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 rounded-sm px-2 py-1" role="menuitem">
              Admin
            </Link>
          )}
        </div>
```

Bu, sırasıyla: Ana Sayfa, Etkinlikler, Üyeler (dernek_uyesi'ne özel), sonra `NAV_GROUPS` sırasıyla Hakkımızda▾ / Topluluk▾ / Kaynaklar▾ / Avantajlar▾ / Üyelik▾, en sonda Admin (staff'a özel) — spec'te onaylanan sırayla birebir aynı.

- [ ] **Step 5: Mobil menü bloğunu değiştir**

Modify `src/components/Navigation.tsx` — mevcut satır 410-576 arasındaki (`{/* Mobile Menu */}` yorumundan `{mobileMenuOpen && ( ... )}` bloğunun tamamı) şu içerikle değiştir:

```tsx
      {/* Mobile Menu */}
      {mobileMenuOpen && (
        <div className="lg:hidden border-t bg-card" id="mobile-menu" role="menu" aria-label="Mobil navigasyon">
          <div className="container py-4 space-y-1">
            <Link
              href="/"
              className="block px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              onClick={() => setMobileMenuOpen(false)}
              role="menuitem"
            >
              Ana Sayfa
            </Link>
            <Link
              href="/events"
              className="block px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
              onClick={() => setMobileMenuOpen(false)}
              role="menuitem"
            >
              Etkinlikler
            </Link>
            {isDernekUyesi && (
              <Link
                href="/directory"
                className="block px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                onClick={() => setMobileMenuOpen(false)}
                role="menuitem"
              >
                Üyeler
              </Link>
            )}

            <Accordion type="multiple" className="w-full">
              {NAV_GROUPS.map((group) => {
                const visibleItems = group.items.filter(
                  (item) => !item.requiresDernekUyesi || isDernekUyesi
                );
                if (visibleItems.length === 0) return null;
                return (
                  <AccordionItem key={group.key} value={group.key} className="border-b-0">
                    <AccordionTrigger className="px-4 py-2 text-sm font-medium hover:bg-muted rounded-md hover:no-underline">
                      {group.label}
                    </AccordionTrigger>
                    <AccordionContent className="pb-1">
                      <div className="space-y-1">
                        {visibleItems.map((item) =>
                          item.external ? (
                            <a
                              key={item.href}
                              href={item.href}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="block pl-8 pr-4 py-2 text-sm hover:bg-muted rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                              onClick={() => setMobileMenuOpen(false)}
                              role="menuitem"
                            >
                              {item.label}
                            </a>
                          ) : (
                            <Link
                              key={item.href}
                              href={item.href}
                              className="block pl-8 pr-4 py-2 text-sm hover:bg-muted rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                              onClick={() => setMobileMenuOpen(false)}
                              role="menuitem"
                            >
                              {item.label}
                            </Link>
                          )
                        )}
                      </div>
                    </AccordionContent>
                  </AccordionItem>
                );
              })}
            </Accordion>

            {isStaff && (
              <Link
                href="/admin"
                className="block px-4 py-2 text-sm font-medium hover:bg-muted rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
                onClick={() => setMobileMenuOpen(false)}
                role="menuitem"
              >
                Admin
              </Link>
            )}
          </div>
        </div>
      )}
```

- [ ] **Step 6: Lint çalıştır**

Run: `npm run lint`
Expected: Hatasız geçer (0 error). `Navigation.tsx` dışında hiçbir dosya değişmediği için başka dosyalardan kaynaklanan hatalar bu değişiklikle ilgili değildir — yalnızca `Navigation.tsx` ile ilgili çıktıyı kontrol et.

- [ ] **Step 7: Build çalıştır**

Run: `npm run build`
Expected: Başarıyla tamamlanır (TypeScript tip hataları veya import hataları yok).

- [ ] **Step 8: Commit**

```bash
git add src/components/Navigation.tsx
git commit -m "$(cat <<'EOF'
Group navigation into dropdown categories

Consolidates 12+ flat nav items into 5 dropdown groups (Hakkımızda,
Topluluk, Kaynaklar, Avantajlar, Üyelik) to declutter the desktop bar,
mirrored as mobile accordion sections. See docs/superpowers/specs/2026-08-31-navigation-grouping-design.md.

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

---

### Task 2: Manuel tarayıcı doğrulaması

**Files:** none (kod değişikliği yok — sadece doğrulama; sorun bulunursa Task 1'e dönüp düzeltme yapılır)

- [ ] **Step 1: Dev server'ı başlat**

Run: `npm run dev`
Expected: `http://localhost:3000` üzerinde çalışır.

- [ ] **Step 2: Masaüstü genişlikte kontrol et**

Tarayıcıda (≥1024px genişlik, `lg:` breakpoint üstü) ana sayfayı aç.
Expected:
- Bar tek satırda: Ana Sayfa, Etkinlikler, Üyeler (giriş yapılmışsa ve `dernek_uyesi` ise), Hakkımızda▾, Topluluk▾, Kaynaklar▾, Avantajlar▾, Üyelik▾ sırasıyla görünür.
- Her dropdown'a tıklayınca doğru öğeler açılır: Hakkımızda → Başkanın Mesajı, Yönetim Kurulu; Topluluk → Gruplar, Mentorluk (+ Mesajlar sadece dernek_uyesi girişinde); Kaynaklar → Haberler, Galeri, Başarı Hikayeleri, EYB İK; Avantajlar → Mezun Store, İndirimli Markalar; Üyelik → Neden Üye Olmalıyım, Üyelik Başvuru, Aidat Öde, Bağış Yap.
- Harici linkler (`external: true` olanlar) yeni sekmede açılıyor.
- `/events` sayfasındayken Etkinlikler linki aktif-sayfa stiliyle (`aria-current="page"`, vurgulu arka plan) görünüyor.

- [ ] **Step 3: Mobil genişlikte kontrol et**

Tarayıcı penceresini/emülatörü ~375px genişliğe küçült, hamburger menüyü aç.
Expected:
- Ana Sayfa, Etkinlikler, Üyeler (koşullu) düz linkler olarak üstte.
- Hakkımızda, Topluluk, Kaynaklar, Avantajlar, Üyelik birer accordion başlığı olarak listelenir; her birine tıklayınca içeriği açılıp kapanıyor, birden fazlası aynı anda açık kalabiliyor (`type="multiple"`).
- Admin linki (varsa) en altta.

- [ ] **Step 4: Koşullu görünürlüğü kod üzerinden doğrula**

Gerçek bir `dernek_uyesi` / staff test hesabı hazır değilse, tarayıcıda birebir toggle etmek yerine kodu tekrar oku ve teyit et: `isDernekUyesi=false` iken Üyeler linki ve Topluluk içindeki Mesajlar öğesi render edilmiyor (`NAV_GROUPS` filtre mantığı + `{isDernekUyesi && ...}` koşulları); `isStaff=false` iken Admin linki (masaüstü + mobil) render edilmiyor. Mümkünse gerçek bir test hesabıyla da doğrula.

- [ ] **Step 5: Sorun bulunursa düzelt ve commit et**

Herhangi bir görsel/işlevsel sorun bulunursa `src/components/Navigation.tsx` üzerinde düzelt, `npm run lint` ve `npm run build`'i tekrar çalıştır, sonra:

```bash
git add src/components/Navigation.tsx
git commit -m "$(cat <<'EOF'
Fix navigation grouping issues found in manual verification

Co-Authored-By: Claude Sonnet 5 <noreply@anthropic.com>
EOF
)"
```

Sorun bulunmazsa bu adımı atla — Task 1/Step 8'deki commit zaten yeterli.
