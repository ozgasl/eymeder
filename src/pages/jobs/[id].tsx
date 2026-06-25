import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { jobService } from "@/services/jobService";
import { authService } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Briefcase, MapPin, Clock, Building, Send } from "lucide-react";

export default function JobDetailPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { id } = router.query;
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [job, setJob] = useState<any>(null);
  const [applying, setApplying] = useState(false);
  const [coverLetter, setCoverLetter] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);

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
      loadJob();
    }
  };

  const loadJob = async () => {
    if (!id || typeof id !== "string") return;

    const { data, error } = await jobService.getJobById(id);
    if (!error && data) {
      setJob(data);
    }
    setLoading(false);
  };

  const handleApply = async () => {
    if (!id || typeof id !== "string") return;
    
    setApplying(true);

    const { error } = await jobService.applyToJob(id, {
      cover_letter: coverLetter || null,
    });

    if (error) {
      toast({
        title: "Hata",
        description: error.message.includes("duplicate") ? "Zaten başvurdunuz" : "Başvuru gönderilemedi",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Başarılı",
        description: "Başvurunuz gönderildi",
      });
      setDialogOpen(false);
      setCoverLetter("");
    }

    setApplying(false);
  };

  const getJobTypeBadge = (type: string) => {
    const variants: Record<string, string> = {
      full_time: "Tam Zamanlı",
      part_time: "Yarı Zamanlı",
      contract: "Sözleşmeli",
      internship: "Staj",
    };
    return variants[type] || type;
  };

  const getExperienceLabel = (level: string) => {
    const labels: Record<string, string> = {
      entry: "Giriş Seviye",
      mid: "Orta Seviye",
      senior: "Kıdemli",
      lead: "Lider",
    };
    return labels[level] || level;
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!job) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">İş ilanı bulunamadı</p>
              <Button asChild className="mt-4">
                <Link href="/jobs">İş İlanlarına Dön</Link>
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  return (
    <>
      <SEO 
        title={`${job.title} - ${job.company}`}
        description={job.description?.substring(0, 150)}
      />
      
      <div className="min-h-screen bg-background">
        <Navigation />

        <main className="container py-8">
          <div className="max-w-4xl mx-auto space-y-6">
            <Button variant="ghost" asChild>
              <Link href="/jobs">← İş İlanlarına Dön</Link>
            </Button>

            <Card>
              <CardHeader>
                <div className="flex items-start justify-between">
                  <div className="space-y-3 flex-1">
                    <div className="flex items-center gap-3">
                      <Briefcase className="h-6 w-6 text-primary" />
                      <CardTitle className="text-3xl font-heading">{job.title}</CardTitle>
                    </div>
                    <div className="flex flex-wrap gap-3 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        <span className="font-medium">{job.company}</span>
                      </div>
                      {job.location && (
                        <div className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          {job.location}
                        </div>
                      )}
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {new Date(job.created_at).toLocaleDateString("tr-TR")}
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-2">
                      {job.job_type && (
                        <Badge variant="secondary">
                          {getJobTypeBadge(job.job_type)}
                        </Badge>
                      )}
                      {job.experience_level && (
                        <Badge variant="outline">
                          {getExperienceLabel(job.experience_level)}
                        </Badge>
                      )}
                      {job.salary_range && (
                        <Badge variant="outline">{job.salary_range}</Badge>
                      )}
                    </div>
                  </div>
                </div>
              </CardHeader>

              <CardContent className="space-y-6">
                {job.poster && (
                  <div className="flex items-center gap-3 p-4 rounded-lg border bg-muted/30">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={job.poster.avatar_url} />
                      <AvatarFallback className="bg-primary text-primary-foreground">
                        {job.poster.full_name?.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="font-medium">{job.poster.full_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {job.poster.profession}
                        {job.poster.company && ` @ ${job.poster.company}`}
                      </p>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="font-semibold mb-2">İş Tanımı</h3>
                  <p className="text-muted-foreground whitespace-pre-wrap">{job.description}</p>
                </div>

                {job.requirements && (
                  <div>
                    <h3 className="font-semibold mb-2">Gereksinimler</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{job.requirements}</p>
                  </div>
                )}

                {job.benefits && (
                  <div>
                    <h3 className="font-semibold mb-2">Yan Haklar</h3>
                    <p className="text-muted-foreground whitespace-pre-wrap">{job.benefits}</p>
                  </div>
                )}

                <div className="flex gap-3 pt-4">
                  <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
                    <DialogTrigger asChild>
                      <Button className="gap-2">
                        <Send className="h-4 w-4" />
                        Başvur
                      </Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>İş Başvurusu</DialogTitle>
                        <DialogDescription>
                          {job.title} pozisyonuna başvuru yapıyorsunuz
                        </DialogDescription>
                      </DialogHeader>
                      <div className="space-y-4">
                        <div className="space-y-2">
                          <Label htmlFor="cover">Başvuru Mektubu (Opsiyonel)</Label>
                          <Textarea
                            id="cover"
                            placeholder="Neden bu pozisyon için uygun adaysınız?"
                            value={coverLetter}
                            onChange={(e) => setCoverLetter(e.target.value)}
                            rows={5}
                          />
                        </div>
                        <Button
                          onClick={handleApply}
                          disabled={applying}
                          className="w-full"
                        >
                          {applying && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                          Başvuruyu Gönder
                        </Button>
                      </div>
                    </DialogContent>
                  </Dialog>
                </div>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </>
  );
}