# 🌐 Özel Domain Bağlama Rehberi

Bu rehber, Eyüboğlu Mezunlar Derneği projesine özel domain adı (örn: `eymeder.com`, `mezunlar.org`) bağlamak için adım adım talimatlar içerir.

---

## 📋 İÇİNDEKİLER

1. [Vercel ile Domain Bağlama](#vercel-ile-domain-bağlama) (Önerilen)
2. [Self-Hosted Sunucu ile Domain Bağlama](#self-hosted-sunucu-ile-domain-bağlama)
3. [DNS Ayarları](#dns-ayarları)
4. [SSL Sertifikası](#ssl-sertifikası)
5. [Sorun Giderme](#sorun-giderme)

---

## 🚀 VERCEL İLE DOMAIN BAĞLAMA (Önerilen)

### ✅ Avantajlar:
- Otomatik SSL sertifikası
- Global CDN
- 2 dakikada kurulum
- Ücretsiz (SSL + CDN dahil)
- Otomatik yenileme

---

### ADIM 1: Domain Satın Al

**Önerilen Sağlayıcılar:**
- **GoDaddy** (Türkiye'de popüler)
- **Namecheap** (Ucuz + kolay)
- **Google Domains** (Güvenilir)
- **Cloudflare** (En ucuz)

**Fiyatlar:**
- `.com` domain: $10-15/yıl
- `.org` domain: $12-18/yıl
- `.com.tr` domain: ₺50-100/yıl

---

### ADIM 2: Projeyi Vercel'e Deploy Et

Eğer henüz deploy etmediyseniz:

1. **GitHub'a Push:**
   - Softgen → Settings → GitHub
   - "Push to GitHub" butonuna bas
   - Repository oluştur: `eymeder`

2. **Vercel'e Import:**
   - https://vercel.com/new
   - "Import Git Repository" seç
   - GitHub repo'yu seç
   - **Environment Variables ekle:**
     ```
     NEXT_PUBLIC_SUPABASE_URL=https://kqaqktijdhbzijtwyfbe.supabase.co
     NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     ```
   - Deploy butonuna bas

3. **Vercel URL'ini Kaydet:**
   - Deploy sonrası: `https://eymeder.vercel.app`

---

### ADIM 3: Domain'i Vercel'e Bağla

#### **3.1. Vercel Dashboard'da:**

1. Project'e git: https://vercel.com/dashboard
2. Projeyi seç: `eymeder`
3. **Settings** → **Domains** sekmesine git
4. **"Add Domain"** butonuna tıkla
5. Domain adını yaz: `eymeder.com`
6. **"Add"** butonuna bas

#### **3.2. DNS Kayıtlarını Kopyala:**

Vercel sana 2 tür DNS kaydı verecek:

**SEÇENEK A: A Record (Önerilen)**
```
Type: A
Name: @
Value: 76.76.21.21
TTL: Auto
```

**SEÇENEK B: CNAME Record**
```
Type: CNAME
Name: @
Value: cname.vercel-dns.com
TTL: Auto
```

**WWW için (her iki seçenekte de):**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com
TTL: Auto
```

---

### ADIM 4: DNS Sağlayıcınızda Ayarları Yap

#### **GoDaddy Örneği:**

1. https://dcc.godaddy.com/manage/DNS adresine git
2. Domain'i seç
3. **DNS Management** → **Records** sekmesine git
4. Eski A kaydını sil (varsa)
5. **Add** butonuna tıkla
6. **A Record ekle:**
   - Type: `A`
   - Name: `@`
   - Value: `76.76.21.21`
   - TTL: `1 saat` (veya Auto)
7. **CNAME Record ekle (www için):**
   - Type: `CNAME`
   - Name: `www`
   - Value: `cname.vercel-dns.com`
   - TTL: `1 saat`
8. **Save** butonuna bas

#### **Namecheap Örneği:**

1. https://ap.www.namecheap.com/domains/list adresine git
2. Domain'i seç → **Manage** butonuna tıkla
3. **Advanced DNS** sekmesine git
4. **Add New Record:**
   - Type: `A Record`
   - Host: `@`
   - Value: `76.76.21.21`
   - TTL: `Automatic`
5. **Add New Record (www için):**
   - Type: `CNAME Record`
   - Host: `www`
   - Value: `cname.vercel-dns.com`
   - TTL: `Automatic`
6. **Save Changes**

#### **Cloudflare Örneği:**

1. Cloudflare Dashboard → DNS sekmesi
2. **Add record:**
   - Type: `A`
   - Name: `@`
   - IPv4 address: `76.76.21.21`
   - Proxy status: **Proxied** ✅ (Cloudflare CDN için)
3. **Add record (www için):**
   - Type: `CNAME`
   - Name: `www`
   - Target: `cname.vercel-dns.com`
   - Proxy status: **Proxied** ✅
4. **Save**

---

### ADIM 5: SSL Sertifikası (Otomatik!)

Vercel otomatik olarak **Let's Encrypt** SSL sertifikası oluşturur:

- ✅ 5-10 dakika içinde aktif olur
- ✅ Otomatik yenilenir (her 90 günde)
- ✅ HTTPS otomatik çalışır
- ✅ HTTP → HTTPS yönlendirme otomatik

**Kontrol:**
- https://eymeder.com → ✅ Güvenli
- http://eymeder.com → Otomatik https'e yönlendirilir

---

### ADIM 6: Supabase Redirect URL'leri Güncelle

**Çok Önemli!** Supabase'de authentication çalışması için:

1. **Supabase Dashboard'a git:** https://supabase.com/dashboard
2. Project'i seç: `eymeder`
3. **Settings** → **Authentication** → **URL Configuration**
4. **Site URL'i güncelle:**
   ```
   https://eymeder.com
   ```
5. **Redirect URLs ekle:**
   ```
   https://eymeder.com/**
   https://www.eymeder.com/**
   ```
6. **Save** butonuna bas

---

### ADIM 7: Test Et! 🎉

1. ✅ **Ana domain:** https://eymeder.com
2. ✅ **WWW:** https://www.eymeder.com
3. ✅ **Login:** Çalışıyor mu test et
4. ✅ **SSL:** Tarayıcıda kilit ikonu ✅
5. ✅ **Supabase:** Kayıt/giriş çalışıyor mu

---

## 🖥️ SELF-HOSTED SUNUCU İLE DOMAIN BAĞLAMA

### Gereksinimler:
- VPS (Ubuntu 22.04 önerilir)
- Root erişimi
- 2GB+ RAM
- Node.js 18+
- Nginx

---

### ADIM 1: VPS Kurulumu

```bash
# Sunucuya SSH ile bağlan
ssh root@your-server-ip

# Sistem güncellemeleri
sudo apt update && sudo apt upgrade -y

# Node.js 18
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt install -y nodejs

# Nginx
sudo apt install nginx -y

# Certbot (SSL için)
sudo apt install certbot python3-certbot-nginx -y

# PM2
npm install -g pm2
```

---

### ADIM 2: Projeyi Sunucuya Yükle

```bash
# Git kurulumu
sudo apt install git -y

# Projeyi klonla
cd /var/www
git clone https://github.com/your-username/eymeder.git
cd eymeder

# Dependencies
npm install

# Environment variables
nano .env.local
# NEXT_PUBLIC_SUPABASE_URL=...
# NEXT_PUBLIC_SUPABASE_ANON_KEY=...

# Build
npm run build

# PM2 ile başlat
pm2 start npm --name "eymeder" -- start
pm2 save
pm2 startup
```

---

### ADIM 3: Nginx Yapılandırması

```bash
# Nginx config dosyası oluştur
sudo nano /etc/nginx/sites-available/eymeder.com
```

**Config içeriği:**

```nginx
server {
    listen 80;
    server_name eymeder.com www.eymeder.com;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

**Aktif et:**

```bash
# Symlink oluştur
sudo ln -s /etc/nginx/sites-available/eymeder.com /etc/nginx/sites-enabled/

# Default config'i kaldır (opsiyonel)
sudo rm /etc/nginx/sites-enabled/default

# Nginx test
sudo nginx -t

# Nginx restart
sudo systemctl restart nginx
```

---

### ADIM 4: DNS Ayarları (A Record)

Domain sağlayıcınızda:

```
Type: A
Name: @
Value: YOUR_SERVER_IP (örn: 142.93.45.67)
TTL: 3600

Type: A
Name: www
Value: YOUR_SERVER_IP
TTL: 3600
```

**Propagation bekleme:** 5 dakika - 24 saat

**Kontrol:**
```bash
dig eymeder.com
# Sunucu IP'nizi görmeli
```

---

### ADIM 5: SSL Sertifikası (Let's Encrypt)

```bash
# Certbot ile SSL al
sudo certbot --nginx -d eymeder.com -d www.eymeder.com

# Email adresi gir
# Terms'i kabul et
# HTTPS redirect? → Yes

# Otomatik yenileme testi
sudo certbot renew --dry-run
```

**Nginx otomatik güncellenecek!**

---

### ADIM 6: Firewall Ayarları

```bash
# UFW aktif et
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

### ADIM 7: Test Et!

1. ✅ **HTTP:** http://eymeder.com → HTTPS'e yönlendirilmeli
2. ✅ **HTTPS:** https://eymeder.com → ✅ Çalışmalı
3. ✅ **WWW:** https://www.eymeder.com → ✅ Çalışmalı
4. ✅ **SSL:** Tarayıcıda kilit ikonu ✅

---

## 🔧 DNS AYARLARI DETAYLI

### DNS Record Tipleri:

#### **A Record (IPv4)**
```
Type: A
Name: @ (veya boş - root domain için)
Value: 76.76.21.21 (Vercel) veya YOUR_SERVER_IP (Self-hosted)
TTL: 3600 (1 saat)
```

#### **CNAME Record (Alias)**
```
Type: CNAME
Name: www
Value: cname.vercel-dns.com (Vercel) veya @ (Self-hosted)
TTL: 3600
```

#### **AAAA Record (IPv6 - Opsiyonel)**
```
Type: AAAA
Name: @
Value: 2606:4700:3033::ac43:bd5e (IPv6 adresi)
TTL: 3600
```

#### **MX Record (Email için - opsiyonel)**
```
Type: MX
Name: @
Value: mail.eymeder.com
Priority: 10
```

---

### DNS Propagation Kontrol:

```bash
# Terminal'de kontrol
dig eymeder.com
nslookup eymeder.com

# Online araçlar:
# https://dnschecker.org
# https://www.whatsmydns.net
```

**Bekleme süresi:** 5 dakika - 48 saat (genelde 1-2 saat)

---

## 🔒 SSL SERTİFİKASI

### Vercel (Otomatik):
- ✅ Let's Encrypt
- ✅ Otomatik yenileme
- ✅ Ücretsiz
- ✅ Wildcard destekli

### Self-Hosted (Certbot):
```bash
# Kurulum
sudo apt install certbot python3-certbot-nginx

# SSL al
sudo certbot --nginx -d eymeder.com -d www.eymeder.com

# Otomatik yenileme (cronjob)
sudo crontab -e
# 0 12 * * * /usr/bin/certbot renew --quiet
```

### Cloudflare (Opsiyonel):
- ✅ Ücretsiz SSL
- ✅ DDoS koruması
- ✅ CDN
- ✅ Kurulum: DNS kayıtlarını Proxied olarak ayarla

---

## 🐛 SORUN GİDERME

### 1. Domain Açılmıyor
**Olası Sebepler:**
- ✅ DNS propagation henüz tamamlanmadı → 24 saat bekle
- ✅ A kaydı yanlış → DNS ayarlarını kontrol et
- ✅ Nginx çalışmıyor (self-hosted) → `sudo systemctl status nginx`

**Kontrol:**
```bash
dig eymeder.com
ping eymeder.com
curl -I https://eymeder.com
```

---

### 2. SSL Hatası (Not Secure)
**Çözüm:**
- **Vercel:** 10 dakika bekle, otomatik aktif olur
- **Self-hosted:** `sudo certbot --nginx -d eymeder.com`

**Kontrol:**
```bash
openssl s_client -connect eymeder.com:443
```

---

### 3. Supabase Authentication Çalışmıyor
**Sebep:** Redirect URL'leri güncellenmemiş

**Çözüm:**
1. Supabase Dashboard → Settings → Authentication
2. Site URL: `https://eymeder.com`
3. Redirect URLs: `https://eymeder.com/**`
4. Save

---

### 4. "Too Many Redirects" Hatası
**Sebep:** Cloudflare Proxied + SSL Full mode

**Çözüm:**
- Cloudflare Dashboard → SSL/TLS → **Full (Strict)** seç

---

### 5. WWW Yönlendirme Çalışmıyor
**Çözüm:**
```nginx
# Nginx config'e ekle
server {
    listen 80;
    server_name www.eymeder.com;
    return 301 https://eymeder.com$request_uri;
}
```

---

## 📊 MALİYET KARŞILAŞTIRMA

### Vercel + Domain:
```
Domain: $12/yıl
Vercel: $0 (Hobby plan)
SSL: $0 (otomatik)
CDN: $0 (dahil)
──────────────
TOPLAM: $12/yıl ($1/ay)
```

### Self-Hosted + Domain:
```
Domain: $12/yıl
VPS: $12-48/ay (Hetzner - DigitalOcean)
SSL: $0 (Let's Encrypt)
CDN: $0 (Cloudflare ücretsiz)
──────────────
TOPLAM: $156-588/yıl ($13-49/ay)
```

---

## ✅ CHECKLIST

### Vercel Deployment:
- [ ] Projeyi Vercel'e deploy et
- [ ] Domain satın al
- [ ] Vercel'de domain ekle
- [ ] DNS kayıtlarını güncelle (A + CNAME)
- [ ] DNS propagation bekle (24 saat max)
- [ ] SSL aktif olana kadar bekle (10 dakika)
- [ ] Supabase redirect URL'leri güncelle
- [ ] Test: https://eymeder.com
- [ ] Test: Login/register çalışıyor mu

### Self-Hosted Deployment:
- [ ] VPS satın al ve kur
- [ ] Node.js + Nginx + PM2 yükle
- [ ] Projeyi sunucuya yükle
- [ ] Environment variables ayarla
- [ ] Build ve PM2 ile başlat
- [ ] Nginx config oluştur
- [ ] Domain'i DNS'e ekle (A record)
- [ ] SSL sertifikası al (Certbot)
- [ ] Firewall aktif et
- [ ] Supabase redirect URL'leri güncelle
- [ ] Test: https://eymeder.com
- [ ] Test: Login/register çalışıyor mu

---

## 📞 YARDIM

### Sorularınız için:
1. **Softgen Support:** support@softgen.ai
2. **Vercel Docs:** https://vercel.com/docs/custom-domains
3. **Let's Encrypt Docs:** https://letsencrypt.org/docs
4. **Nginx Docs:** https://nginx.org/en/docs

---

## 🎯 ÖNERİLEN YÖNTEM

**Mezun dernekleri için en uygun:**

✅ **Vercel + Özel Domain**
- Kolay kurulum (5 dakika)
- Otomatik SSL
- Global CDN
- Maliyet: $1/ay (sadece domain)
- Bakım yok
- Ölçeklenebilir

**Self-hosted sadece şu durumlarda:**
- Vercel'in olmadığı ülkelerde
- Çok özel güvenlik gereksinimleri
- 100,000+ kullanıcı

---

**Bu rehber domain bağlama için tüm bilgileri içeriyor. Sorularınız varsa destek alabilirsiniz!** 🚀