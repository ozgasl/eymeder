import { useEffect, useState } from "react";
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
import { authService } from "@/services/authService";
import { mentorshipService } from "@/services/mentorshipService";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function MentorshipPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [mentors, setMentors] = useState<any[]>([]);
  const [requests, setRequests] = useState<any[]>([]);
  const [message, setMessage] = useState("");
  const [requesting, setRequesting] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const currentUser = await authService.getCurrentUser();
    if (!currentUser) {
      router.push("/auth/login");
    } else {
      setUser(currentUser);
      await Promise.all([loadMentors(), loadRequests()]);
      setLoading(false);
    }
  };

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

  if (loading) {
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
                        <div className="flex items-center gap-4">
                          <Avatar className="h-12 w-12">
                            <AvatarImage src={request.mentor?.avatar_url} />
                            <AvatarFallback>{request.mentor?.full_name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <div>
                            <h3 className="font-medium">{request.mentor?.full_name}</h3>
                            <p className="text-sm text-muted-foreground">Durum: <Badge variant={request.status === 'accepted' ? 'default' : request.status === 'rejected' ? 'destructive' : 'secondary'}>{request.status}</Badge></p>
                          </div>
                        </div>
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