import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { authService } from "@/services/authService";
import { eventService } from "@/services/eventService";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Calendar, MapPin, Users, Plus, ExternalLink, CalendarPlus, Download, LayoutGrid, CalendarRange } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { generateICSFile, downloadICS, getGoogleCalendarUrl, getOutlookUrl } from "@/lib/calendarUtils";

export default function EventsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [events, setEvents] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<"list" | "calendar">("list");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const currentUser = await authService.getCurrentUser();
    if (!currentUser) {
      router.push("/auth/login");
    } else {
      setUser(currentUser);
      loadEvents();
      setLoading(false);
    }
  };

  const loadEvents = async () => {
    const { data, error } = await eventService.getUpcomingEvents();
    if (!error && data) {
      setEvents(data);
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
      <SEO 
        title="Etkinlikler - Mezunlar Derneği"
        description="Yaklaşan mezun etkinlikleri"
      />
      
      <div className="min-h-screen bg-background">
        <Navigation />

        <main className="container py-8">
          <div className="max-w-7xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold mb-2">Etkinlikler</h1>
              <p className="text-muted-foreground">
                Mezunlar için düzenlenen etkinliklere göz atın
              </p>
            </div>

            {/* Create Event Button + View Toggle */}
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-3xl font-heading font-bold">Etkinlikler</h1>
                <p className="text-muted-foreground mt-1">Yaklaşan mezun buluşmaları ve etkinlikler</p>
              </div>
              <div className="flex items-center gap-3">
                {/* View Toggle */}
                <div className="flex items-center border rounded-lg p-1">
                  <Button
                    variant={viewMode === "list" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("list")}
                    className="gap-2"
                  >
                    <LayoutGrid className="h-4 w-4" />
                    Liste
                  </Button>
                  <Button
                    variant={viewMode === "calendar" ? "default" : "ghost"}
                    size="sm"
                    onClick={() => setViewMode("calendar")}
                    className="gap-2"
                  >
                    <CalendarRange className="h-4 w-4" />
                    Takvim
                  </Button>
                </div>

                <Button asChild>
                  <Link href="/events/create">
                    <Plus className="h-4 w-4 mr-2" />
                    Etkinlik Oluştur
                  </Link>
                </Button>
              </div>
            </div>

            {/* Fonzip Events Link - Smaller and below header */}
            <Card className="mb-6 border-purple-200 bg-purple-50/50">
              <CardContent className="py-4">
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="h-5 w-5 text-purple-600" />
                    <div>
                      <p className="font-medium text-sm">Dernek tarafından düzenlenen resmi etkinlikler</p>
                      <p className="text-xs text-muted-foreground">Fonzip üzerinden RSVP ve detaylı bilgi</p>
                    </div>
                  </div>
                  <Button asChild variant="outline" size="sm" className="shrink-0">
                    <a 
                      href="https://fonzip.com/eymeder/etkinlikler" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="gap-2"
                    >
                      Dernek Etkinlikleri
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {events.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Yaklaşan etkinlik bulunmuyor</p>
                  <Button asChild className="mt-4">
                    <Link href="/events/create">İlk Etkinliği Oluştur</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : viewMode === "calendar" ? (
              // Calendar View
              <div className="space-y-4">
                {Object.entries(
                  events.reduce((acc: any, event) => {
                    const month = new Date(event.event_date).toLocaleDateString("tr-TR", {
                      year: "numeric",
                      month: "long",
                    });
                    if (!acc[month]) acc[month] = [];
                    acc[month].push(event);
                    return acc;
                  }, {})
                ).map(([month, monthEvents]: [string, any]) => (
                  <Card key={month}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CalendarRange className="h-5 w-5" />
                        {month}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {monthEvents.map((event: any) => (
                        <div
                          key={event.id}
                          className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                        >
                          <div className="flex items-start gap-4 flex-1">
                            <div className="flex flex-col items-center justify-center bg-primary/10 rounded-lg p-3 min-w-[60px]">
                              <div className="text-2xl font-bold text-primary">
                                {new Date(event.event_date).getDate()}
                              </div>
                              <div className="text-xs text-muted-foreground uppercase">
                                {new Date(event.event_date).toLocaleDateString("tr-TR", {
                                  month: "short",
                                })}
                              </div>
                            </div>
                            <div className="flex-1">
                              <h4 className="font-semibold mb-1">{event.title}</h4>
                              <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                                <span className="flex items-center gap-1">
                                  <Calendar className="h-3 w-3" />
                                  {new Date(event.event_date).toLocaleTimeString("tr-TR", {
                                    hour: "2-digit",
                                    minute: "2-digit",
                                  })}
                                </span>
                                {event.location && (
                                  <span className="flex items-center gap-1">
                                    <MapPin className="h-3 w-3" />
                                    {event.location}
                                  </span>
                                )}
                                <span className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  {event.event_attendees?.[0]?.count || 0} katılımcı
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="outline" size="sm" className="gap-2">
                                  <CalendarPlus className="h-4 w-4" />
                                  Takvime Ekle
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem
                                  onClick={() => {
                                    const url = getGoogleCalendarUrl({
                                      title: event.title,
                                      description: event.description,
                                      location: event.location,
                                      date: new Date(event.event_date).toISOString().split("T")[0],
                                      time: new Date(event.event_date).toTimeString().split(" ")[0].slice(0, 5),
                                    });
                                    window.open(url, "_blank");
                                  }}
                                >
                                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z" />
                                  </svg>
                                  Google Calendar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    const icsContent = generateICSFile({
                                      title: event.title,
                                      description: event.description,
                                      location: event.location,
                                      date: new Date(event.event_date).toISOString().split("T")[0],
                                      time: new Date(event.event_date).toTimeString().split(" ")[0].slice(0, 5),
                                    });
                                    downloadICS(icsContent, `${event.title}.ics`);
                                  }}
                                >
                                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M19 3h-1V1h-2v2H8V1H6v2H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm0 16H5V8h14v11z" />
                                  </svg>
                                  Apple Calendar
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    const url = getOutlookUrl({
                                      title: event.title,
                                      description: event.description,
                                      location: event.location,
                                      date: new Date(event.event_date).toISOString().split("T")[0],
                                      time: new Date(event.event_date).toTimeString().split(" ")[0].slice(0, 5),
                                    });
                                    window.open(url, "_blank");
                                  }}
                                >
                                  <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M13 3v18c0 .55.45 1 1 1h7c.55 0 1-.45 1-1V8l-6-6h-3z" />
                                  </svg>
                                  Outlook
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={() => {
                                    const icsContent = generateICSFile({
                                      title: event.title,
                                      description: event.description,
                                      location: event.location,
                                      date: new Date(event.event_date).toISOString().split("T")[0],
                                      time: new Date(event.event_date).toTimeString().split(" ")[0].slice(0, 5),
                                    });
                                    downloadICS(icsContent, `${event.title}.ics`);
                                  }}
                                >
                                  <Download className="mr-2 h-4 w-4" />
                                  ICS Dosyası İndir
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                            <Button asChild size="sm">
                              <Link href={`/events/${event.id}`}>Detay</Link>
                            </Button>
                          </div>
                        </div>
                      ))}
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              // List View
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {events.map((event) => (
                  <Card key={event.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <CardTitle className="line-clamp-2">{event.title}</CardTitle>
                          <CardDescription className="flex items-center gap-1 mt-2">
                            <Calendar className="h-3 w-3" />
                            {new Date(event.event_date).toLocaleDateString("tr-TR", {
                              day: "numeric",
                              month: "long",
                              year: "numeric",
                              hour: "2-digit",
                              minute: "2-digit",
                            })}
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {event.description && (
                        <p className="text-sm text-muted-foreground line-clamp-3">
                          {event.description}
                        </p>
                      )}
                      
                      {event.location && (
                        <div className="flex items-center gap-2 text-sm">
                          <MapPin className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">{event.location}</span>
                        </div>
                      )}

                      <div className="flex items-center justify-between pt-2">
                        <div className="flex items-center gap-2 text-sm">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">
                            {event.event_attendees?.[0]?.count || 0} katılımcı
                          </span>
                        </div>
                        
                        {event.capacity && (
                          <Badge variant="outline">
                            Kapasite: {event.capacity}
                          </Badge>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="outline" size="sm" className="flex-1 gap-2">
                              <CalendarPlus className="h-4 w-4" />
                              Takvime Ekle
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start">
                            <DropdownMenuItem
                              onClick={() => {
                                const url = getGoogleCalendarUrl({
                                  title: event.title,
                                  description: event.description,
                                  location: event.location,
                                  date: new Date(event.event_date).toISOString().split("T")[0],
                                  time: new Date(event.event_date).toTimeString().split(" ")[0].slice(0, 5),
                                });
                                window.open(url, "_blank");
                              }}
                            >
                              Google Calendar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                const icsContent = generateICSFile({
                                  title: event.title,
                                  description: event.description,
                                  location: event.location,
                                  date: new Date(event.event_date).toISOString().split("T")[0],
                                  time: new Date(event.event_date).toTimeString().split(" ")[0].slice(0, 5),
                                });
                                downloadICS(icsContent, `${event.title}.ics`);
                              }}
                            >
                              Apple Calendar
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                const url = getOutlookUrl({
                                  title: event.title,
                                  description: event.description,
                                  location: event.location,
                                  date: new Date(event.event_date).toISOString().split("T")[0],
                                  time: new Date(event.event_date).toTimeString().split(" ")[0].slice(0, 5),
                                });
                                window.open(url, "_blank");
                              }}
                            >
                              Outlook
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => {
                                const icsContent = generateICSFile({
                                  title: event.title,
                                  description: event.description,
                                  location: event.location,
                                  date: new Date(event.event_date).toISOString().split("T")[0],
                                  time: new Date(event.event_date).toTimeString().split(" ")[0].slice(0, 5),
                                });
                                downloadICS(icsContent, `${event.title}.ics`);
                              }}
                            >
                              <Download className="mr-2 h-4 w-4" />
                              ICS Dosyası İndir
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>

                        <Button asChild className="flex-1">
                          <Link href={`/events/${event.id}`}>
                            Detayları Gör
                          </Link>
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}