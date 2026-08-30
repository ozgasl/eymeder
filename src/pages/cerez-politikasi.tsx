import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

const LAST_UPDATED = "30 Ağustos 2026";

export default function CerezPolitikasiPage() {
  return (
    <>
      <SEO
        title="Çerez Politikası - Eyüboğlu Mezunlar Derneği"
        description="Eyüboğlu Eğitim Kurumları Mezunlar Derneği Çerez Politikası"
      />

      <div className="min-h-screen bg-background">
        <Navigation />

        <main className="container py-12">
          <Card className="max-w-4xl mx-auto">
            <CardContent className="p-8 md:p-12 space-y-8">
              <div>
                <h1 className="text-3xl md:text-4xl font-bold mb-2">Çerez Politikası</h1>
                <p className="text-sm text-muted-foreground">Son güncelleme: {LAST_UPDATED}</p>
              </div>

              <p className="text-muted-foreground leading-relaxed">
                Bu politika, Eyüboğlu Eğitim Kurumları Mezunlar Derneği'ne ait bu mezun ağı
                platformunda ("Platform") çerezlerin ve benzer teknolojilerin (yerel depolama /
                local storage gibi) hangi amaçlarla kullanıldığını açıklar. Aşağıda, Platform'un
                gerçekte kullandığı çerez ve benzer teknolojiler eksiksiz olarak listelenmiştir —
                bu listenin ötesinde bir çerez kullanılmamaktadır.
              </p>

              <section className="space-y-3">
                <h2 className="text-xl font-semibold">1. Çerez Nedir?</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Çerez (cookie), bir web sitesini ziyaret ettiğinizde tarayıcınıza kaydedilen
                  küçük bir metin dosyasıdır. Yerel depolama (local storage) da benzer bir amaca
                  hizmet eder; tarayıcınızda veri tutar ancak sunucuya otomatik olarak
                  gönderilmez. Bu politikada ikisi birlikte ele alınmıştır.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl font-semibold">2. Kullanılan Çerezler ve Benzer Teknolojiler</h2>
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Ad</TableHead>
                        <TableHead>Tür</TableHead>
                        <TableHead>Amaç</TableHead>
                        <TableHead>Süre</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      <TableRow>
                        <TableCell className="font-medium">sidebar_state</TableCell>
                        <TableCell>Çerez (zorunlu/fonksiyonel)</TableCell>
                        <TableCell>Kenar çubuğu (menü) açık/kapalı tercihinizi hatırlamak için</TableCell>
                        <TableCell>7 gün</TableCell>
                      </TableRow>
                      <TableRow>
                        <TableCell className="font-medium">Oturum bilgisi</TableCell>
                        <TableCell>Yerel depolama (zorunlu)</TableCell>
                        <TableCell>Giriş yapmış olduğunuzu hatırlamak ve oturumunuzu açık tutmak için — Supabase kimlik doğrulama altyapısı tarafından kullanılır</TableCell>
                        <TableCell>Oturum süresince / çıkış yapana kadar</TableCell>
                      </TableRow>
                    </TableBody>
                  </Table>
                </div>
                <p className="text-muted-foreground leading-relaxed text-sm">
                  Platform, reklam amaçlı, pazarlama amaçlı veya kullanım alışkanlıklarınızı takip
                  eden analitik çerezler (ör. Google Analytics) <strong className="text-foreground">kullanmamaktadır.</strong>
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl font-semibold">3. Üçüncü Taraf İçerikler</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Platform, kendi çerezlerine ek olarak aşağıdaki üçüncü taraf hizmetlere bağlanır.
                  Bu hizmetler kendi gizlilik/çerez politikaları kapsamında, Dernek'in
                  kontrolü dışında kendi teknik verilerini (ör. IP adresiniz) toplayabilir:
                </p>
                <ul className="list-disc list-inside text-muted-foreground leading-relaxed space-y-1.5 ml-2">
                  <li><strong className="text-foreground">Google Fonts:</strong> sayfada kullanılan yazı tiplerinin yüklenmesi için tarayıcınız Google'ın sunucularına bağlanır</li>
                  <li><strong className="text-foreground">Fonzip:</strong> Etkinlikler sayfasındaki bazı içerikler Fonzip platformundan gömülü (iframe) olarak gösterilir; bu alanı görüntülerken Fonzip'in kendi çerezleri geçerli olabilir</li>
                  <li><strong className="text-foreground">Teknik izleme betiği (softgen.ai):</strong> Platform'un düzgün çalışmasını ve olası hataların tespitini sağlayan bir arka plan betiği çalışır</li>
                </ul>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl font-semibold">4. Çerezleri Nasıl Yönetebilirsiniz?</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Kullanılan çerez ve yerel depolama verilerinin tamamı, Platform'un temel
                  işlevlerinin (oturum açık tutma, menü tercihi) çalışması için zorunludur; bu
                  nedenle Platform içinde ayrı bir çerez tercih paneli sunulmamaktadır. Yine de
                  tarayıcınızın ayarlarından mevcut çerezleri ve yerel depolama verilerini
                  istediğiniz zaman silebilir veya yeni çerezlerin kaydedilmesini
                  engelleyebilirsiniz. Bunu yaptığınızda Platform'a her ziyaretinizde yeniden
                  giriş yapmanız gerekebilir.
                </p>
              </section>

              <section className="space-y-3">
                <h2 className="text-xl font-semibold">5. Kişisel Verilerin Korunması</h2>
                <p className="text-muted-foreground leading-relaxed">
                  Çerezler aracılığıyla işlenen veriler de dahil olmak üzere kişisel verilerinizin
                  nasıl işlendiğine dair ayrıntılı bilgi için{" "}
                  <a href="/kvkk" className="text-primary hover:underline">KVKK Aydınlatma Metni'ni</a>{" "}
                  inceleyebilirsiniz.
                </p>
              </section>

              <p className="text-xs text-muted-foreground pt-4 border-t">
                Sorularınız için <a href="mailto:info@eymeder.com" className="text-primary hover:underline">info@eymeder.com</a> adresinden bize ulaşabilirsiniz.
              </p>
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  );
}
