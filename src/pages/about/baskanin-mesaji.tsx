import Head from "next/head";
import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent } from "@/components/ui/card";

export default function BaskaninMesajiPage() {
  return (
    <>
      <SEO 
        title="Başkanın Mesajı - Eyüboğlu Mezunlar Derneği"
        description="Eyüboğlu Mezunlar Derneği Başkanının mesajı"
      />
      
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        
        <main className="flex-1 container py-12">
          <Card className="max-w-4xl mx-auto">
            <CardContent className="p-8 md:p-12">
              <h1 className="text-3xl md:text-4xl font-bold mb-6 text-center">
                Başkanın Mesajı
              </h1>
              
              <div className="prose prose-lg max-w-none space-y-6">
                <p className="text-lg leading-relaxed">
                  Değerli Eyüboğlu Mezunları,
                </p>
                
                <p className="text-muted-foreground leading-relaxed">
                  Eyüboğlu Eğitim Kurumları Mezunlar Derneği olarak, sizleri bir araya getirmek ve 
                  aramızdaki bağları güçlendirmek için çalışıyoruz. Bu platform, mezunlarımızın 
                  birbirleriyle iletişim kurabilecekleri, deneyimlerini paylaşabilecekleri ve 
                  profesyonel ağlarını genişletebilecekleri bir alan oluşturmak amacıyla kuruldu.
                </p>
                
                <p className="text-muted-foreground leading-relaxed">
                  Eyüboğlu ailesinin bir parçası olmak, sadece öğrencilik yıllarıyla sınırlı değildir. 
                  Mezuniyetten sonra da bu bağ devam eder ve güçlenir. Derneğimiz, bu bağı 
                  sürdürmek ve geliştirmek için çeşitli etkinlikler, kariyer fırsatları ve 
                  networking olanakları sunmaktadır.
                </p>
                
                <p className="text-muted-foreground leading-relaxed">
                  Sizleri, bu özel topluluğun aktif bir üyesi olmaya ve birlikte daha güçlü 
                  bir mezunlar ağı oluşturmaya davet ediyoruz. Her biriniz, Eyüboğlu ailesinin 
                  değerli bir üyesisiniz ve başarılarınız hepimizi gururlandırıyor.
                </p>
                
                <p className="text-lg leading-relaxed mt-8">
                  Saygılarımla,
                </p>
                
                <div className="mt-6">
                  <p className="font-semibold">Eyüboğlu Mezunlar Derneği</p>
                  <p className="text-muted-foreground">Yönetim Kurulu Başkanı</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </main>
        
        <Footer />
      </div>
    </>
  );
}