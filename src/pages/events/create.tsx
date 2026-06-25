import { useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { eventService } from "@/services/eventService";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, MapPin, Users, Loader2 } from "lucide-react";

export default function CreateEventPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  // Separate state for each field
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("");
  const [location, setLocation] = useState("");
  const [maxAttendees, setMaxAttendees] = useState<number | null>(null);
  const [imageUrl, setImageUrl] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    console.log("=== FORM SUBMIT ===");
    console.log("Title:", title);
    console.log("Description:", description);
    console.log("Date:", date);
    console.log("Time:", time);
    console.log("Location:", location);
    console.log("Max Attendees:", maxAttendees);
    console.log("Image URL:", imageUrl);

    // Validation
    if (!title.trim()) {
      toast({
        title: "Hata",
        description: "Etkinlik başlığı gerekli",
        variant: "destructive",
      });
      return;
    }

    if (!date) {
      toast({
        title: "Hata",
        description: "Tarih gerekli",
        variant: "destructive",
      });
      return;
    }

    if (!location.trim()) {
      toast({
        title: "Hata",
        description: "Konum gerekli",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Check auth
      const { data: { user }, error: authError } = await supabase.auth.getUser();
      console.log("Auth:", { userId: user?.id, authError });

      if (!user) {
        toast({
          title: "Hata",
          description: "Giriş yapmanız gerekiyor",
          variant: "destructive",
        });
        setLoading(false);
        router.push("/auth/login");
        return;
      }

      // Build event data
      const eventData = {
        title: title.trim(),
        description: description.trim() || null,
        date: date,
        time: time || null,
        location: location.trim(),
        max_attendees: maxAttendees,
        image_url: imageUrl.trim() || null,
        organizer_id: user.id,
      };

      console.log("Event data to send:", eventData);

      // Create event
      const { data, error } = await eventService.createEvent(eventData);

      console.log("Service response:", { data, error });

      if (error) {
        console.error("Create error:", error);
        toast({
          title: "Hata",
          description: error.message || "Etkinlik oluşturulamadı",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      console.log("SUCCESS! Event created:", data);

      toast({
        title: "Başarılı!",
        description: "Etkinlik oluşturuldu",
      });

      // Redirect
      setTimeout(() => {
        router.push("/events");
      }, 500);

    } catch (err: any) {
      console.error("Catch error:", err);
      toast({
        title: "Hata",
        description: err.message || "Beklenmeyen bir hata oluştu",
        variant: "destructive",
      });
      setLoading(false);
    }
  };

  return (
    <>
      <Head>
        <SEO title="Yeni Etkinlik Oluştur" />
      </Head>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container py-8">
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  Yeni Etkinlik Oluştur
                </CardTitle>
                <CardDescription>
                  Mezunlar için yeni bir etkinlik düzenleyin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  {/* Title */}
                  <div className="space-y-2">
                    <Label htmlFor="title">Etkinlik Başlığı *</Label>
                    <Input
                      id="title"
                      placeholder="Örn: Mezunlar Buluşması 2026"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      disabled={loading}
                      required
                    />
                  </div>

                  {/* Description */}
                  <div className="space-y-2">
                    <Label htmlFor="description">Açıklama</Label>
                    <Textarea
                      id="description"
                      placeholder="Etkinlik hakkında detaylı bilgi..."
                      rows={4}
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  {/* Date and Time */}
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="date">Tarih *</Label>
                      <Input
                        id="date"
                        type="date"
                        value={date}
                        onChange={(e) => {
                          console.log("Date changed:", e.target.value);
                          setDate(e.target.value);
                        }}
                        disabled={loading}
                        required
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="time">Saat</Label>
                      <Input
                        id="time"
                        type="time"
                        value={time}
                        onChange={(e) => {
                          console.log("Time changed:", e.target.value);
                          setTime(e.target.value);
                        }}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Location */}
                  <div className="space-y-2">
                    <Label htmlFor="location">Konum *</Label>
                    <div className="relative">
                      <MapPin className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="location"
                        placeholder="Örn: İstanbul, Beşiktaş"
                        className="pl-10"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        disabled={loading}
                        required
                      />
                    </div>
                  </div>

                  {/* Max Attendees */}
                  <div className="space-y-2">
                    <Label htmlFor="maxAttendees">Maksimum Katılımcı Sayısı</Label>
                    <div className="relative">
                      <Users className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                      <Input
                        id="maxAttendees"
                        type="number"
                        min="1"
                        placeholder="Örn: 50"
                        className="pl-10"
                        value={maxAttendees || ""}
                        onChange={(e) => setMaxAttendees(e.target.value ? parseInt(e.target.value) : null)}
                        disabled={loading}
                      />
                    </div>
                  </div>

                  {/* Image URL */}
                  <div className="space-y-2">
                    <Label htmlFor="imageUrl">Etkinlik Görseli URL (Opsiyonel)</Label>
                    <Input
                      id="imageUrl"
                      type="url"
                      placeholder="https://example.com/image.jpg"
                      value={imageUrl}
                      onChange={(e) => setImageUrl(e.target.value)}
                      disabled={loading}
                    />
                  </div>

                  {/* Buttons */}
                  <div className="flex gap-4">
                    <Button type="submit" disabled={loading} className="flex-1">
                      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      {loading ? "Oluşturuluyor..." : "Etkinlik Oluştur"}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.push("/events")}
                      disabled={loading}
                    >
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