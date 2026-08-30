import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";

const LAST_UPDATED = "30 Ağustos 2026";

export default function KvkkPage() {
  return (
    <>
      <SEO
        title="KVKK Aydınlatma Metni - Eyüboğlu Mezunlar Derneği"
        description="Eyüboğlu Eğitim Kurumları Mezunlar Derneği KVKK Aydınlatma Metni"
      />

      <div className="min-h-screen bg-background">
        <Navigation />

        <main className="container py-12">
          <Card className="max-w-4xl mx-auto">
            <CardContent className="p-8 md:p-12 space-y-8">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">KVKK Aydınlatma Metni</h1>
                <p className="text-sm text-muted-foreground">Son güncelleme: {LAST_UPDATED}</p>
              </div>

              <p className="text-muted-foreground leading-relaxed">
                Eyüboğlu Eğitim Kurumları Mezunlar Derneği ("Dernek", "biz") olarak, 6698 sayılı
                Kişisel Verilerin Korunması Kanunu ("KVKK") uyarınca veri sorumlusu sıfatıyla,
                bu mezun ağı platformu ("Platform") üzerinden elde ettiğimiz kişisel verilerinizin
                işlenmesine ilişkin sizi bilgilendirmek isteriz.
              </p>

              <section className="space-y-3">
                <h2 className="text-xl font-semibold">1. Veri Sorumlusunun Kimliği</h2>
                <div className="text-muted-foreground leading-relaxed space-y-1">
                  <p><strong className="text-foreground">Veri Sorumlusu:</strong> Eyüboğlu Eğitim Kurumları Mezunlar Derneği</p>
                  <p><strong className="text-foreground">Adres:</strong> Esenevler Mahallesi Dr. Rüstem Eyüboğlu Sokak No:8, Ümraniye / İstanbul</p>
                  <p><strong className="text-foreground">E-posta:</strong> <a href="mailto:info@eymeder.com" className="text-primary hover:underline">info@eymeder.com</a></p>
                  <p><strong className="text-foreground">Telefon:</strong> <a href="tel:+905403963337" className="text-primary hover:underline">+90 540 396 33 37</a></p>
                </div>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl font-semibold">2. İşlenen Kişisel Veri Kategorileri</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Platform'a kayıt olduğunuzda ve kullanmaya devam ettiğinizde aşağıdaki kişisel
                  veri kategorileri işlenmektedir:
                </p>
                <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-1.5 ml-2">
                  <li><strong className="text-foreground">Kimlik bilgileri:</strong> ad soyad</li>
                  <li><strong className="text-foreground">İletişim bilgileri:</strong> e-posta adresi, telefon numarası</li>
                  <li><strong className="text-foreground">Eğitim/mezuniyet bilgileri:</strong> mezuniyet yılı, okul numarası, üniversite, bölüm, üniversite durumu</li>
                  <li><strong className="text-foreground">Mesleki bilgiler:</strong> meslek, çalıştığınız şirket</li>
                  <li><strong className="text-foreground">Lokasyon bilgileri:</strong> şehir, ülke</li>
                  <li><strong className="text-foreground">Üyelik bilgileri:</strong> aidat/üyelik durumu (Fonzip üyelik platformu üzerinden doğrulanır)</li>
                  <li><strong className="text-foreground">İşlem güvenliği bilgileri:</strong> şifrenizin ve e-posta doğrulama kodunuzun geri döndürülemez (hash'lenmiş) hâli — bunlar hiçbir zaman okunabilir metin olarak saklanmaz</li>
                  <li><strong className="text-foreground">Kullanıcı tarafından paylaşılan içerikler:</strong> profil fotoğrafı, biyografi, sosyal medya bağlantıları (LinkedIn, Twitter/X, Instagram, Facebook), galeriye yüklenen fotoğraf/video, haber, iş ilanı, grup gönderisi, mesajlaşma içeriği, başarı hikayesi, mentorluk talebi mesajı</li>
                  <li><strong className="text-foreground">Sipariş ve teslimat bilgileri:</strong> Mezun Store üzerinden alışveriş yaptığınızda teslimat adresi, şehir, posta kodu, telefon numarası ve seçtiğiniz ödeme yöntemi (banka havalesi veya Iyzico üzerinden kart ile ödeme — kart bilgileriniz Dernek sistemlerinde tutulmaz, doğrudan ödeme kuruluşu tarafından işlenir)</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl font-semibold">3. Kişisel Verilerin İşlenme Amaçları</h2>
                <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-1.5 ml-2">
                  <li>Üyelik hesabınızın oluşturulması ve kimlik doğrulamanızın yapılması</li>
                  <li>Mezuniyet yılı ve okul numaranız üzerinden aidat/üyelik durumunuzun Fonzip platformu aracılığıyla doğrulanması ve buna göre üyelik tipinizin (dernek üyesi / mezun üye) belirlenmesi</li>
                  <li>Mezunlar arası iletişim, mentorluk eşleştirmesi ve networking imkanlarının sunulması</li>
                  <li>Etkinlik, haber, iş ilanı ve grup gibi Platform içeriklerinin sizinle ve diğer mezunlarla paylaşılması</li>
                  <li>Mezun Store üzerinden verdiğiniz siparişlerin alınması, teslimatının yapılması ve ödeme sürecinin yürütülmesi</li>
                  <li>Platform güvenliğinin sağlanması, kötüye kullanımın önlenmesi</li>
                  <li>Dernek tüzüğünden ve ilgili mevzuattan doğan yükümlülüklerin yerine getirilmesi</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl font-semibold">4. Kişisel Verilerin Aktarılabileceği Taraflar</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Kişisel verileriniz, yukarıda belirtilen amaçlarla sınırlı olarak ve gerekli
                  güvenlik önlemleri alınarak aşağıdaki taraflarla paylaşılabilir:
                </p>
                <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-1.5 ml-2">
                  <li><strong className="text-foreground">Supabase:</strong> Platform'un veritabanı ve kimlik doğrulama altyapısını sağlayan teknoloji sağlayıcısı</li>
                  <li><strong className="text-foreground">Vercel:</strong> Platform'un barındırıldığı (hosting) sunucu sağlayıcısı</li>
                  <li><strong className="text-foreground">Fonzip:</strong> Derneğin aidat/üyelik yönetim platformu — üyelik durumunuzun doğrulanması amacıyla mezuniyet yılı ve okul numaranızdan türetilen üyelik numarası sorgulanır</li>
                  <li><strong className="text-foreground">Iyzico:</strong> Mezun Store üzerinden kart ile ödeme tercih ettiğinizde ödeme işlemini gerçekleştiren ödeme kuruluşu</li>
                  <li><strong className="text-foreground">Google (Gmail SMTP):</strong> Hesap doğrulama ve şifre sıfırlama kodlarının e-posta yoluyla gönderilmesi amacıyla</li>
                  <li>Yetkili kamu kurum ve kuruluşları — yalnızca yasal bir yükümlülüğün yerine getirilmesi gerektiği hâllerde</li>
                </ul>
                <p className="text-muted-foreground leading-relaxed">
                  Bu hizmet sağlayıcılardan bir kısmının sunucuları yurt dışında bulunabilir. Bu
                  durumda veriler, KVKK'nın yurt dışına veri aktarımına ilişkin hükümlerine uygun
                  şekilde aktarılır.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl font-semibold">5. Kişisel Veri Toplamanın Yöntemi ve Hukuki Sebebi</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Kişisel verileriniz, Platform'a kayıt olurken, profilinizi düzenlerken, Platform
                  içindeki özellikleri (mesajlaşma, galeri, etkinlik, iş ilanı, mağaza vb.)
                  kullanırken doğrudan sizin tarafınızdan, elektronik ortamda toplanmaktadır.
                  Verileriniz; bir sözleşmenin (üyelik/hizmet ilişkisi) kurulması veya ifası,
                  hukuki yükümlülüklerimizin yerine getirilmesi, temel hak ve özgürlüklerinize
                  zarar vermemek kaydıyla meşru menfaatlerimiz ve açık rızanızın bulunduğu
                  hâllerde açık rızanız hukuki sebeplerine dayanılarak işlenmektedir.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl font-semibold">6. KVKK Kapsamındaki Haklarınız</h2>
                <p className="text-muted-foreground leading-relaxed">
                  KVKK'nın 11. maddesi uyarınca Dernek'e başvurarak aşağıdaki haklarınızı
                  kullanabilirsiniz:
                </p>
                <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-1.5 ml-2">
                  <li>Kişisel verilerinizin işlenip işlenmediğini öğrenme</li>
                  <li>İşlenmişse buna ilişkin bilgi talep etme</li>
                  <li>İşlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme</li>
                  <li>Yurt içinde/yurt dışında aktarıldığı üçüncü kişileri bilme</li>
                  <li>Eksik veya yanlış işlenmişse düzeltilmesini isteme</li>
                  <li>KVKK'da öngörülen şartlar çerçevesinde silinmesini veya yok edilmesini isteme</li>
                  <li>Düzeltme, silme ve yok edilme taleplerinizin aktarıldığı üçüncü kişilere bildirilmesini isteme</li>
                  <li>İşlenen verilerin münhasıran otomatik sistemler ile analiz edilmesi sonucunda aleyhinize bir sonuç doğmasına itiraz etme</li>
                  <li>Kanuna aykırı işlenmesi sebebiyle zarara uğramanız hâlinde zararın giderilmesini talep etme</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl font-semibold">7. Başvuru Yöntemi</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Yukarıdaki haklarınıza ilişkin taleplerinizi, kimliğinizi tespit edici gerekli
                  bilgiler ile birlikte{" "}
                  <a href="mailto:info@eymeder.com" className="text-primary hover:underline">info@eymeder.com</a>{" "}
                  adresine e-posta göndererek veya yukarıda belirtilen adrese yazılı olarak
                  başvurarak iletebilirsiniz. Talepleriniz, niteliğine göre en kısa sürede ve en
                  geç 30 gün içinde yanıtlanır.
                </p>
              </section>

              <p className="text-xs text-muted-foreground pt-4 border-t">
                Bu metin, Platform'un mevcut işlevlerine göre hazırlanmış genel bir bilgilendirme
                metnidir; hukuki bağlayıcılığı Dernek'in yürüteceği KVKK uyum sürecine göre
                güncellenebilir.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  );
}
