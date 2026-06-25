import Head from "next/head";
import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Footer } from "@/components/Footer";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function YonetimKuruluPage() {
  const yonetimKurulu = [
    {
      title: "Yönetim Kurulu Başkanı",
      name: "Eyüboğlu Mezunlar Derneği",
      description: "Derneğimizin genel stratejisini belirler ve yönetir.",
    },
    {
      title: "Başkan Yardımcısı",
      name: "Dernek Yönetimi",
      description: "Başkana yardımcı olur ve organizasyonu destekler.",
    },
    {
      title: "Genel Sekreter",
      name: "Dernek Yönetimi",
      description: "İdari işleri yönetir ve kayıtları tutar.",
    },
    {
      title: "Sayman",
      name: "Dernek Yönetimi",
      description: "Mali işleri yönetir ve bütçeyi kontrol eder.",
    },
  ];

  return (
    <>
      <SEO 
        title="Yönetim Kurulu - Eyüboğlu Mezunlar Derneği"
        description="Eyüboğlu Mezunlar Derneği Yönetim Kurulu üyeleri"
      />
      
      <div className="min-h-screen flex flex-col bg-background">
        <Navigation />
        
        <main className="flex-1 container py-12">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl md:text-4xl font-bold mb-8 text-center">
              Yönetim Kurulu
            </h1>
            
            <div className="grid gap-6 md:grid-cols-2">
              {yonetimKurulu.map((member, index) => (
                <Card key={index}>
                  <CardHeader>
                    <CardTitle>{member.title}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="font-semibold mb-2">{member.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {member.description}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        </main>
        
        <Footer />
      </div>
    </>
  );
}