import { useEffect, useState, type ReactNode } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { mentorshipService } from "@/services/mentorshipService";
import { useAccessControl } from "@/hooks/useAccessControl";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Mail, Phone, Linkedin, Twitter, Instagram, Facebook, MapPin, Copy } from "lucide-react";
import { getSocialHandle } from "@/lib/socialLinks";

export default function MentorshipPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { loading: accessLoading, user, isDernekUyesi } = useAccessControl();
  const [dataLoading, setDataLoading] = useState(true);
  const [mentors, setMentors] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    if (!accessLoading && user) {
      Promise.all([loadMentors(), loadRequests()]).then(() => setDataLoading(false));
    }
  }, [accessLoading, user]);

  const loadMentors = async () => {
    const { data, error } = await mentorshipService.getMentors();
    if (!error && data) {
      setMentors(data);
    }
  };

  const loadRequests = async () => {
    const { data, error } = await mentorshipService.getMyRequests();
    if (!error && data) {
      setRequests(data);
    }
  };

  const handleRequestMentorship = async (mentorId: string) => {
    if (!message.trim()) return;
    setRequesting(true);

    const { error } = await mentorshipService.requestMentorship(mentorId, message);
    if (error) {
      toast({ title: "Hata", description: "Talep gönderilemedi", variant: "destructive" });
    } else {
      toast({ title: "Başarılı", description: "Mentorluk talebi gönderildi" });
      setMessage("");
      await loadRequests();
    }
    setRequesting(false);
  };

  const handleUpdateStatus = async (requestId: string, status: "accepted" | "rejected" | "completed") => {
    const { error } = await mentorshipService.updateRequestStatus(requestId, status);
    if (error) {
      toast({ title: "Hata", description: "Durum güncellenemedi", variant: "destructive" });
    } else {
      toast({ title: "Başarılı", description: "Durum güncellendi" });
      await loadRequests();
    }
  };

  const copyToClipboard = async (value: string, label: string) => {
    try {
      await navigator.clipboard.writeText(value);
      toast({ title: "Kopyalandı", description: `${label} panoya kopyalandı.` });
    } catch {
      toast({ title: "Kopyalanamadı", description: "Elle kopyalayabilirsiniz.", variant: "destructive" });
    }
  };

  const renderContactRow = (icon: ReactNode, label: string, display: string, copyValue: string) => (
    <button
      type="button"
      onClick={() => copyToClipboard(copyValue, label)}
      className="flex w-full items-center gap-2 rounded-sm p-1 text-left text-sm hover:bg-muted focus:outline-none focus:ring-2 focus:ring-primary"
    >
      {icon}
      <span className="truncate">{display}</span>
      <Copy className="ml-auto h-3.5 w-3.5 flex-shrink-0 text-muted-foreground" aria-hidden="true" />
    </button>
  );

  // A person as embedded on a mentorship_requests row (member_profiles fields,
  // masked per the viewer's own tier just like everywhere else that view is used).
  const renderMatchedProfile = (person: any, subtitle: string) => (
    <Dialog>
      <DialogTrigger asChild>
        <button
          type="button"
          className="flex items-center gap-4 rounded-md border-0 bg-transparent p-0 text-left focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2"
          aria-label={`${person.full_name} profilini görüntüle`}
        >
          <Avatar className="h-12 w-12">
            <AvatarImage src={person.avatar_url} />
            <AvatarFallback>{person.full_name?.charAt(0)}</AvatarFallback>
          </Avatar>
          <div>
            <h3 className="font-medium">{person.full_name}</h3>
            <p className="text-sm text-muted-foreground">{subtitle}</p>
          </div>
        </button>
      </DialogTrigger>
      <DialogContent role="dialog" aria-labelledby={`mentorship-profile-title-${person.id}`}>
        <DialogHeader>
          <DialogTitle id={`mentorship-profile-title-${person.id}`}>Üye Profili</DialogTitle>
          <DialogDescription>{person.full_name} isimli üyenin profil bilgileri.</DialogDescription>
        </DialogHeader>
        <div className="flex flex-col items-center gap-4 py-4">
          <Avatar className="h-24 w-24">
            <AvatarImage src={person.avatar_url} alt={`${person.full_name} profil resmi`} />
            <AvatarFallback className="bg-primary text-2xl text-primary-foreground">
              {person.full_name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <div className="space-y-1 text-center">
            <h2 className="text-xl font-bold">{person.full_name}</h2>
            <p className="text-muted-foreground">{subtitle}</p>
            {(person.city || person.country) && (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                <MapPin className="h-4 w-4" aria-hidden="true" />
                {person.city}{person.country && `, ${person.country}`}
              </div>
            )}
          </div>

          {person.bio && (
            <blockquote className="w-full rounded-lg bg-muted/50 p-4 text-center text-sm italic">"{person.bio}"</blockquote>
          )}

          {(person.email || person.phone || person.linkedin_url || person.twitter_url || person.instagram_url || person.facebook_url) && (
            <div className="w-full space-y-1 border-t pt-4">
              <h4 className="mb-2 text-sm font-medium">İletişim & Sosyal Medya</h4>
              {person.email && renderContactRow(<Mail className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />, "E-posta", person.email, person.email)}
              {person.phone && renderContactRow(<Phone className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />, "Telefon", person.phone, person.phone)}
              {person.linkedin_url && renderContactRow(<Linkedin className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />, "LinkedIn bağlantısı", `@${getSocialHandle(person.linkedin_url)}`, person.linkedin_url)}
              {person.twitter_url && renderContactRow(<Twitter className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />, "Twitter bağlantısı", `@${getSocialHandle(person.twitter_url)}`, person.twitter_url)}
              {person.instagram_url && renderContactRow(<Instagram className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />, "Instagram bağlantısı", `@${getSocialHandle(person.instagram_url)}`, person.instagram_url)}
              {person.facebook_url && renderContactRow(<Facebook className="h-4 w-4 flex-shrink-0 text-muted-foreground" aria-hidden="true" />, "Facebook bağlantısı", `@${getSocialHandle(person.facebook_url)}`, person.facebook_url)}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );

  if (accessLoading || dataLoading) {
    return <div className="min-h-screen flex items-center justify-center"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>;
  }

  const myMentors = requests.filter(r => r.mentee_id === user?.id);
  const myMentees = requests.filter(r => r.mentor_id === user?.id);

  return (
    <>
      <SEO title="Mentorluk - Mezunlar Derneği" description="Mentor/mentee eşleştirme sistemi" />
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container py-8">
          <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
            <div>
              <h1 className="text-3xl font-heading font-bold">Mentorluk Ağı</h1>
              <p className="text-muted-foreground mt-2">Deneyimli mezunlardan rehberlik alın veya tecrübelerinizi paylaşın</p>
            </div>
            <Button onClick={() => router.push("/profile")} variant="outline">Mentor Profilimi Düzenle</Button>
          </div>

          <Tabs defaultValue="find-mentor" className="space-y-6">
            <TabsList>
              <TabsTrigger value="find-mentor">Mentor Bul</TabsTrigger>
              <TabsTrigger value="my-mentors">Mentorlarım ({myMentors.length})</TabsTrigger>
              <TabsTrigger value="my-mentees">Menteelerim ({myMentees.length})</TabsTrigger>
            </TabsList>

            <TabsContent value="find-mentor" className="space-y-4">
              {mentors.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">Henüz mentor bulunmuyor.</CardContent></Card>
              ) : (
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                  {mentors.filter(m => m.id !== user?.id).map((mentor) => (
                    <Card key={mentor.id}>
                      <CardHeader className="text-center">
                        <Avatar className="h-20 w-20 mx-auto mb-4">
                          <AvatarImage src={mentor.avatar_url} />
                          <AvatarFallback className="text-xl bg-primary text-primary-foreground">{mentor.full_name?.charAt(0).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <CardTitle>{mentor.full_name}</CardTitle>
                        <CardDescription>{mentor.profession} at {mentor.company}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground line-clamp-3">{mentor.mentor_bio || "Biyografi eklenmemiş."}</p>
                        {mentor.mentorship_areas && mentor.mentorship_areas.length > 0 && (
                          <div className="flex flex-wrap gap-2">
                            {mentor.mentorship_areas.map((area: string, i: number) => (
                              <Badge key={i} variant="secondary" className="text-xs">{area}</Badge>
                            ))}
                          </div>
                        )}
                        {isDernekUyesi ? (
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button className="w-full">Mentorluk Talep Et</Button>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Mentorluk Talebi</DialogTitle>
                                <DialogDescription>{mentor.full_name} isimli mezunumuza mentorluk talebi gönderiyorsunuz.</DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 pt-4">
                                <Textarea placeholder="Neden bu mentordan destek almak istiyorsunuz? Hedefleriniz neler?" value={message} onChange={(e) => setMessage(e.target.value)} rows={4} />
                                <Button className="w-full" onClick={() => handleRequestMentorship(mentor.id)} disabled={requesting || !message.trim()}>
                                  {requesting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                                  Talebi Gönder
                                </Button>
                              </div>
                            </DialogContent>
                          </Dialog>
                        ) : (
                          <Button className="w-full" variant="outline" asChild>
                            <a href="https://fonzip.com/eymeder/odeme" target="_blank" rel="noopener noreferrer">
                              Aidat Öde, Mentorluk Talep Et
                            </a>
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="my-mentors" className="space-y-4">
              {myMentors.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">Henüz mentorluk talebiniz bulunmuyor.</CardContent></Card>
              ) : (
                <div className="grid gap-4">
                  {myMentors.map((request) => (
                    <Card key={request.id}>
                      <CardContent className="flex items-center justify-between p-6">
                        {request.status === "accepted" && request.mentor ? (
                          renderMatchedProfile(request.mentor, `${request.mentor.profession || ""}${request.mentor.company ? ` at ${request.mentor.company}` : ""}`)
                        ) : (
                          <div className="flex items-center gap-4">
                            <Avatar className="h-12 w-12">
                              <AvatarImage src={request.mentor?.avatar_url} />
                              <AvatarFallback>{request.mentor?.full_name?.charAt(0)}</AvatarFallback>
                            </Avatar>
                            <div>
                              <h3 className="font-medium">{request.mentor?.full_name}</h3>
                            </div>
                          </div>
                        )}
                        <p className="text-sm text-muted-foreground">Durum: <Badge variant={request.status === 'accepted' ? 'default' : request.status === 'rejected' ? 'destructive' : 'secondary'}>{request.status}</Badge></p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="my-mentees" className="space-y-4">
              {myMentees.length === 0 ? (
                <Card><CardContent className="py-12 text-center text-muted-foreground">Henüz mentee talebiniz bulunmuyor.</CardContent></Card>
              ) : (
                <div className="grid gap-4">
                  {myMentees.map((request) => (
                    <Card key={request.id}>
                      <CardContent className="p-6 space-y-4">
                        <div className="flex items-center justify-between">
                          {request.status === "accepted" && request.mentee ? (
                            renderMatchedProfile(request.mentee, `${request.mentee.department || ""}${request.mentee.graduation_year ? ` - ${request.mentee.graduation_year}` : ""}`)
                          ) : (
                            <div className="flex items-center gap-4">
                              <Avatar className="h-12 w-12">
                                <AvatarImage src={request.mentee?.avatar_url} />
                                <AvatarFallback>{request.mentee?.full_name?.charAt(0)}</AvatarFallback>
                              </Avatar>
                              <div>
                                <h3 className="font-medium">{request.mentee?.full_name}</h3>
                                <p className="text-sm text-muted-foreground">{request.mentee?.department} - {request.mentee?.graduation_year}</p>
                              </div>
                            </div>
                          )}
                          <Badge variant={request.status === 'accepted' ? 'default' : request.status === 'rejected' ? 'destructive' : 'secondary'}>{request.status}</Badge>
                        </div>
                        <div className="bg-muted p-4 rounded-md text-sm">
                          <p className="font-medium mb-1">Talep Mesajı:</p>
                          <p>{request.message}</p>
                        </div>
                        {request.status === "pending" && (
                          <div className="flex gap-2">
                            <Button className="flex-1" variant="default" onClick={() => handleUpdateStatus(request.id, "accepted")}>Kabul Et</Button>
                            <Button className="flex-1" variant="destructive" onClick={() => handleUpdateStatus(request.id, "rejected")}>Reddet</Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </main>
      </div>
    </>
  );
}