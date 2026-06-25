import Head from "next/head";
import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, UserPlus, CreditCard, Heart, Info } from "lucide-react";

export default function FonzipSignupPage() {
  const links = [
    {
      title: "Neden Üye Olmalıyım?",
      description: "Mezunlar Derneği üyeliğinin avantajlarını keşfedin",
      url: "http://eymeder.com/neden-uye-olmaliyim",
      icon: Info,
      color: "bg-blue-500 hover:bg-blue-600",
    },
    {
      title: "Üyelik Başvuru Formu",
      description: "Hemen üyelik başvurunuzu yapın ve aramıza katılın",
      url: "https://fonzip.com/eymeder/form/uyelik-basvuru-formu",
      icon: UserPlus,
      color: "bg-green-500 hover:bg-green-600",
    },
    {
      title: "Aidat Öde",
      description: "Yıllık aidat ödemenizi kolayca gerçekleştirin",
      url: "https://fonzip.com/eymeder/odeme",
      icon: CreditCard,
      color: "bg-orange-500 hover:bg-orange-600",
    },
    {
      title: "Bağış Yap",
      description: "Derneğimize bağış yaparak faaliyetlerimize destek olun",
      url: "https://fonzip.com/eymeder/bagis-yap",
      icon: Heart,
      color: "bg-red-500 hover:bg-red-600",
    },
  ];

  return (
    <>
      <Head>
        <SEO title="Üyelik - Eyüboğlu Mezunlar Derneği" />
      </Head>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container py-8">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-12">
              <h1 className="text-4xl font-bold mb-4">Eyüboğlu Mezunlar Derneği Üyelik</h1>
              <p className="text-xl text-muted-foreground">
                Büyük Eyüboğlu ailesinin bir parçası olun
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {links.map((link) => {
                const Icon = link.icon;
                return (
                  <Card key={link.url} className="overflow-hidden hover:shadow-lg transition-shadow">
                    <CardHeader className={`${link.color} text-white`}>
                      <CardTitle className="flex items-center gap-3">
                        <Icon className="h-6 w-6" />
                        {link.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="pt-6">
                      <CardDescription className="text-base mb-4 text-foreground">
                        {link.description}
                      </CardDescription>
                      <Button
                        asChild
                        className={`w-full ${link.color} text-white border-0`}
                        size="lg"
                      >
                        <a
                          href={link.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center justify-center gap-2"
                        >
                          Devam Et
                          <ExternalLink className="h-4 w-4" />
                        </a>
                      </Button>
                    </CardContent>
                  </Card>
                );
              })}
            </div>

            <Card className="mt-8 bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <div className="bg-primary/10 p-3 rounded-full">
                    <Info className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold mb-2">Üyelik Hakkında Bilgi</h3>
                    <p className="text-sm text-muted-foreground">
                      Tüm işlemler güvenli Fonzip platformu üzerinden gerçekleştirilmektedir. 
                      Üyelik başvurunuz onaylandıktan sonra platforma giriş yapabileceksiniz.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </>
  );
}