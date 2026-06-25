import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useLanguage } from "@/contexts/LanguageContext";

export default function FonzipEventsPage() {
  const { t } = useLanguage();

  return (
    <>
      <SEO 
        title={t("fonzip.events.title")}
        description={t("fonzip.events.description")}
      />
      
      <div className="min-h-screen bg-background">
        <Navigation />

        <main className="container py-8">
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl">{t("fonzip.events.title")}</CardTitle>
                <CardDescription>
                  {t("fonzip.events.description")}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <iframe
                  src="https://fonzip.com/eymeder/etkinlikler"
                  className="w-full h-[800px] border-0 rounded-lg"
                  title="Etkinlikler"
                />
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </>
  );
}