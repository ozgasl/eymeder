import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { testimonialService } from "@/services/testimonialService";
import { Quote, Star, Loader2, Plus, Award } from "lucide-react";

export default function TestimonialsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [testimonials, setTestimonials] = useState<any[]>([]);
  const [myTestimonial, setMyTestimonial] = useState<any>(null);
  
  const [quote, setQuote] = useState("");
  const [achievement, setAchievement] = useState("");
  const [currentPosition, setCurrentPosition] = useState("");
  const [open, setOpen] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const currentUser = await authService.getCurrentUser();
    if (!currentUser) {
      router.push("/auth/login");
    } else {
      setUser(currentUser);
      loadTestimonials();
      loadMyTestimonial();
      setLoading(false);
    }
  };

  const loadTestimonials = async () => {
    const { data, error } = await testimonialService.getAllTestimonials();
    if (!error && data) {
      setTestimonials(data);
    }
  };

  const loadMyTestimonial = async () => {
    const { data, error } = await testimonialService.getMyTestimonial();
    if (!error && data) {
      setMyTestimonial(data);
      setQuote(data.quote || "");
      setAchievement(data.achievement || "");
      setCurrentPosition(data.current_position || "");
    }
  };

  const handleSubmit = async () => {
    if (!quote) {
      toast({
        title: "Hata",
        description: "Lütfen görüşünüzü yazın",
        variant: "destructive",
      });
      return;
    }

    setSubmitting(true);

    const { data, error } = await testimonialService.createTestimonial({
      quote,
      achievement,
      current_position: currentPosition,
    });

    if (error) {
      toast({
        title: "Hata",
        description: "Görüş gönderilemedi",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Başarılı",
        description: "Görüşünüz admin onayına gönderildi",
      });
      setOpen(false);
      loadMyTestimonial();
    }

    setSubmitting(false);
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
        <SEO title="Başarılı Mezunlarımız" description="Eyüboğlu mezunlarının başarı hikayeleri" />
      </Head>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container py-8">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold mb-2 flex items-center gap-2">
                <Award className="h-8 w-8" />
                Başarılı Mezunlarımızın Görüşleri
              </h1>
              <p className="text-muted-foreground">Eyüboğlu mezunlarının kariyer hikayeleri ve tavsiyeleri</p>
            </div>
            {!myTestimonial && (
              <Dialog open={open} onOpenChange={setOpen}>
                <DialogTrigger asChild>
                  <Button>
                    <Plus className="h-4 w-4 mr-2" />
                    Görüş Ekle
                  </Button>
                </DialogTrigger>
                <DialogContent className="max-w-2xl">
                  <DialogHeader>
                    <DialogTitle>Görüşünüzü Paylaşın</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="quote">Görüşünüz / Tavsiyeniz *</Label>
                      <Textarea
                        id="quote"
                        value={quote}
                        onChange={(e) => setQuote(e.target.value)}
                        placeholder="Eyüboğlu mezunu olmak bana..."
                        rows={4}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="achievement">Başarınız (opsiyonel)</Label>
                      <Input
                        id="achievement"
                        value={achievement}
                        onChange={(e) => setAchievement(e.target.value)}
                        placeholder="Örn: Fortune 500 şirketinde CTO"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="position">Mevcut Pozisyon (opsiyonel)</Label>
                      <Input
                        id="position"
                        value={currentPosition}
                        onChange={(e) => setCurrentPosition(e.target.value)}
                        placeholder="Örn: Google - Software Engineer"
                      />
                    </div>

                    <Button onClick={handleSubmit} disabled={submitting} className="w-full">
                      {submitting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Gönder (Admin Onayı Gerekir)
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            )}
          </div>

          {myTestimonial && !myTestimonial.approved && (
            <Card className="mb-6 border-amber-500">
              <CardContent className="p-4 flex items-center gap-3">
                <Quote className="h-5 w-5 text-amber-500" />
                <p className="text-sm">Görüşünüz admin onayı bekliyor.</p>
              </CardContent>
            </Card>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {testimonials.map((item) => (
              <Card key={item.id} className="relative overflow-hidden">
                <div className="absolute top-4 right-4">
                  <Quote className="h-12 w-12 text-primary/10" />
                </div>
                {item.featured && (
                  <div className="absolute top-4 left-4">
                    <Badge variant="default" className="gap-1">
                      <Star className="h-3 w-3 fill-current" />
                      Öne Çıkan
                    </Badge>
                  </div>
                )}
                <CardContent className="p-6 pt-8">
                  <p className="text-lg mb-6 italic leading-relaxed">"{item.quote}"</p>
                  
                  <div className="flex items-start gap-3 border-t pt-4">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={item.profiles?.avatar_url} />
                      <AvatarFallback>{item.profiles?.full_name?.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <div className="font-semibold">{item.profiles?.full_name}</div>
                      {item.current_position && (
                        <div className="text-sm text-muted-foreground">{item.current_position}</div>
                      )}
                      {item.achievement && (
                        <Badge variant="secondary" className="mt-2">
                          <Award className="h-3 w-3 mr-1" />
                          {item.achievement}
                        </Badge>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {testimonials.length === 0 && (
            <Card>
              <CardContent className="p-12 text-center">
                <Quote className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <p className="text-muted-foreground">Henüz görüş yok</p>
                {!myTestimonial && (
                  <Button className="mt-4" onClick={() => setOpen(true)}>
                    <Plus className="h-4 w-4 mr-2" />
                    İlk Görüşü Siz Ekleyin
                  </Button>
                )}
              </CardContent>
            </Card>
          )}
        </main>
      </div>
    </>
  );
}