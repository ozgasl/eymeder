import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { newsService } from "@/services/newsService";
import { Newspaper, Eye, Calendar, User, Loader2, Plus } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

export default function NewsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState<any[]>([]);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const currentUser = await authService.getCurrentUser();
    if (!currentUser) {
      router.push("/auth/login");
    } else {
      setUser(currentUser);
      loadNews();
      setLoading(false);
    }
  };

  const loadNews = async () => {
    const { data, error } = await newsService.getAllNews();
    if (!error && data) {
      setNews(data);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <SEO title="Mezunlarımızdan Haberler" description="Eyüboğlu mezunlarından haberler" />
      </Head>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <Newspaper className="h-8 w-8" />
                Mezunlarımızdan Haberler
              </h1>
              <p className="text-muted-foreground">Eyüboğlu mezunlarının başarı hikayeleri ve haberler</p>
            </div>
            <Button onClick={() => router.push("/news/create")}>
              <Plus className="h-4 w-4 mr-2" />
              Haber Ekle
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {news.map((item) => (
              <Card key={item.id} className="overflow-hidden hover:shadow-lg transition-shadow cursor-pointer" onClick={() => router.push(`/news/${item.id}`)}>
                {item.cover_image_url && (
                  <div className="aspect-video bg-muted relative">
                    <img src={item.cover_image_url} alt={item.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <CardHeader>
                  <CardTitle className="line-clamp-2">{item.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-muted-foreground text-sm line-clamp-3 mb-4">
                    {item.content.substring(0, 150)}...
                  </p>
                  <div className="flex items-center justify-between text-sm text-muted-foreground">
                    <div className="flex items-center gap-2">
                      <Avatar className="h-6 w-6">
                        <AvatarImage src={item.profiles?.avatar_url} />
                        <AvatarFallback className="text-xs">{item.profiles?.full_name?.charAt(0)}</AvatarFallback>
                      </Avatar>
                      <span>{item.profiles?.full_name}</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {item.views_count || 0}
                      </span>
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(item.created_at), { addSuffix: true, locale: tr })}
                      </span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {news.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Newspaper className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Henüz haber yok</p>
                <Button className="mt-4" onClick={() => router.push("/news/create")}>
                  <Plus className="h-4 w-4 mr-2" />
                  İlk Haberi Ekle
                </Button>
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </>
  );
}