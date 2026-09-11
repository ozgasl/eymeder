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
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authService } from "@/services/authService";
import { profileService } from "@/services/profileService";
import { useToast } from "@/hooks/use-toast";
import { Loader2, User, Briefcase, GraduationCap, MapPin, Phone, Globe, Linkedin, Twitter, Instagram, Facebook, X, Plus } from "lucide-react";
import { buildSocialUrl, getSocialHandle } from "@/lib/socialLinks";
import { PROFESSION_GROUPS } from "@/lib/professionGroups";
import { AVATAR_UPLOAD, acceptAttribute, validateUpload } from "@/lib/fileUpload";
import { TURKISH_UNIVERSITIES } from "@/lib/turkishUniversities";
import { UniversityCombobox } from "@/components/UniversityCombobox";

interface UniversityEntry {
  university: string;
  department: string;
  status: string;
  graduation_year: string;
}

export default function ProfilePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [fullName, setFullName] = useState("");
  const [bio, setBio] = useState("");
  const [avatarUrl, setAvatarUrl] = useState("");
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [graduationYear, setGraduationYear] = useState("");
  const [department, setDepartment] = useState("");
  const [universities, setUniversities] = useState<UniversityEntry[]>([]);
  const [universityOptions, setUniversityOptions] = useState<string[]>(TURKISH_UNIVERSITIES);
  const [profession, setProfession] = useState("");
  const [professionGroup, setProfessionGroup] = useState("");
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
    loadUniversityOptions();
  }, []);

  const loadUniversityOptions = async () => {
    const { data } = await profileService.getKnownUniversities();
    if (data && data.length > 0) {
      setUniversityOptions((prev) => Array.from(new Set([...prev, ...data])).sort((a, b) => a.localeCompare(b, "tr")));
    }
  };

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
      setDepartment(data.department || "");
      setUniversities(
        (data.profile_universities || []).map((u) => ({
          university: u.university,
          department: u.department || "",
          status: u.status || "",
          graduation_year: u.graduation_year?.toString() || "",
        }))
      );
      setProfession(data.profession || "");
      setProfessionGroup(data.profession_group || "");
      setCompany(data.company || "");
      setCountry(data.country || "");
      setCity(data.city || "");
      setPhone(data.phone || "");
      setLinkedinUrl(getSocialHandle(data.linkedin_url));
      setTwitterUrl(getSocialHandle(data.twitter_url));
      setInstagramUrl(getSocialHandle(data.instagram_url));
      setFacebookUrl(getSocialHandle(data.facebook_url));
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
      department: department || null,
      profession: profession || null,
      profession_group: professionGroup || null,
      company: company || null,
      country: country || null,
      city: city || null,
      phone: phone || null,
      linkedin_url: linkedinUrl ? buildSocialUrl("linkedin", linkedinUrl) : null,
      twitter_url: twitterUrl ? buildSocialUrl("twitter", twitterUrl) : null,
      instagram_url: instagramUrl ? buildSocialUrl("instagram", instagramUrl) : null,
      facebook_url: facebookUrl ? buildSocialUrl("facebook", facebookUrl) : null,
      is_mentor: isMentor,
      mentor_bio: isMentor ? mentorBio || null : null,
      mentorship_areas: isMentor && mentorshipAreas.length > 0 ? mentorshipAreas : null,
    });

    const { error: universitiesError } = await profileService.replaceMyUniversities(
      universities
        .filter((u) => u.university.trim())
        .map((u) => ({
          university: u.university.trim(),
          department: u.department.trim() || null,
          status: (u.status || null) as "studying" | "graduated" | null,
          graduation_year:
            u.status === "graduated" && u.graduation_year ? parseInt(u.graduation_year) : null,
        }))
    );

    if (error || universitiesError) {
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

  const handleAddUniversity = () => {
    setUniversities([...universities, { university: "", department: "", status: "", graduation_year: "" }]);
  };

  const handleRemoveUniversity = (index: number) => {
    setUniversities(universities.filter((_, i) => i !== index));
  };

  const handleUniversityChange = (
    index: number,
    field: keyof UniversityEntry,
    value: string
  ) => {
    setUniversities(universities.map((u, i) => (i === index ? { ...u, [field]: value } : u)));
  };

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const validation = validateUpload(file, AVATAR_UPLOAD);
    if (!validation.ok) {
      toast({ title: "Hata", description: validation.message, variant: "destructive" });
      e.target.value = "";
      return;
    }

    setAvatarFile(file);
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile) return;
    setUploadingAvatar(true);

    const { data, error: uploadError } = await profileService.uploadAvatar(avatarFile);

    if (uploadError) {
      toast({
        title: "Hata",
        description: uploadError.message || "Fotoğraf yüklenemedi",
        variant: "destructive",
      });
    } else if (data) {
      setAvatarUrl(data);
      setAvatarFile(null);
      toast({ title: "Başarılı", description: "Profil fotoğrafı güncellendi" });
    }

    setUploadingAvatar(false);
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
                    <Label htmlFor="avatar_file">Profil Fotoğrafı Yükle</Label>
                    <div className="flex items-center gap-4">
                      <Avatar className="h-14 w-14 flex-shrink-0">
                        <AvatarImage src={avatarUrl || undefined} alt="Profil fotoğrafı önizleme" />
                        <AvatarFallback>{fullName?.charAt(0).toUpperCase() || "U"}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 flex flex-col sm:flex-row gap-2">
                        <Input
                          id="avatar_file"
                          type="file"
                          accept={acceptAttribute(AVATAR_UPLOAD)}
                          onChange={handleAvatarFileSelect}
                          aria-describedby="avatar-file-desc"
                        />
                        <Button
                          type="button"
                          variant="secondary"
                          onClick={handleAvatarUpload}
                          disabled={!avatarFile || uploadingAvatar}
                        >
                          {uploadingAvatar && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
                          {uploadingAvatar ? "Yükleniyor..." : "Yükle"}
                        </Button>
                      </div>
                    </div>
                    <p id="avatar-file-desc" className="text-xs text-muted-foreground">
                      {AVATAR_UPLOAD.formatLabel}, en fazla {AVATAR_UPLOAD.maxBytes / (1024 * 1024)}MB. Yüklendiğinde hemen kaydedilir.
                    </p>
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
                      <Input
                        id="high_school_year"
                        value={graduationYear || "—"}
                        readOnly
                        disabled
                        aria-describedby="high_school_year-desc"
                      />
                      <p id="high_school_year-desc" className="text-xs text-muted-foreground">
                        Kayıt sırasında girilen mezuniyet yılıdır, buradan değiştirilemez. Hatalıysa dernek yönetimiyle iletişime geçin.
                      </p>
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

                  <div className="space-y-4">
                    <Label>Üniversiteler</Label>
                    {universities.map((entry, index) => (
                      <div key={index} className="space-y-4 border rounded-md p-4">
                        <div className="flex gap-2 items-end">
                          <div className="flex-1 space-y-2">
                            <Label htmlFor={`university-${index}`}>Üniversite</Label>
                            <UniversityCombobox
                              id={`university-${index}`}
                              aria-label="Üniversite seç veya yaz"
                              value={entry.university}
                              onChange={(value) => handleUniversityChange(index, "university", value)}
                              options={universityOptions}
                            />
                          </div>
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() => handleRemoveUniversity(index)}
                            aria-label="Üniversiteyi kaldır"
                          >
                            <X className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-3">
                          <div className="space-y-2">
                            <Label htmlFor={`university-department-${index}`}>Bölüm</Label>
                            <Input
                              id={`university-department-${index}`}
                              value={entry.department}
                              onChange={(e) => handleUniversityChange(index, "department", e.target.value)}
                              placeholder="Bölüm adı"
                            />
                          </div>

                          <div className="space-y-2">
                            <Label htmlFor={`university-status-${index}`}>Durum</Label>
                            <Select
                              value={entry.status}
                              onValueChange={(value) => handleUniversityChange(index, "status", value)}
                            >
                              <SelectTrigger id={`university-status-${index}`} aria-label="Üniversite durumu seç">
                                <SelectValue placeholder="Seçin" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="studying">Okuyor</SelectItem>
                                <SelectItem value="graduated">Mezun</SelectItem>
                              </SelectContent>
                            </Select>
                          </div>

                          {entry.status === "graduated" && (
                            <div className="space-y-2">
                              <Label htmlFor={`university-year-${index}`}>Mezuniyet Yılı</Label>
                              <Select
                                value={entry.graduation_year}
                                onValueChange={(value) => handleUniversityChange(index, "graduation_year", value)}
                              >
                                <SelectTrigger id={`university-year-${index}`} aria-label="Üniversite mezuniyet yılı seç">
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
                        </div>
                      </div>
                    ))}
                    <Button type="button" variant="secondary" onClick={handleAddUniversity} aria-label="Üniversite ekle">
                      <Plus className="mr-2 h-4 w-4" aria-hidden="true" />
                      Üniversite Ekle
                    </Button>
                  </div>
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

                    <div className="space-y-2">
                      <Label htmlFor="profession_group">Meslek Grubu</Label>
                      <Select value={professionGroup} onValueChange={setProfessionGroup}>
                        <SelectTrigger id="profession_group" aria-label="Meslek grubu seç">
                          <SelectValue placeholder="Seçin" />
                        </SelectTrigger>
                        <SelectContent>
                          {PROFESSION_GROUPS.map((group) => (
                            <SelectItem key={group} value={group}>
                              {group}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
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
                        type="text"
                        value={linkedinUrl}
                        onChange={(e) => setLinkedinUrl(e.target.value)}
                        placeholder="kullaniciadi"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="twitter" className="flex items-center gap-2">
                        <Twitter className="h-4 w-4" aria-hidden="true" />
                        Twitter/X
                      </Label>
                      <Input
                        id="twitter"
                        type="text"
                        value={twitterUrl}
                        onChange={(e) => setTwitterUrl(e.target.value)}
                        placeholder="kullaniciadi"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="instagram" className="flex items-center gap-2">
                        <Instagram className="h-4 w-4" aria-hidden="true" />
                        Instagram
                      </Label>
                      <Input
                        id="instagram"
                        type="text"
                        value={instagramUrl}
                        onChange={(e) => setInstagramUrl(e.target.value)}
                        placeholder="kullaniciadi"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="facebook" className="flex items-center gap-2">
                        <Facebook className="h-4 w-4" aria-hidden="true" />
                        Facebook
                      </Label>
                      <Input
                        id="facebook"
                        type="text"
                        value={facebookUrl}
                        onChange={(e) => setFacebookUrl(e.target.value)}
                        placeholder="kullaniciadi"
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