import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { supabase } from "@/integrations/supabase/client";
import { Upload, FileSpreadsheet, CheckCircle, XCircle, Loader2, Download } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function UploadMembersPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [results, setResults] = useState<any>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      if (selectedFile.name.endsWith(".csv") || selectedFile.name.endsWith(".xlsx")) {
        setFile(selectedFile);
      } else {
        toast({
          title: "Hata",
          description: "Sadece CSV veya Excel dosyaları yüklenebilir",
          variant: "destructive",
        });
      }
    }
  };

  const handleUpload = async () => {
    if (!file) {
      toast({ title: "Hata", description: "Lütfen bir dosya seçin", variant: "destructive" });
      return;
    }

    setLoading(true);
    setResults(null);

    try {
      const text = await file.text();
      const lines = text.split("\n").filter(line => line.trim());
      
      if (lines.length < 2) {
        toast({ title: "Hata", description: "Dosya boş veya hatalı", variant: "destructive" });
        setLoading(false);
        return;
      }

      // Parse CSV (expected format: full_name,email,membership_number)
      const data = lines.slice(1).map(line => {
        const parts = line.split(",").map(p => p.trim().replace(/['"]/g, ""));
        return {
          full_name: parts[0] || "",
          email: parts[1] || "",
          membership_number: parts[2] || "",
        };
      });

      console.log("Parsed data:", data);

      // Insert into membership_numbers table
      const { data: inserted, error } = await supabase
        .from("membership_numbers")
        .insert(data)
        .select();

      console.log("Insert result:", { inserted, error });

      if (error) {
        toast({ title: "Hata", description: error.message, variant: "destructive" });
        setResults({ success: 0, failed: data.length, error: error.message });
      } else {
        toast({ title: "Başarılı", description: `${inserted?.length || 0} mezun eklendi` });
        setResults({ success: inserted?.length || 0, failed: 0 });
        setFile(null);
      }
    } catch (err: any) {
      console.error("Upload error:", err);
      toast({ title: "Hata", description: err.message, variant: "destructive" });
      setResults({ success: 0, failed: 0, error: err.message });
    } finally {
      setLoading(false);
    }
  };

  const downloadTemplate = () => {
    const csv = "full_name,email,membership_number\nAhmet Yılmaz,ahmet@example.com,12345678\nAyşe Demir,ayse@example.com,87654321";
    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mezun_listesi_template.csv";
    a.click();
  };

  return (
    <>
      <Head>
        <SEO title="Mezun Listesi Yükle - Admin" />
      </Head>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container py-8">
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h1 className="text-4xl font-bold mb-2">Mezun Listesi Yükle</h1>
              <p className="text-muted-foreground">
                Excel veya CSV dosyasından toplu mezun ekleyin
              </p>
            </div>

            {/* Template Download */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-5 w-5" />
                  Şablon İndir
                </CardTitle>
                <CardDescription>
                  Önce şablon dosyasını indirin ve mezun bilgilerini doldurun
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button onClick={downloadTemplate} variant="outline" className="w-full">
                  <FileSpreadsheet className="h-4 w-4 mr-2" />
                  CSV Şablonu İndir
                </Button>
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <h4 className="font-semibold mb-2">Gerekli Sütunlar:</h4>
                  <ul className="text-sm space-y-1 list-disc list-inside">
                    <li><strong>full_name</strong> - Ad Soyad</li>
                    <li><strong>email</strong> - E-posta adresi</li>
                    <li><strong>membership_number</strong> - 8 haneli üyelik numarası</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* File Upload */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Dosya Yükle
                </CardTitle>
                <CardDescription>
                  CSV veya Excel dosyasını seçin ve yükleyin
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="file-upload">Dosya Seç (CSV veya Excel)</Label>
                  <Input
                    id="file-upload"
                    type="file"
                    accept=".csv,.xlsx"
                    onChange={handleFileChange}
                    disabled={loading}
                  />
                  {file && (
                    <p className="text-sm text-muted-foreground">
                      Seçili dosya: <strong>{file.name}</strong>
                    </p>
                  )}
                </div>

                <Button 
                  onClick={handleUpload} 
                  disabled={!file || loading}
                  className="w-full"
                >
                  {loading && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                  {loading ? "Yükleniyor..." : "Mezunları Ekle"}
                </Button>

                {results && (
                  <Alert className={results.success > 0 ? "border-green-200 bg-green-50" : "border-red-200 bg-red-50"}>
                    <AlertDescription>
                      <div className="flex items-start gap-3">
                        {results.success > 0 ? (
                          <CheckCircle className="h-5 w-5 text-green-600 mt-0.5" />
                        ) : (
                          <XCircle className="h-5 w-5 text-red-600 mt-0.5" />
                        )}
                        <div>
                          {results.success > 0 && (
                            <p className="font-semibold text-green-900">
                              ✅ {results.success} mezun başarıyla eklendi!
                            </p>
                          )}
                          {results.failed > 0 && (
                            <p className="font-semibold text-red-900">
                              ❌ {results.failed} kayıt eklenemedi
                            </p>
                          )}
                          {results.error && (
                            <p className="text-sm text-red-700 mt-1">Hata: {results.error}</p>
                          )}
                        </div>
                      </div>
                    </AlertDescription>
                  </Alert>
                )}
              </CardContent>
            </Card>

            {/* Instructions */}
            <Card className="bg-primary/5 border-primary/20">
              <CardContent className="pt-6">
                <h3 className="font-semibold mb-3">📋 Nasıl Çalışır?</h3>
                <ol className="text-sm space-y-2 list-decimal list-inside">
                  <li>Şablon CSV dosyasını indirin</li>
                  <li>Mezun bilgilerini (Ad Soyad, Email, Üyelik No) doldurun</li>
                  <li>Dosyayı kaydedin (CSV formatında)</li>
                  <li>Bu sayfadan yükleyin</li>
                  <li>Sistem mezunları database'e ekler</li>
                  <li>Mezunlar kayıt olurken email + üyelik no ile eşleştirilir</li>
                  <li>Eşleşme olursa kayıt tamamlanır ve otomatik QR kod atanır!</li>
                </ol>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </>
  );
}