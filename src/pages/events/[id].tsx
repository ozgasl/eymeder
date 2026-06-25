import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { eventService } from "@/services/eventService";
import { authService } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar, MapPin, Users, Check, X, HelpCircle } from "lucide-react";

export default function EventDetailPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { id } = router.query;
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<any>(null);
  const [userRSVP, setUserRSVP] = useState<any>(null);
  const [rsvpLoading, setRsvpLoading] = useState(false);

  useEffect(() => {
    if (id) {
      checkAuth();
    }
  }, [id]);

  const checkAuth = async () => {
    const currentUser = await authService.getCurrentUser();
    if (!currentUser) {
      router.push("/auth/login");
    } else {
      setUser(currentUser);
      loadEvent();
    }
  };

  const loadEvent = async () => {
    if (!id || typeof id !== "string") return;

    const { data, error } = await eventService.getEventById(id);
    if (!error && data) {
      setEvent(data);
      loadUserRSVP(id);
    }
    setLoading(false);
  };

  const loadUserRSVP = async (eventId: string) => {
    const { data } = await eventService.getUserRSVP(eventId);
    setUserRSVP(data);
  };

  const handleRSVP = async (status: "attending" | "maybe" | "not_attending") => {
    if (!id || typeof id !== "string") return;
    
    setRsvpLoading(true);

    const { error } = await eventService.rsvpToEvent(id, status);

    if (error) {
      toast({
        title: "Hata",
        description: "RSVP kaydedilemedi",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Başarılı",
        description: "Katılım durumunuz güncellendi",
      });
      loadEvent();
    }

    setRsvpLoading(false);
  };

  const handleRemoveRSVP = async () => {
    if (!id || typeof id !== "string") return;
    
    setRsvpLoading(true);

    const { error } = await eventService.removeRSVP(id);

    if (error) {
      toast({
        title: "Hata",
        description: "RSVP iptal edilemedi",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Başarılı",
        description: "Katılım durumunuz iptal edildi",
      });
      loadEvent();
    }

    setRsvpLoading(false);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Etkinlik bulunamadı</p>
              <Button asChild className="mt-4">
                <Link href="/events">Etkinliklere Dön</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const attendees = event.event_attendees || [];
  const attendingCount = attendees.filter((a: any) => a.status === "attending").length;

  return (
    <>
      <SEO 
        title={`${event.title} - Mezunlar Derneği`}
        description={event.description || "Etkinlik detayları"}
      />
      
      <div className="min-h-screen bg-background">
        <Navigation />

        <main className="container py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <Button variant="ghost" asChild>
              <Link href="/events">← Etkinliklere Dön</Link>
            </Button>

            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <CardTitle className="text-3xl font-heading">{event.title}</CardTitle>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {new Date(event.event_date).toLocaleDateString("tr-TR", {
                          day: "numeric",
                          month: "long",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </div>
                      {event.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {event.location}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Users className="h-4 w-4" />
                        {attendingCount} katılımcı
                        {event.capacity && ` / ${event.capacity}`}
                      </div>
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {event.description && (
                  <div>
                    <h3 className="font-semibold mb-2">Açıklama</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{event.description}</p>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-3">Katılım Durumunuz</h3>
                  {userRSVP ? (
                    <div className="flex items-center gap-3">
                      <Badge 
                        variant={userRSVP.status === "attending" ? "default" : "secondary"}
                        className="gap-1"
                      >
                        {userRSVP.status === "attending" && <Check className="h-3 w-3" />}
                        {userRSVP.status === "maybe" && <HelpCircle className="h-3 w-3" />}
                        {userRSVP.status === "not_attending" && <X className="h-3 w-3" />}
                        {userRSVP.status === "attending" && "Katılacağım"}
                        {userRSVP.status === "maybe" && "Belki"}
                        {userRSVP.status === "not_attending" && "Katılamıyorum"}
                      </Badge>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={handleRemoveRSVP}
                        disabled={rsvpLoading}
                      >
                        İptal Et
                      </Button>
                    </div>
                  ) : (
                    <div className="flex gap-3">
                      <Button
                        onClick={() => handleRSVP("attending")}
                        disabled={rsvpLoading}
                        className="gap-2"
                      >
                        <Check className="h-4 w-4" />
                        Katılacağım
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => handleRSVP("maybe")}
                        disabled={rsvpLoading}
                        className="gap-2"
                      >
                        <HelpCircle className="h-4 w-4" />
                        Belki
                      </Button>
                      <Button
                        variant="ghost"
                        onClick={() => handleRSVP("not_attending")}
                        disabled={rsvpLoading}
                        className="gap-2"
                      >
                        <X className="h-4 w-4" />
                        Katılamıyorum
                      </Button>
                    </div>
                  )}
                </div>

                {attendees.length > 0 && (
                  <div>
                    <h3 className="font-semibold mb-3">
                      Katılımcılar ({attendingCount})
                    </h3>
                    <div className="grid gap-3 sm:grid-cols-2">
                      {attendees
                        .filter((a: any) => a.status === "attending")
                        .map((attendee: any) => (
                          <div
                            key={attendee.id}
                            className="flex items-center gap-3 p-3 rounded-lg border"
                          >
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={attendee.user?.avatar_url} />
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {attendee.user?.full_name?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div>
                              <p className="font-medium">{attendee.user?.full_name}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </>
  );
}