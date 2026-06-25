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
import { Switch } from "@/components/ui/switch";
import { groupService } from "@/services/groupService";
import { authService } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users } from "lucide-react";

export default function CreateGroupPage() {
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

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [isPrivate, setIsPrivate] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    
    setCreating(true);

    const { data, error } = await groupService.createGroup({
      name,
      description: description || null,
      category: category || null,
      is_private: isPrivate,
      created_by: user.id,
    });

    if (error) {
      toast({
        title: "Hata",
        description: "Grup oluşturulamadı",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Başarılı",
        description: "Grup oluşturuldu",
      });
      router.push(`/groups/${data.id}`);
    }

    setCreating(false);
  };

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <>
      <SEO 
        title="Grup Oluştur - Mezunlar Derneği"
        description="Yeni topluluk grubu oluşturun"
      />
      
      <div className="min-h-screen bg-background">
        <Navigation />

        <main className="container py-8">
          <div className="max-w-2xl mx-auto space-y-6">
            <div>
              <h1 className="text-3xl font-heading font-bold">Yeni Grup Oluştur</h1>
              <p className="text-muted-foreground mt-2">
                Şehir, sektör veya ilgi alanı bazlı topluluk oluşturun
              </p>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Grup Bilgileri
                </CardTitle>
                <CardDescription>
                  Grubunuzun temel bilgilerini girin
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Grup Adı *</Label>
                    <Input
                      id="name"
                      placeholder="Örn: İstanbul Mezunları, Mühendisler Grubu"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="description">Açıklama</Label>
                    <Textarea
                      id="description"
                      placeholder="Grubun amacı ve hedefleri..."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      rows={4}
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Kategori</Label>
                    <Select value={category} onValueChange={setCategory}>
                      <SelectTrigger id="category">
                        <SelectValue placeholder="Seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="city">Şehir</SelectItem>
                        <SelectItem value="industry">Sektör</SelectItem>
                        <SelectItem value="interest">İlgi Alanı</SelectItem>
                        <SelectItem value="class_year">Sınıf</SelectItem>
                        <SelectItem value="other">Diğer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-lg border">
                    <div className="space-y-0.5">
                      <Label htmlFor="private">Özel Grup</Label>
                      <p className="text-sm text-muted-foreground">
                        Sadece davet edilenler katılabilir
                      </p>
                    </div>
                    <Switch
                      id="private"
                      checked={isPrivate}
                      onCheckedChange={setIsPrivate}
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={!name || creating}
                    className="w-full"
                  >
                    {creating && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Grup Oluştur
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </main>
      </div>
    </>
  );
}