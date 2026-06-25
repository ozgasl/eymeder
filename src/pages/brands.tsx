import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { brandService } from "@/services/brandService";
import { qrCodeService } from "@/services/qrCodeService";
import { ExternalLink, Tag, QrCode, Loader2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

export default function BrandsPage() {
  const router = useRouter();
  const [brands, setBrands] = useState<any[]>([]);
  const [myQR, setMyQR] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showQR, setShowQR] = useState(false);

  useEffect(() => {
    loadBrands();
    loadMyQR();
  }, []);

  const loadBrands = async () => {
    const { data } = await brandService.getBrands();
    if (data) setBrands(data);
    setLoading(false);
  };

  const loadMyQR = async () => {
    const { data } = await qrCodeService.getMyQRCode();
    if (data) setMyQR(data);
  };

  const categoryColors: Record<string, string> = {
    "Yeme-İçme": "bg-orange-100 text-orange-800 border-orange-200",
    "Giyim": "bg-purple-100 text-purple-800 border-purple-200",
    "Teknoloji": "bg-blue-100 text-blue-800 border-blue-200",
    "Sağlık": "bg-green-100 text-green-800 border-green-200",
    "Eğitim": "bg-yellow-100 text-yellow-800 border-yellow-200",
    "Diğer": "bg-gray-100 text-gray-800 border-gray-200",
  };

  if (loading) {
    return (
      <>
        <Head>
          <SEO title="İndirimli Markalar - Eyüboğlu Mezunlar Derneği" />
        </Head>
        <div className="min-h-screen bg-background">
          <Navigation />
          <main className="container py-8">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <SEO title="İndirimli Markalar - Eyüboğlu Mezunlar Derneği" />
      </Head>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container py-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <div className="flex items-center justify-between flex-wrap gap-4">
                <div>
                  <h1 className="text-4xl font-bold mb-2">İndirimli Markalar</h1>
                  <p className="text-muted-foreground">
                    Eyüboğlu mezunlarına özel indirimler ve avantajlar
                  </p>
                </div>
                {myQR && (
                  <Button onClick={() => setShowQR(true)} size="lg" className="gap-2">
                    <QrCode className="h-5 w-5" />
                    QR Kodumu Göster
                  </Button>
                )}
              </div>
            </div>

            {/* Info Card */}
            {myQR && (
              <Card className="mb-8 bg-gradient-to-r from-primary/10 via-accent/10 to-primary/10 border-primary/20">
                <CardContent className="pt-6">
                  <div className="flex items-start gap-4">
                    <div className="bg-primary/10 p-3 rounded-full">
                      <Tag className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-2">Nasıl İndirim Alırım?</h3>
                      <p className="text-sm text-muted-foreground mb-2">
                        QR kodunuzu anlaşmalı markalarda göstererek özel indirimlerinizden yararlanın.
                      </p>
                      <p className="text-xs text-muted-foreground">
                        <strong>QR Kodunuz:</strong> {myQR.qr_code}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Brands Grid */}
            {brands.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Tag className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="font-semibold mb-2">Henüz Anlaşmalı Marka Yok</h3>
                  <p className="text-sm text-muted-foreground">
                    Yakında mezunlarımıza özel indirimler eklenecek!
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {brands.map((brand) => (
                  <Card key={brand.id} className="hover:shadow-lg transition-all duration-300 overflow-hidden group">
                    {/* Brand Logo */}
                    {brand.logo_url && (
                      <div className="h-48 bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center p-6">
                        <img
                          src={brand.logo_url}
                          alt={brand.name}
                          className="max-h-full max-w-full object-contain"
                        />
                      </div>
                    )}
                    
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-xl">{brand.name}</CardTitle>
                        {brand.category && (
                          <Badge
                            variant="outline"
                            className={categoryColors[brand.category] || categoryColors["Diğer"]}
                          >
                            {brand.category}
                          </Badge>
                        )}
                      </div>
                      {brand.description && (
                        <CardDescription>{brand.description}</CardDescription>
                      )}
                    </CardHeader>

                    <CardContent className="space-y-4">
                      {/* Discount Info */}
                      <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-start gap-2">
                          <Tag className="h-5 w-5 text-green-600 mt-0.5" />
                          <div>
                            <p className="font-semibold text-green-900 text-sm mb-1">
                              Mezun İndirimi
                            </p>
                            <p className="text-sm text-green-700">
                              {brand.discount_info}
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Website Link */}
                      {brand.website_url && (
                        <Button
                          variant="outline"
                          className="w-full gap-2"
                          asChild
                        >
                          <a
                            href={brand.website_url}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            Web Sitesine Git
                            <ExternalLink className="h-4 w-4" />
                          </a>
                        </Button>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>

        {/* QR Code Dialog */}
        {myQR && (
          <Dialog open={showQR} onOpenChange={setShowQR}>
            <DialogContent className="sm:max-w-md">
              <DialogHeader>
                <DialogTitle>QR Kodunuz</DialogTitle>
                <DialogDescription>
                  Bu kodu anlaşmalı markalarda göstererek indirim alın
                </DialogDescription>
              </DialogHeader>
              <div className="flex flex-col items-center gap-4 py-4">
                {/* QR Code Display */}
                <div className="bg-white p-6 rounded-lg border-4 border-primary">
                  <div className="text-center space-y-4">
                    <QrCode className="h-32 w-32 mx-auto text-primary" />
                    <div>
                      <p className="font-mono text-2xl font-bold text-primary">
                        {myQR.qr_code}
                      </p>
                      <p className="text-xs text-muted-foreground mt-2">
                        Eyüboğlu Mezunlar Derneği Üye QR Kodu
                      </p>
                    </div>
                  </div>
                </div>
                <p className="text-sm text-center text-muted-foreground">
                  QR kodunuzu screenshot alarak kaydedebilir veya mağazalarda telefonunuzdan gösterebilirsiniz.
                </p>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </>
  );
}