import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { useToast } from "@/hooks/use-toast";
import { authService } from "@/services/authService";
import { galleryService } from "@/services/galleryService";
import { Upload, Image as ImageIcon, Video, Heart, Loader2, Filter } from "lucide-react";

export default function GalleryPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [media, setMedia] = useState<any[]>([]);
  
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [mediaType, setMediaType] = useState<"photo" | "video">("photo");
  const [year, setYear] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  
  const [typeFilter, setTypeFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const currentUser = await authService.getCurrentUser();
    if (!currentUser) {
      router.push("/auth/login");
    } else {
      setUser(currentUser);
      loadMedia();
      setLoading(false);
    }
  };

  const loadMedia = async () => {
    const { data, error } = await galleryService.getAllMedia();
    if (!error && data) {
      setMedia(data);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setSelectedFile(e.target.files[0]);
    }
  };

  const handleUpload = async () => {
    if (!selectedFile || !title) {
      toast({
        title: "Hata",
        description: "Lütfen dosya ve başlık seçin",
        variant: "destructive",
      });
      return;
    }

    setUploading(true);

    const { data, error } = await galleryService.uploadMedia(selectedFile, {
      title,
      description,
      media_type: mediaType,
      year: year ? parseInt(year) : undefined,
    });

    if (error) {
      toast({
        title: "Hata",
        description: "Medya yüklenemedi",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Başarılı",
        description: "Medya yüklendi",
      });
      setTitle("");
      setDescription("");
      setYear("");
      setSelectedFile(null);
      loadMedia();
    }

    setUploading(false);
  };

  const handleLike = async (mediaId: string) => {
    await galleryService.likeMedia(mediaId);
    loadMedia();
  };

  const filteredMedia = media.filter((item) => {
    const matchesType = typeFilter === "all" || item.media_type === typeFilter;
    const matchesYear = yearFilter === "all" || item.year?.toString() === yearFilter;
    return matchesType && matchesYear;
  });

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <Head>
        <SEO title="Fotoğraf & Video Galerisi" description="Mezunların anıları" />
      </Head>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Fotoğraf & Video Galerisi</h1>
            <p className="text-muted-foreground">Okul yıllarımızdan ve günümüzden anılar</p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            <div className="lg:col-span-1 space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Upload className="h-5 w-5" />
                    Medya Yükle
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="media-type">Tip</Label>
                    <Select value={mediaType} onValueChange={(v: "photo" | "video") => setMediaType(v)}>
                      <SelectTrigger id="media-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="photo">Fotoğraf</SelectItem>
                        <SelectItem value="video">Video</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="file">Dosya Seç</Label>
                    <Input
                      id="file"
                      type="file"
                      accept={mediaType === "photo" ? "image/*" : "video/*"}
                      onChange={handleFileSelect}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="title">Başlık</Label>
                    <Input
                      id="title"
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      placeholder="Örn: Mezuniyet Töreni 2010"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Açıklama</Label>
                    <Textarea
                      id="description"
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      placeholder="Anınızı anlatın..."
                      rows={3}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="year">Yıl (opsiyonel)</Label>
                    <Select value={year} onValueChange={setYear}>
                      <SelectTrigger id="year">
                        <SelectValue placeholder="Seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        {Array.from({ length: 40 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                          <SelectItem key={y} value={y.toString()}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button onClick={handleUpload} disabled={uploading} className="w-full">
                    {uploading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Upload className="h-4 w-4 mr-2" />}
                    Yükle
                  </Button>
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle className="text-lg flex items-center gap-2">
                    <Filter className="h-5 w-5" />
                    Filtreler
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label>Medya Tipi</Label>
                    <Select value={typeFilter} onValueChange={setTypeFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tümü</SelectItem>
                        <SelectItem value="photo">Fotoğraflar</SelectItem>
                        <SelectItem value="video">Videolar</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <Label>Yıl</Label>
                    <Select value={yearFilter} onValueChange={setYearFilter}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tümü</SelectItem>
                        {Array.from({ length: 40 }, (_, i) => new Date().getFullYear() - i).map((y) => (
                          <SelectItem key={y} value={y.toString()}>
                            {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="lg:col-span-3">
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {filteredMedia.map((item) => (
                  <Card key={item.id} className="overflow-hidden group cursor-pointer hover:shadow-lg transition-shadow">
                    <div className="relative aspect-video bg-muted">
                      {item.media_type === "photo" ? (
                        <img src={item.media_url} alt={item.title} className="w-full h-full object-cover" />
                      ) : (
                        <video src={item.media_url} className="w-full h-full object-cover" controls />
                      )}
                      <div className="absolute top-2 right-2">
                        <Badge variant={item.media_type === "photo" ? "default" : "secondary"}>
                          {item.media_type === "photo" ? <ImageIcon className="h-3 w-3 mr-1" /> : <Video className="h-3 w-3 mr-1" />}
                          {item.media_type === "photo" ? "Fotoğraf" : "Video"}
                        </Badge>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold mb-1">{item.title}</h3>
                      {item.description && (
                        <p className="text-sm text-muted-foreground line-clamp-2 mb-2">{item.description}</p>
                      )}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Avatar className="h-6 w-6">
                            <AvatarImage src={item.profiles?.avatar_url} />
                            <AvatarFallback className="text-xs">{item.profiles?.full_name?.charAt(0)}</AvatarFallback>
                          </Avatar>
                          <span className="text-xs text-muted-foreground">{item.profiles?.full_name}</span>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleLike(item.id)}>
                          <Heart className="h-4 w-4 mr-1" />
                          {item.likes_count || 0}
                        </Button>
                      </div>
                      {item.year && (
                        <Badge variant="outline" className="mt-2">
                          {item.year}
                        </Badge>
                      )}
                    </CardContent>
                  </Card>
                ))}
              </div>

              {filteredMedia.length === 0 && (
                <Card>
                  <CardContent className="p-12 text-center">
                    <ImageIcon className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                    <p className="text-muted-foreground">Henüz medya yüklenmemiş</p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </main>
      </div>
    </>
  );
}