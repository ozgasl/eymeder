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
import { groupService } from "@/services/groupService";
import { authService } from "@/services/authService";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Users, Globe, Lock, UserPlus, UserMinus, Send, Heart } from "lucide-react";

export default function GroupDetailPage() {
  const router = useRouter();
  const { toast } = useToast();
  const { id } = router.query;
  
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [group, setGroup] = useState<any>(null);
  const [posts, setPosts] = useState<any[]>([]);
  const [newPost, setNewPost] = useState("");
  const [posting, setPosting] = useState(false);
  const [isMember, setIsMember] = useState(false);

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
      await Promise.all([loadGroup(), loadPosts()]);
      setLoading(false);
    }
  };

  const loadGroup = async () => {
    if (!id || typeof id !== "string") return;

    const { data, error } = await groupService.getGroupById(id);
    if (!error && data) {
      setGroup(data);
      const membership = data.group_members?.find((m: any) => m.member.id === user?.id);
      setIsMember(!!membership);
    }
  };

  const loadPosts = async () => {
    if (!id || typeof id !== "string") return;

    const { data, error } = await groupService.getGroupPosts(id);
    if (!error && data) {
      setPosts(data);
    }
  };

  const handleJoin = async () => {
    if (!id || typeof id !== "string") return;

    const { error } = await groupService.joinGroup(id);
    if (error) {
      toast({
        title: "Hata",
        description: error.message.includes("duplicate") ? "Zaten üyesiniz" : "Gruba katılınamadı",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Başarılı",
        description: "Gruba katıldınız",
      });
      setIsMember(true);
      await loadGroup();
    }
  };

  const handleLeave = async () => {
    if (!id || typeof id !== "string") return;

    const { error } = await groupService.leaveGroup(id);
    if (error) {
      toast({
        title: "Hata",
        description: "Gruptan ayrılınamadı",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Başarılı",
        description: "Gruptan ayrıldınız",
      });
      setIsMember(false);
      await loadGroup();
    }
  };

  const handleCreatePost = async () => {
    if (!id || typeof id !== "string" || !newPost.trim()) return;

    setPosting(true);

    const { error } = await groupService.createGroupPost(id, newPost);
    if (error) {
      toast({
        title: "Hata",
        description: "Gönderi paylaşılamadı",
        variant: "destructive",
      });
    } else {
      toast({
        title: "Başarılı",
        description: "Gönderi paylaşıldı",
      });
      setNewPost("");
      await loadPosts();
    }

    setPosting(false);
  };

  const handleLike = async (postId: string) => {
    const post = posts.find(p => p.id === postId);
    const hasLiked = post?.group_post_likes?.some((like: any) => like.user_id === user.id);

    if (hasLiked) {
      await groupService.unlikeGroupPost(postId);
    } else {
      await groupService.likeGroupPost(postId);
    }

    await loadPosts();
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

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!group) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container py-8">
          <Card>
            <CardContent className="py-12 text-center">
              <p className="text-muted-foreground">Grup bulunamadı</p>
              <Button asChild className="mt-4">
                <Link href="/groups">Gruplara Dön</Link>
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
        title={`${group.name} - Gruplar`}
        description={group.description || "Topluluk grubu"}
      />
      
      <div className="min-h-screen bg-background">
        <Navigation />

        <main className="container py-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <Button variant="ghost" asChild>
              <Link href="/groups">← Gruplara Dön</Link>
            </Button>

            <div className="grid gap-6 lg:grid-cols-3">
              {/* Group Info Sidebar */}
              <div className="space-y-4">
                <Card>
                  <CardHeader>
                    <div className="space-y-3">
                      <CardTitle className="text-2xl">{group.name}</CardTitle>
                      <div className="flex items-center gap-2">
                        {group.is_private ? (
                          <Lock className="h-4 w-4 text-muted-foreground" />
                        ) : (
                          <Globe className="h-4 w-4 text-muted-foreground" />
                        )}
                        <span className="text-sm text-muted-foreground">
                          {group.is_private ? "Özel Grup" : "Herkese Açık"}
                        </span>
                      </div>
                      {group.category && (
                        <Badge variant="outline">
                          {getCategoryBadge(group.category)}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <p className="text-sm text-muted-foreground">
                      {group.description || "Açıklama yok"}
                    </p>

                    <div className="flex items-center gap-2 text-sm text-muted-foreground">
                      <Users className="h-4 w-4" />
                      {group.group_members?.length || 0} üye
                    </div>

                    {isMember ? (
                      <Button variant="outline" className="w-full gap-2" onClick={handleLeave}>
                        <UserMinus className="h-4 w-4" />
                        Gruptan Ayrıl
                      </Button>
                    ) : (
                      <Button className="w-full gap-2" onClick={handleJoin}>
                        <UserPlus className="h-4 w-4" />
                        Gruba Katıl
                      </Button>
                    )}
                  </CardContent>
                </Card>

                {/* Members */}
                {group.group_members && group.group_members.length > 0 && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Üyeler</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      {group.group_members.slice(0, 5).map((membership: any) => (
                        <div key={membership.id} className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarImage src={membership.member?.avatar_url} />
                            <AvatarFallback className="text-xs bg-primary text-primary-foreground">
                              {membership.member?.full_name?.charAt(0).toUpperCase()}
                            </AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">
                              {membership.member?.full_name}
                            </p>
                            {membership.role === "admin" && (
                              <Badge variant="secondary" className="text-xs">Admin</Badge>
                            )}
                          </div>
                        </div>
                      ))}
                      {group.group_members.length > 5 && (
                        <p className="text-xs text-muted-foreground text-center">
                          +{group.group_members.length - 5} üye daha
                        </p>
                      )}
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Posts Feed */}
              <div className="lg:col-span-2 space-y-4">
                {isMember && (
                  <Card>
                    <CardHeader>
                      <CardTitle className="text-sm font-medium">Paylaşım Yap</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-3">
                      <Textarea
                        placeholder="Ne düşünüyorsunuz?"
                        value={newPost}
                        onChange={(e) => setNewPost(e.target.value)}
                        rows={3}
                      />
                      <Button
                        onClick={handleCreatePost}
                        disabled={!newPost.trim() || posting}
                        className="gap-2"
                      >
                        {posting ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Send className="h-4 w-4" />
                        )}
                        Paylaş
                      </Button>
                    </CardContent>
                  </Card>
                )}

                <Card>
                  <CardHeader>
                    <CardTitle>Tartışmalar</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {posts.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">
                        Henüz gönderi yok
                      </p>
                    ) : (
                      posts.map((post) => (
                        <div key={post.id} className="space-y-3 pb-4 border-b last:border-0">
                          <div className="flex gap-3">
                            <Avatar className="h-10 w-10">
                              <AvatarImage src={post.author?.avatar_url} />
                              <AvatarFallback className="bg-primary text-primary-foreground">
                                {post.author?.full_name?.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1">
                              <div className="flex items-center gap-2">
                                <span className="font-medium">
                                  {post.author?.full_name || "Anonim"}
                                </span>
                                {post.author?.profession && (
                                  <span className="text-sm text-muted-foreground">
                                    · {post.author.profession}
                                  </span>
                                )}
                              </div>
                              <p className="text-sm text-muted-foreground">
                                {new Date(post.created_at).toLocaleString("tr-TR", {
                                  day: "numeric",
                                  month: "long",
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </p>
                            </div>
                          </div>

                          <p className="text-sm whitespace-pre-wrap">{post.content}</p>

                          <Button
                            variant="ghost"
                            size="sm"
                            className={`gap-2 ${
                              post.group_post_likes?.some((like: any) => like.user_id === user.id)
                                ? "text-red-500"
                                : ""
                            }`}
                            onClick={() => handleLike(post.id)}
                            disabled={!isMember}
                          >
                            <Heart className="h-4 w-4" />
                            {post.group_post_likes?.length || 0}
                          </Button>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </main>
      </div>
    </>
  );
}