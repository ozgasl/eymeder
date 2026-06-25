import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { jobService } from "@/services/jobService";
import { authService } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Briefcase } from "lucide-react";

export default function CreateJobPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [creating, setCreating] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    authService.getCurrentUser().then((u) => {
      if (!u) router.push("/auth/login");
      else setUser(u);
    });
  }, [router]);

  const [title, setTitle] = useState("");
  const [company, setCompany] = useState("");
  const [location, setLocation] = useState("");
  const [jobType, setJobType] = useState("");
  const [experienceLevel, setExperienceLevel] = useState("");
  const [salaryRange, setSalaryRange] = useState("");
  const [description, setDescription] = useState("");
  const [requirements, setRequirements] = useState("");
  const [benefits, setBenefits] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setCreating(true);

    const { data, error } = await jobService.createJob({
      title,
      company,
      location: location || null,
      job_type: jobType || null,
      experience_level: experienceLevel || null,
      salary_range: salaryRange || null,
      description,
      requirements: requirements || null,
      benefits: benefits || null,
      posted_by: user.id,
    });

    if (error) {
      toast({
        title: "Hata",
        description: "İş ilanı oluşturulamadı",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Başarılı",
        description: "İş ilanı yayınlandı",
      });
      router.push(`/jobs/${data.id}`);
    }

    setCreating(false);
  };

  return (
    <>
      <SEO 
        title="İş İlanı Ver - Mezunlar Derneği"
        description="Yeni iş ilanı oluşturun"
      />
      
      <div className="min-h-screen bg-background">
        <Navigation />

        <main className="container py-8">
          <div className="max-w-3xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="text-2xl font-heading flex items-center gap-2">
                  <Briefcase className="h-6 w-6" />
                  Yeni İş İlanı Oluştur
                </CardTitle>
                <CardDescription>
                  Mezunlar için kariyer fırsatı paylaşın
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="title">Pozisyon Adı *</Label>
                    <Input
                      id="title"
                      placeholder="Örn: Senior Frontend Developer"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      required
                    />
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="company">Şirket *</Label>
                      <Input
                        id="company"
                        placeholder="Örn: ABC Teknoloji"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="location">Konum</Label>
                      <Input
                        id="location"
                        placeholder="Örn: İstanbul, Türkiye"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label htmlFor="job_type">Çalışma Şekli</Label>
                      <Select value={jobType} onValueChange={setJobType}>
                        <SelectTrigger id="job_type">
                          <SelectValue placeholder="Seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="full_time">Tam Zamanlı</SelectItem>
                          <SelectItem value="part_time">Yarı Zamanlı</SelectItem>
                          <SelectItem value="contract">Sözleşmeli</SelectItem>
                          <SelectItem value="internship">Staj</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="experience">Deneyim Seviyesi</Label>
                      <Select value={experienceLevel} onValueChange={setExperienceLevel}>
                        <SelectTrigger id="experience">
                          <SelectValue placeholder="Seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="entry">Giriş Seviye</SelectItem>
                          <SelectItem value="mid">Orta Seviye</SelectItem>
                          <SelectItem value="senior">Kıdemli</SelectItem>
                          <SelectItem value="lead">Lider</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="salary">Maaş Aralığı</Label>
                      <Input
                        id="salary"
                        placeholder="Örn: 50.000 - 70.000 TL"
                        value={salaryRange}
                        onChange={(e) => setSalaryRange(e.target.value)}
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">İş Tanımı *</Label>
                    <Textarea
                      id="description"
                      placeholder="Pozisyon hakkında detaylı bilgi..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={5}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="requirements">Gereksinimler</Label>
                    <Textarea
                      id="requirements"
                      placeholder="İşe alım gereksinimleri (her satıra bir madde)..."
                      value={requirements}
                      onChange={(e) => setRequirements(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="benefits">Yan Haklar</Label>
                    <Textarea
                      id="benefits"
                      placeholder="Sunulan yan haklar ve avantajlar..."
                      value={benefits}
                      onChange={(e) => setBenefits(e.target.value)}
                      rows={3}
                    />
                  </div>

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => router.back()}
                      className="flex-1"
                    >
                      İptal
                    </Button>
                    <Button
                      type="submit"
                      disabled={creating}
                      className="flex-1"
                    >
                      {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      İlanı Yayınla
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