import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { authService } from "@/services/authService";
import { newsService } from "@/services/newsService";
import { Loader2, Calendar, Eye, User, ArrowLeft } from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { tr } from "date-fns/locale";

export default function NewsDetailPage() {
  const router = useRouter();
  const { id } = router.query;
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [news, setNews] = useState<any>(null);

  useEffect(() => {
    checkAuth();
  }, []);

  useEffect(() => {
    if (id) {
      loadNews();
    }
  }, [id]);

  const checkAuth = async () => {
    const currentUser = await authService.getCurrentUser();
    if (!currentUser) {
      router.push("/auth/login");
    } else {
      setUser(currentUser);
      setLoading(false);
    }
  };

  const loadNews = async () => {
    const { data, error } = await newsService.getNewsById(id as string);
    if (!error && data) {
      setNews(data);
    }
  };

  if (loading || !news) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <SEO title={news.title} description={news.content.substring(0, 150)} />
      </Head>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container py-8">
          <Button variant="ghost" onClick={() => router.push("/news")} className="mb-6">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Haberlere Dön
          </Button>

          <div className="max-w-4xl mx-auto">
            <Card>
              {news.cover_image_url && (
                <div className="aspect-video bg-muted relative">
                  <img src={news.cover_image_url} alt={news.title} className="w-full h-full object-cover rounded-t-lg" />
                </div>
              )}
              <CardContent className="p-8">
                <h1 className="text-4xl font-bold mb-4">{news.title}</h1>
                
                <div className="flex items-center gap-4 mb-8 pb-6 border-b">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={news.profiles?.avatar_url} />
                    <AvatarFallback>{news.profiles?.full_name?.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="font-medium">{news.profiles?.full_name}</div>
                    <div className="text-sm text-muted-foreground flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {formatDistanceToNow(new Date(news.created_at), { addSuffix: true, locale: tr })}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-3 w-3" />
                        {news.views_count || 0} görüntüleme
                      </span>
                    </div>
                  </div>
                </div>

                <div className="prose prose-lg max-w-none">
                  {news.content.split('\n').map((paragraph: string, i: number) => (
                    <p key={i} className="mb-4 text-foreground leading-relaxed">
                      {paragraph}
                    </p>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </>
  );
}