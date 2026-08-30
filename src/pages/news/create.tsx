import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { newsService } from "@/services/newsService";
import { useAccessControl } from "@/hooks/useAccessControl";
import { AccessRestricted } from "@/components/AccessRestricted";
import { Loader2, Newspaper } from "lucide-react";

export default function CreateNewsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { loading, isStaff } = useAccessControl();
  const [creating, setCreating] = useState(false);

  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [coverImage, setCoverImage] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title || !content) {
      toast({
        title: "Hata",
        description: "Lütfen başlık ve içerik girin",
        variant: "destructive",
      });
      return;
    }

    setCreating(true);

    const { data, error } = await newsService.createNews({
      title,
      content,
      cover_image_url: coverImage || undefined,
    });

    if (error) {
      toast({
        title: "Hata",
        description: "Haber oluşturulamadı",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Başarılı",
        description: "Haber yayınlandı",
      });
      router.push("/news");
    }

    setCreating(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!isStaff) {
    return (
      <>
        <Head>
          <SEO title="Haber Ekle" />
        </Head>
        <div className="min-h-screen bg-background">
          <Navigation />
          <AccessRestricted variant="staff" featureName="Haber paylaşımı" />
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <SEO title="Haber Ekle" />
      </Head>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Newspaper className="h-6 w-6" />
                  Yeni Haber Ekle
                </CardTitle>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="title">Başlık *</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Haber başlığı"
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="cover">Kapak Görseli URL (opsiyonel)</Label>
                    <Input
                      id="cover"
                      type="url"
                      value={coverImage}
                      onChange={(e) => setCoverImage(e.target.value)}
                      placeholder="https://example.com/image.jpg"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="content">İçerik *</Label>
                    <Textarea
                      id="content"
                      value={content}
                      onChange={(e) => setContent(e.target.value)}
                      placeholder="Haber içeriği..."
                      rows={12}
                      required
                    />
                  </div>

                  <div className="flex gap-2">
                    <Button type="submit" disabled={creating} className="flex-1">
                      {creating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Yayınla
                    </Button>
                    <Button type="button" variant="outline" onClick={() => router.push("/news")}>
                      İptal
                    </Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </>
  );
}