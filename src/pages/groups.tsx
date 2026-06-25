import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { groupService } from "@/services/groupService";
import { authService } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, Search, PlusCircle, Globe, Lock } from "lucide-react";

export default function GroupsPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [groups, setGroups] = useState<any[]>([]);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    const currentUser = await authService.getCurrentUser();
    if (!currentUser) {
      router.push("/auth/login");
    } else {
      setUser(currentUser);
      loadGroups();
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    const { data, error } = await groupService.getAllGroups();
    if (!error && data) {
      setGroups(data);
    }
  };

  const getCategoryBadge = (category: string) => {
    const labels: Record<string, string> = {
      city: "Şehir",
      industry: "Sektör",
      interest: "İlgi Alanı",
      class_year: "Sınıf",
      other: "Diğer",
    };
    return labels[category] || category;
  };

  const filteredGroups = groups.filter((group) =>
    group.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    group.description?.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        title="Gruplar - Mezunlar Derneği"
        description="Topluluk gruplarına katılın"
      />
      
      <div className="min-h-screen bg-background">
        <Navigation />

        <main className="container py-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-heading font-bold">Gruplar</h1>
              <Button asChild>
                <Link href="/groups/create">
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Grup Oluştur
                </Link>
              </Button>
            </div>

            <Card>
              <CardHeader>
                <CardTitle className="text-sm font-medium">Ara</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="relative">
                  <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Grup ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </CardContent>
            </Card>

            {filteredGroups.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <Users className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
                  <p className="text-muted-foreground">Henüz grup yok</p>
                  <Button asChild className="mt-4">
                    <Link href="/groups/create">İlk Grubu Oluştur</Link>
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {filteredGroups.map((group) => (
                  <Card key={group.id} className="hover:shadow-lg transition-shadow cursor-pointer">
                    <Link href={`/groups/${group.id}`}>
                      <CardHeader>
                        <div className="flex items-start justify-between">
                          <div className="space-y-1 flex-1">
                            <CardTitle className="line-clamp-1">{group.name}</CardTitle>
                            <div className="flex items-center gap-2">
                              {group.is_private ? (
                                <Lock className="h-3 w-3 text-muted-foreground" />
                              ) : (
                                <Globe className="h-3 w-3 text-muted-foreground" />
                              )}
                              <span className="text-xs text-muted-foreground">
                                {group.is_private ? "Özel" : "Herkese Açık"}
                              </span>
                            </div>
                          </div>
                        </div>
                        {group.category && (
                          <Badge variant="outline" className="w-fit">
                            {getCategoryBadge(group.category)}
                          </Badge>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-4">
                        <p className="text-sm text-muted-foreground line-clamp-2">
                          {group.description || "Açıklama yok"}
                        </p>
                        <div className="flex items-center justify-between text-sm">
                          <div className="flex items-center gap-2">
                            <Users className="h-4 w-4 text-muted-foreground" />
                            <span className="text-muted-foreground">
                              {group.group_members?.length || 0} üye
                            </span>
                          </div>
                          {group.creator && (
                            <div className="flex items-center gap-2">
                              <Avatar className="h-6 w-6">
                                <AvatarImage src={group.creator.avatar_url} />
                                <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                                  {group.creator.full_name?.charAt(0).toUpperCase()}
                                </AvatarFallback>
                              </Avatar>
                            </div>
                          )}
                        </div>
                      </CardContent>
                    </Link>
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