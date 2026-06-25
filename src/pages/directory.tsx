import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { authService } from "@/services/authService";
import { profileService, type Profile, type SearchFilters } from "@/services/profileService";
import { Loader2, Search, MapPin, Briefcase, GraduationCap, Building, Filter, MessageSquare, Mail, Phone, Linkedin, Twitter, Instagram, Facebook, Globe } from "lucide-react";

export default function DirectoryPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [alumni, setAlumni] = useState<Profile[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [filters, setFilters] = useState<SearchFilters>({
    searchTerm: "",
    graduation_year: undefined,
    department: "",
    profession: "",
    city: "",
  });
  const [members, setMembers] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [yearFilter, setYearFilter] = useState("all"); // University graduation year
  const [highSchoolYearFilter, setHighSchoolYearFilter] = useState("all");
  const [cityFilter, setCityFilter] = useState("all");
  const [countryFilter, setCountryFilter] = useState("all");
  const [universityFilter, setUniversityFilter] = useState("all");
  const [professionFilter, setProfessionFilter] = useState("all");
  const [companyFilter, setCompanyFilter] = useState("all");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const currentUser = await authService.getCurrentUser();
    if (!currentUser) {
      router.push("/auth/login");
    } else {
      setUser(currentUser);
      loadMembers();
      setLoading(false);
    }
  };

  const loadMembers = async () => {
    const { data, error } = await profileService.getAllProfiles();
    if (!error && data) {
      setMembers(data);
    }
  };

  const filteredMembers = members.filter((member) => {
    const matchesSearch = 
      member.full_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      member.department?.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesYear = yearFilter === "all" || yearFilter === "" || member.graduation_year?.toString() === yearFilter;
    const matchesHighSchoolYear = highSchoolYearFilter === "all" || highSchoolYearFilter === "" || member.high_school_graduation_year?.toString() === highSchoolYearFilter;
    const matchesCity = cityFilter === "all" || cityFilter === "" || member.city === cityFilter;
    const matchesCountry = countryFilter === "all" || countryFilter === "" || member.country === countryFilter;
    const matchesUniversity = universityFilter === "all" || universityFilter === "" || member.university?.toLowerCase().includes(universityFilter.toLowerCase());
    const matchesProfession = professionFilter === "all" || professionFilter === "" || member.profession?.toLowerCase().includes(professionFilter.toLowerCase());
    const matchesCompany = companyFilter === "all" || companyFilter === "" || member.company?.toLowerCase().includes(companyFilter.toLowerCase());

    return matchesSearch && matchesYear && matchesHighSchoolYear && matchesCity && matchesCountry && matchesUniversity && matchesProfession && matchesCompany;
  });

  // Extract unique values for dropdowns
  const uniqueUniversities = Array.from(new Set(members.map(m => m.university).filter(Boolean)));
  const uniqueProfessions = Array.from(new Set(members.map(m => m.profession).filter(Boolean)));
  const uniqueCompanies = Array.from(new Set(members.map(m => m.company).filter(Boolean)));
  const uniqueCountries = Array.from(new Set(members.map(m => m.country).filter(Boolean)));

  const loadData = async () => {
    setSearching(true);
    
    const [alumniResult, departmentsResult, citiesResult] = await Promise.all([
      profileService.searchAlumni(filters),
      profileService.getDepartments(),
      profileService.getCities(),
    ]);

    setAlumni(alumniResult.data || []);
    setDepartments(departmentsResult.data || []);
    setCities(citiesResult.data || []);
    
    setSearching(false);
    setLoading(false);
  };

  const handleSearch = () => {
    loadData();
  };

  const clearFilters = () => {
    setFilters({
      searchTerm: "",
      graduation_year: undefined,
      department: "",
      profession: "",
      city: "",
    });
    setTimeout(loadData, 100);
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
        title="Mezun Dizini - Mezunlar Derneği"
        description="Mezunları keşfedin, bağlantılar kurun"
      />
      
      <div className="min-h-screen bg-background">
        <Navigation />

        <main className="container py-8" role="main">
          <header className="mb-8">
            <h1 className="text-3xl font-heading font-bold mb-2">Mezun Dizini</h1>
            <p className="text-muted-foreground" role="status" aria-live="polite">
              {filteredMembers.length} mezun bulundu
            </p>
          </header>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Search and Filters */}
            <aside className="lg:col-span-1" role="search" aria-label="Mezun arama ve filtreleme">
              <Card className="h-fit">
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Filter className="h-5 w-5" aria-hidden="true" />
                    Filtreler
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="search">İsim veya Bölüm Ara</Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <Input
                        id="search"
                        placeholder="Ara..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="İsim veya bölüm ara"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="hs-year-filter">Lise Mezuniyet Yılı</Label>
                    <Select value={highSchoolYearFilter} onValueChange={setHighSchoolYearFilter}>
                      <SelectTrigger id="hs-year-filter" aria-label="Lise mezuniyet yılına göre filtrele">
                        <SelectValue placeholder="Tüm yıllar" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tümü</SelectItem>
                        {Array.from({ length: 50 }, (_, i) => new Date().getFullYear() - i).map(
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
                    <Label htmlFor="country-filter">Ülke</Label>
                    <Select value={countryFilter} onValueChange={setCountryFilter}>
                      <SelectTrigger id="country-filter" aria-label="Ülkeye göre filtrele">
                        <SelectValue placeholder="Tüm ülkeler" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tümü</SelectItem>
                        {uniqueCountries.map((country: any) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="city-filter">Şehir</Label>
                    <Select value={cityFilter} onValueChange={setCityFilter}>
                      <SelectTrigger id="city-filter" aria-label="Şehre göre filtrele">
                        <SelectValue placeholder="Tüm şehirler" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tümü</SelectItem>
                        <SelectItem value="İstanbul">İstanbul</SelectItem>
                        <SelectItem value="Ankara">Ankara</SelectItem>
                        <SelectItem value="İzmir">İzmir</SelectItem>
                        <SelectItem value="Bursa">Bursa</SelectItem>
                        <SelectItem value="Antalya">Antalya</SelectItem>
                        <SelectItem value="Yurtdışı">Yurtdışı</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="uni-filter">Üniversite</Label>
                    <Select value={universityFilter} onValueChange={setUniversityFilter}>
                      <SelectTrigger id="uni-filter" aria-label="Üniversiteye göre filtrele">
                        <SelectValue placeholder="Tüm üniversiteler" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tümü</SelectItem>
                        {uniqueUniversities.map((uni: any) => (
                          <SelectItem key={uni} value={uni}>
                            {uni}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="profession-filter">Meslek</Label>
                    <Select value={professionFilter} onValueChange={setProfessionFilter}>
                      <SelectTrigger id="profession-filter" aria-label="Mesleğe göre filtrele">
                        <SelectValue placeholder="Tüm meslekler" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tümü</SelectItem>
                        {uniqueProfessions.map((prof: any) => (
                          <SelectItem key={prof} value={prof}>
                            {prof}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="company-filter">Şirket</Label>
                    <Select value={companyFilter} onValueChange={setCompanyFilter}>
                      <SelectTrigger id="company-filter" aria-label="Şirkete göre filtrele">
                        <SelectValue placeholder="Tüm şirketler" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tümü</SelectItem>
                        {uniqueCompanies.map((comp: any) => (
                          <SelectItem key={comp} value={comp}>
                            {comp}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button 
                    variant="outline" 
                    className="w-full focus:ring-2 focus:ring-primary focus:ring-offset-2"
                    onClick={() => {
                      setSearchQuery("");
                      setYearFilter("all");
                      setHighSchoolYearFilter("all");
                      setCityFilter("all");
                      setCountryFilter("all");
                      setUniversityFilter("all");
                      setProfessionFilter("all");
                      setCompanyFilter("all");
                    }}
                    aria-label="Tüm filtreleri temizle"
                  >
                    Filtreleri Temizle
                  </Button>
                </CardContent>
              </Card>
            </aside>

            {/* Alumni Grid */}
            <section className="lg:col-span-3" aria-label="Mezun listesi">
              {searching ? (
                <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="sr-only">Mezunlar yükleniyor...</span>
                </div>
              ) : filteredMembers.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <p className="text-muted-foreground">Hiç mezun bulunamadı. Filtreleri değiştirmeyi deneyin.</p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6" role="list">
                  {filteredMembers.map((person) => (
                    <article key={person.id} role="listitem">
                      <Card className="hover:shadow-lg transition-shadow h-full focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
                        <CardHeader>
                          <div className="flex items-start gap-4">
                            <Avatar className="h-16 w-16">
                              <AvatarImage src={person.avatar_url || undefined} alt={`${person.full_name || "Kullanıcı"} profil resmi`} />
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {person.full_name?.charAt(0) || "U"}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-heading font-semibold truncate">
                                {person.full_name || "Anonim Kullanıcı"}
                              </h3>
                              <p className="text-sm text-muted-foreground truncate">
                                {person.email}
                              </p>
                            </div>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          {person.profession && (
                            <div className="flex items-center gap-2 text-sm">
                              <Briefcase className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                              <span className="truncate">{person.profession}</span>
                            </div>
                          )}
                          {person.company && (
                            <div className="flex items-center gap-2 text-sm">
                              <Building className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                              <span className="truncate">{person.company}</span>
                            </div>
                          )}
                          {person.city && (
                            <div className="flex items-center gap-2 text-sm">
                              <MapPin className="h-4 w-4 text-muted-foreground flex-shrink-0" aria-hidden="true" />
                              <span className="truncate">{person.city}</span>
                            </div>
                          )}
                          <div className="flex flex-wrap gap-2 pt-2">
                            {person.department && (
                              <Badge variant="secondary" className="text-xs">
                                {person.department}
                              </Badge>
                            )}
                            {person.graduation_year && (
                              <Badge variant="outline" className="text-xs">
                                <GraduationCap className="h-3 w-3 mr-1" aria-hidden="true" />
                                {person.graduation_year}
                              </Badge>
                            )}
                          </div>
                          <Dialog>
                            <DialogTrigger asChild>
                              <Button variant="outline" className="w-full mt-3 focus:ring-2 focus:ring-primary focus:ring-offset-2" aria-label={`${person.full_name} profilini görüntüle`}>
                                Profili Görüntüle
                              </Button>
                            </DialogTrigger>
                            <DialogContent role="dialog" aria-labelledby={`profile-title-${person.id}`} aria-describedby={`profile-desc-${person.id}`}>
                              <DialogHeader>
                                <DialogTitle id={`profile-title-${person.id}`}>Üye Profili</DialogTitle>
                                <DialogDescription id={`profile-desc-${person.id}`}>
                                  {person.full_name} isimli üyenin detaylı profil bilgileri.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="flex flex-col items-center gap-4 py-4">
                                <Avatar className="h-24 w-24">
                                  <AvatarImage src={person.avatar_url} alt={`${person.full_name} profil resmi`} />
                                  <AvatarFallback className="text-2xl bg-primary text-primary-foreground">
                                    {person.full_name?.charAt(0).toUpperCase()}
                                  </AvatarFallback>
                                </Avatar>
                                <div className="text-center space-y-1">
                                  <h2 className="text-xl font-bold">{person.full_name}</h2>
                                  <p className="text-muted-foreground">
                                    {person.profession} {person.company && `at ${person.company}`}
                                  </p>
                                  <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                                    <MapPin className="h-4 w-4" aria-hidden="true" />
                                    {person.city}{person.country && `, ${person.country}`}
                                  </div>
                                </div>
                                
                                {person.bio && (
                                  <blockquote className="w-full bg-muted/50 p-4 rounded-lg text-sm text-center italic">
                                    "{person.bio}"
                                  </blockquote>
                                )}

                                <div className="w-full space-y-4">
                                  <dl className="grid grid-cols-2 gap-4">
                                    {person.high_school_graduation_year && (
                                      <div className="space-y-1">
                                        <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                          <GraduationCap className="h-4 w-4" aria-hidden="true" /> Lise Mezuniyet
                                        </dt>
                                        <dd className="text-sm">{person.high_school_graduation_year}</dd>
                                      </div>
                                    )}
                                    {person.university && (
                                      <div className="space-y-1">
                                        <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                          <GraduationCap className="h-4 w-4" aria-hidden="true" /> Üniversite
                                        </dt>
                                        <dd className="text-sm">{person.university} {person.university_status === 'studying' ? '(Okuyor)' : '(Mezun)'}</dd>
                                      </div>
                                    )}
                                    {person.profession && (
                                      <div className="space-y-1">
                                        <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                          <Briefcase className="h-4 w-4" aria-hidden="true" /> Meslek
                                        </dt>
                                        <dd className="text-sm">{person.profession}</dd>
                                      </div>
                                    )}
                                    {person.company && (
                                      <div className="space-y-1">
                                        <dt className="text-sm font-medium text-muted-foreground flex items-center gap-1">
                                          <Briefcase className="h-4 w-4" aria-hidden="true" /> Şirket
                                        </dt>
                                        <dd className="text-sm">{person.company}</dd>
                                      </div>
                                    )}
                                  </dl>

                                  <div className="border-t pt-4 space-y-3">
                                    <h4 className="text-sm font-medium flex items-center gap-2">
                                      <Globe className="h-4 w-4" aria-hidden="true" /> İletişim & Sosyal Medya
                                    </h4>
                                    <nav className="grid grid-cols-1 md:grid-cols-2 gap-3" aria-label="Sosyal medya bağlantıları">
                                      {person.email && (
                                        <a href={`mailto:${person.email}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded-sm">
                                          <Mail className="h-4 w-4" aria-hidden="true" /> {person.email}
                                        </a>
                                      )}
                                      {person.phone && (
                                        <a href={`tel:${person.phone}`} className="flex items-center gap-2 text-sm text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded-sm">
                                          <Phone className="h-4 w-4" aria-hidden="true" /> {person.phone}
                                        </a>
                                      )}
                                      {person.linkedin_url && (
                                        <a href={person.linkedin_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded-sm">
                                          <Linkedin className="h-4 w-4" aria-hidden="true" /> LinkedIn
                                        </a>
                                      )}
                                      {person.twitter_url && (
                                        <a href={person.twitter_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded-sm">
                                          <Twitter className="h-4 w-4" aria-hidden="true" /> Twitter
                                        </a>
                                      )}
                                      {person.instagram_url && (
                                        <a href={person.instagram_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded-sm">
                                          <Instagram className="h-4 w-4" aria-hidden="true" /> Instagram
                                        </a>
                                      )}
                                      {person.facebook_url && (
                                        <a href={person.facebook_url} target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm text-blue-600 hover:underline focus:outline-none focus:ring-2 focus:ring-primary rounded-sm">
                                          <Facebook className="h-4 w-4" aria-hidden="true" /> Facebook
                                        </a>
                                      )}
                                    </nav>
                                  </div>
                                </div>
                              </div>
                            </DialogContent>
                          </Dialog>
                        </CardContent>
                      </Card>
                    </article>
                  ))}
                </div>
              )}
            </section>
          </div>
        </main>
      </div>
    </>
  );
}