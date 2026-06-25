import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { authService } from "@/services/authService";
import { profileService } from "@/services/profileService";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Briefcase, GraduationCap, MapPin, Phone, Globe, Linkedin, Twitter, Instagram, Facebook, X } from "lucide-react";

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [highSchoolGraduationYear, setHighSchoolGraduationYear] = useState("");
  const [department, setDepartment] = useState("");
  const [university, setUniversity] = useState("");
  const [universityStatus, setUniversityStatus] = useState("");
  const [universityGraduationYear, setUniversityGraduationYear] = useState("");
  const [profession, setProfession] = useState("");
  const [company, setCompany] = useState("");
  const [country, setCountry] = useState("");
  const [city, setCity] = useState("");
  const [phone, setPhone] = useState("");
  const [linkedinUrl, setLinkedinUrl] = useState("");
  const [twitterUrl, setTwitterUrl] = useState("");
  const [instagramUrl, setInstagramUrl] = useState("");
  const [facebookUrl, setFacebookUrl] = useState("");
  const [isMentor, setIsMentor] = useState(false);
  const [mentorBio, setMentorBio] = useState("");
  const [mentorshipAreas, setMentorshipAreas] = useState<string[]>([]);
  const [newArea, setNewArea] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const currentUser = await authService.getCurrentUser();
    if (!currentUser) {
      router.push("/auth/login");
    } else {
      setUser(currentUser);
      await loadProfile(currentUser);
      setLoading(false);
    }
  };

  const loadProfile = async (currentUser: any) => {
    const { data, error } = await profileService.getMyProfile();
    if (!error && data) {
      setFullName(data.full_name || "");
      setBio(data.bio || "");
      setAvatarUrl(data.avatar_url || "");
      setGraduationYear(data.graduation_year?.toString() || "");
      setHighSchoolGraduationYear(data.high_school_graduation_year?.toString() || "");
      setDepartment(data.department || "");
      setUniversity(data.university || "");
      setUniversityStatus(data.university_status || "");
      setUniversityGraduationYear(data.university_graduation_year?.toString() || "");
      setProfession(data.profession || "");
      setCompany(data.company || "");
      setCountry(data.country || "");
      setCity(data.city || "");
      setPhone(data.phone || "");
      setLinkedinUrl(data.linkedin_url || "");
      setTwitterUrl(data.twitter_url || "");
      setInstagramUrl(data.instagram_url || "");
      setFacebookUrl(data.facebook_url || "");
      setIsMentor(data.is_mentor || false);
      setMentorBio(data.mentor_bio || "");
      setMentorshipAreas(data.mentorship_areas || []);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);

    const { error } = await profileService.updateMyProfile({
      full_name: fullName,
      bio: bio || null,
      avatar_url: avatarUrl || null,
      graduation_year: graduationYear ? parseInt(graduationYear) : null,
      high_school_graduation_year: highSchoolGraduationYear ? parseInt(highSchoolGraduationYear) : null,
      department: department || null,
      university: university || null,
      university_status: universityStatus || null,
      university_graduation_year: universityGraduationYear ? parseInt(universityGraduationYear) : null,
      profession: profession || null,
      company: company || null,
      country: country || null,
      city: city || null,
      phone: phone || null,
      linkedin_url: linkedinUrl || null,
      twitter_url: twitterUrl || null,
      instagram_url: instagramUrl || null,
      facebook_url: facebookUrl || null,
      is_mentor: isMentor,
      mentor_bio: isMentor ? mentorBio || null : null,
      mentorship_areas: isMentor && mentorshipAreas.length > 0 ? mentorshipAreas : null,
    });

    if (error) {
      toast({
        title: "Hata",
        description: "Profil güncellenemedi",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Başarılı",
        description: "Profiliniz güncellendi",
      });
    }

    setSaving(false);
  };

  const handleAddArea = () => {
    if (newArea.trim() && !mentorshipAreas.includes(newArea.trim())) {
      setMentorshipAreas([...mentorshipAreas, newArea.trim()]);
      setNewArea("");
    }
  };

  const handleRemoveArea = (area: string) => {
    setMentorshipAreas(mentorshipAreas.filter((a) => a !== area));
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
      <SEO title="Profilim - Mezunlar Derneği" description="Profil bilgilerinizi güncelleyin" />
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container py-8" role="main">
          <Card className="max-w-3xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <User className="h-6 w-6" aria-hidden="true" />
                Profil Bilgileri
              </CardTitle>
              <CardDescription>Kişisel ve profesyonel bilgilerinizi güncelleyin</CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6" aria-label="Profil güncelleme formu">
                {/* Kişisel Bilgiler */}
                <fieldset className="space-y-4 border-0">
                  <legend className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <User className="h-5 w-5" aria-hidden="true" />
                    Kişisel Bilgiler
                  </legend>
                  
                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="full_name">
                        Ad Soyad <span className="text-destructive" aria-label="zorunlu">*</span>
                      </Label>
                      <Input
                        id="full_name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        required
                        aria-required="true"
                        aria-invalid={!fullName}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="avatar_url">Profil Fotoğrafı URL</Label>
                      <Input
                        id="avatar_url"
                        type="url"
                        value={avatarUrl}
                        onChange={(e) => setAvatarUrl(e.target.value)}
                        placeholder="https://example.com/photo.jpg"
                        aria-describedby="avatar-url-desc"
                      />
                      <p id="avatar-url-desc" className="sr-only">Profil fotoğrafınızın internet adresini girin</p>
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="bio">Biyografi</Label>
                    <Textarea
                      id="bio"
                      value={bio}
                      onChange={(e) => setBio(e.target.value)}
                      rows={3}
                      placeholder="Kendinizi kısaca tanıtın..."
                      aria-describedby="bio-desc"
                    />
                    <p id="bio-desc" className="sr-only">Kendinizi kısaca tanıtan bir açıklama yazın</p>
                  </div>
                </fieldset>

                {/* Eğitim Bilgileri */}
                <fieldset className="space-y-4 border-0">
                  <legend className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <GraduationCap className="h-5 w-5" aria-hidden="true" />
                    Eğitim Bilgileri
                  </legend>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="high_school_year">Lise Mezuniyet Yılı</Label>
                      <Select value={highSchoolGraduationYear} onValueChange={setHighSchoolGraduationYear}>
                        <SelectTrigger id="high_school_year" aria-label="Lise mezuniyet yılı seç">
                          <SelectValue placeholder="Seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 60 }, (_, i) => new Date().getFullYear() - i).map(
                            (year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="department">Lise Bölümü</Label>
                      <Input
                        id="department"
                        value={department}
                        onChange={(e) => setDepartment(e.target.value)}
                        placeholder="Fen, Sosyal, vb."
                      />
                    </div>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="university">Üniversite</Label>
                      <Input
                        id="university"
                        value={university}
                        onChange={(e) => setUniversity(e.target.value)}
                        placeholder="Üniversite adı"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="university_status">Üniversite Durumu</Label>
                      <Select value={universityStatus} onValueChange={setUniversityStatus}>
                        <SelectTrigger id="university_status" aria-label="Üniversite durumu seç">
                          <SelectValue placeholder="Seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="studying">Okuyor</SelectItem>
                          <SelectItem value="graduated">Mezun</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {universityStatus === "graduated" && (
                    <div className="space-y-2">
                      <Label htmlFor="university_graduation_year">Üniversite Mezuniyet Yılı</Label>
                      <Select value={universityGraduationYear} onValueChange={setUniversityGraduationYear}>
                        <SelectTrigger id="university_graduation_year" aria-label="Üniversite mezuniyet yılı seç">
                          <SelectValue placeholder="Seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {Array.from({ length: 60 }, (_, i) => new Date().getFullYear() - i).map(
                            (year) => (
                              <SelectItem key={year} value={year.toString()}>
                                {year}
                              </SelectItem>
                            )
                          )}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </fieldset>

                {/* Profesyonel Bilgiler */}
                <fieldset className="space-y-4 border-0">
                  <legend className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <Briefcase className="h-5 w-5" aria-hidden="true" />
                    Profesyonel Bilgiler
                  </legend>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="profession">Meslek</Label>
                      <Input
                        id="profession"
                        value={profession}
                        onChange={(e) => setProfession(e.target.value)}
                        placeholder="Yazılım Geliştirici, Doktor, vb."
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="company">Şirket</Label>
                      <Input
                        id="company"
                        value={company}
                        onChange={(e) => setCompany(e.target.value)}
                        placeholder="Çalıştığınız veya son çalıştığınız şirket"
                      />
                    </div>
                  </div>
                </fieldset>

                {/* Lokasyon Bilgileri */}
                <fieldset className="space-y-4 border-0">
                  <legend className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <MapPin className="h-5 w-5" aria-hidden="true" />
                    Lokasyon
                  </legend>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="country">Ülke</Label>
                      <Select value={country} onValueChange={setCountry}>
                        <SelectTrigger id="country" aria-label="Ülke seç">
                          <SelectValue placeholder="Seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="Türkiye">Türkiye</SelectItem>
                          <SelectItem value="ABD">ABD</SelectItem>
                          <SelectItem value="İngiltere">İngiltere</SelectItem>
                          <SelectItem value="Almanya">Almanya</SelectItem>
                          <SelectItem value="Fransa">Fransa</SelectItem>
                          <SelectItem value="Hollanda">Hollanda</SelectItem>
                          <SelectItem value="Kanada">Kanada</SelectItem>
                          <SelectItem value="Avustralya">Avustralya</SelectItem>
                          <SelectItem value="Diğer">Diğer</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="city">Şehir</Label>
                      <Input
                        id="city"
                        value={city}
                        onChange={(e) => setCity(e.target.value)}
                        placeholder="Yaşadığınız şehir"
                      />
                    </div>
                  </div>
                </fieldset>

                {/* İletişim Bilgileri */}
                <fieldset className="space-y-4 border-0">
                  <legend className="text-lg font-semibold flex items-center gap-2 mb-4">
                    <Phone className="h-5 w-5" aria-hidden="true" />
                    İletişim Bilgileri
                  </legend>

                  <div className="space-y-2">
                    <Label htmlFor="phone">Telefon</Label>
                    <Input
                      id="phone"
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      placeholder="+90 555 123 4567"
                      aria-describedby="phone-desc"
                    />
                    <p id="phone-desc" className="sr-only">Telefon numaranızı ülke kodu ile girin</p>
                  </div>

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label htmlFor="linkedin" className="flex items-center gap-2">
                        <Linkedin className="h-4 w-4" aria-hidden="true" />
                        LinkedIn
                      </Label>
                      <Input
                        id="linkedin"
                        type="url"
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        placeholder="https://linkedin.com/in/kullanici"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="twitter" className="flex items-center gap-2">
                        <Twitter className="h-4 w-4" aria-hidden="true" />
                        Twitter/X
                      </Label>
                      <Input
                        id="twitter"
                        type="url"
                        value={twitterUrl}
                        onChange={(e) => setTwitterUrl(e.target.value)}
                        placeholder="https://twitter.com/kullanici"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="instagram" className="flex items-center gap-2">
                        <Instagram className="h-4 w-4" aria-hidden="true" />
                        Instagram
                      </Label>
                      <Input
                        id="instagram"
                        type="url"
                        value={instagramUrl}
                        onChange={(e) => setInstagramUrl(e.target.value)}
                        placeholder="https://instagram.com/kullanici"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="facebook" className="flex items-center gap-2">
                        <Facebook className="h-4 w-4" aria-hidden="true" />
                        Facebook
                      </Label>
                      <Input
                        id="facebook"
                        type="url"
                        value={facebookUrl}
                        onChange={(e) => setFacebookUrl(e.target.value)}
                        placeholder="https://facebook.com/kullanici"
                      />
                    </div>
                  </div>
                </fieldset>

                {/* Mentorluk */}
                <fieldset className="space-y-4 border-t pt-4">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="is_mentor" className="text-base">Mentor olmak ister misiniz?</Label>
                      <p className="text-sm text-muted-foreground">Deneyimlerinizi mezunlarla paylaşın</p>
                    </div>
                    <Switch
                      id="is_mentor"
                      checked={isMentor}
                      onCheckedChange={setIsMentor}
                      aria-label="Mentor olmak ister misiniz?"
                      aria-describedby="mentor-desc"
                    />
                    <p id="mentor-desc" className="sr-only">Aktif etmek için bu düğmeyi kullanın</p>
                  </div>

                  {isMentor && (
                    <div className="space-y-4 border-l-2 border-primary pl-4">
                      <div className="space-y-2">
                        <Label htmlFor="mentor_bio">Mentor Biyografisi</Label>
                        <Textarea
                          id="mentor_bio"
                          value={mentorBio}
                          onChange={(e) => setMentorBio(e.target.value)}
                          rows={3}
                          placeholder="Mentorluk deneyiminizi ve yaklaşımınızı anlatın..."
                        />
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="new_area">Uzmanlık Alanları</Label>
                        <div className="flex gap-2">
                          <Input
                            id="new_area"
                            value={newArea}
                            onChange={(e) => setNewArea(e.target.value)}
                            placeholder="Alan ekle (örn: Yazılım Geliştirme)"
                            onKeyPress={(e) => e.key === "Enter" && (e.preventDefault(), handleAddArea())}
                            aria-describedby="areas-desc"
                          />
                          <Button type="button" onClick={handleAddArea} variant="secondary" aria-label="Uzmanlık alanı ekle">
                            Ekle
                          </Button>
                        </div>
                        <p id="areas-desc" className="sr-only">Uzmanlık alanlarınızı girin ve Ekle butonuna basın</p>
                        {mentorshipAreas.length > 0 && (
                          <div className="flex flex-wrap gap-2 mt-2" role="list" aria-label="Eklenen uzmanlık alanları">
                            {mentorshipAreas.map((area) => (
                              <Badge key={area} variant="secondary" className="gap-1" role="listitem">
                                {area}
                                <button
                                  type="button"
                                  onClick={() => handleRemoveArea(area)}
                                  className="ml-1 hover:text-destructive focus:outline-none focus:ring-2 focus:ring-destructive rounded-sm"
                                  aria-label={`${area} alanını kaldır`}
                                >
                                  <X className="h-3 w-3" aria-hidden="true" />
                                </button>
                              </Badge>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </fieldset>

                <Button type="submit" className="w-full focus:ring-2 focus:ring-primary focus:ring-offset-2" disabled={saving} aria-busy={saving}>
                  {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                  {saving ? "Kaydediliyor..." : "Kaydet"}
                </Button>
              </form>
            </CardContent>
          </Card>
        </main>
      </div>
    </>
  );
}