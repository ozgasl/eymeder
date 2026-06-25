import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { jobService } from "@/services/jobService";
import { authService } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Briefcase, MapPin, Clock, Plus, Search } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export default function JobsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [jobs, setJobs] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [locationFilter, setLocationFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [experienceFilter, setExperienceFilter] = useState("all");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const currentUser = await authService.getCurrentUser();
    if (!currentUser) {
      router.push("/auth/login");
    } else {
      setUser(currentUser);
      loadJobs();
      setLoading(false);
    }
  };

  const loadJobs = async () => {
    const { data, error } = await jobService.getAllJobs();
    if (!error && data) {
      setJobs(data);
    }
  };

  const filteredJobs = jobs.filter((job) => {
    const matchesSearch = 
      job.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.company?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      job.description?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesLocation = locationFilter === "all" || !locationFilter || job.location === locationFilter;
    const matchesType = typeFilter === "all" || !typeFilter || job.job_type === typeFilter;
    const matchesExperience = experienceFilter === "all" || !experienceFilter || job.experience_level === experienceFilter;

    return matchesSearch && matchesLocation && matchesType && matchesExperience;
  });

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

  return (
    <>
      <SEO 
        title="İş İlanları - Mezunlar Derneği"
        description="Mezunlar için kariyer fırsatları"
      />
      
      <div className="min-h-screen bg-background">
        <Navigation />

        <main className="container py-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-heading font-bold">İş İlanları</h1>
              <Button asChild>
                <Link href="/jobs/create">
                  <Plus className="mr-2 h-4 w-4" />
                  İlan Ver
                </Link>
              </Button>
            </div>

            <div className="relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="İş ara (pozisyon, şirket, konum...)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="location-filter">Lokasyon</Label>
              <Select value={locationFilter} onValueChange={setLocationFilter}>
                <SelectTrigger id="location-filter">
                  <SelectValue placeholder="Tüm lokasyonlar" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="İstanbul">İstanbul</SelectItem>
                  <SelectItem value="Ankara">Ankara</SelectItem>
                  <SelectItem value="İzmir">İzmir</SelectItem>
                  <SelectItem value="Remote">Uzaktan</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="type-filter">Çalışma Tipi</Label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger id="type-filter">
                  <SelectValue placeholder="Tüm tipler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="full_time">Tam Zamanlı</SelectItem>
                  <SelectItem value="part_time">Yarı Zamanlı</SelectItem>
                  <SelectItem value="contract">Sözleşmeli</SelectItem>
                  <SelectItem value="internship">Staj</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience-filter">Deneyim Seviyesi</Label>
              <Select value={experienceFilter} onValueChange={setExperienceFilter}>
                <SelectTrigger id="experience-filter">
                  <SelectValue placeholder="Tüm seviyeler" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Tümü</SelectItem>
                  <SelectItem value="entry">Giriş Seviye</SelectItem>
                  <SelectItem value="mid">Orta Seviye</SelectItem>
                  <SelectItem value="senior">Kıdemli</SelectItem>
                  <SelectItem value="lead">Lider</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {filteredJobs.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Briefcase className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">
                    {searchQuery ? "Sonuç bulunamadı" : "Henüz iş ilanı yok"}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4">
                {filteredJobs.map((job) => (
                  <Card key={job.id} className="hover:shadow-lg transition-shadow">
                    <CardHeader>
                      <div className="flex items-start justify-between">
                        <div className="space-y-2 flex-1">
                          <Link href={`/jobs/${job.id}`}>
                            <CardTitle className="text-xl hover:text-primary transition-colors cursor-pointer">
                              {job.title}
                            </CardTitle>
                          </Link>
                          <CardDescription className="flex flex-wrap gap-3 text-sm">
                            <span className="font-medium">{job.company}</span>
                            {job.location && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                {job.location}
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {new Date(job.created_at).toLocaleDateString("tr-TR")}
                            </span>
                          </CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex flex-wrap gap-2 mb-4">
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
                      <p className="text-sm text-muted-foreground line-clamp-2">
                        {job.description}
                      </p>
                      <div className="mt-4 flex gap-3">
                        <Button asChild>
                          <Link href={`/jobs/${job.id}`}>Detayları Gör</Link>
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