import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogDescription } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { profileService } from "@/services/profileService";
import { eventService } from "@/services/eventService";
import { jobService } from "@/services/jobService";
import { newsService } from "@/services/newsService";
import { productService } from "@/services/productService";
import { orderService } from "@/services/orderService";
import { authService } from "@/services/authService";
import { brandService } from "@/services/brandService";
import { supabase } from "@/integrations/supabase/client";
import { 
  Users, 
  Calendar, 
  Briefcase, 
  Newspaper, 
  ShieldCheck, 
  Loader2, 
  UserPlus,
  Package,
  ShoppingCart,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
  Save,
  X,
  Edit2,
  Download,
  Shield,
  Tag,
  Upload
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface MembershipRecord {
  id: string;
  membership_number: string;
  email: string;
  full_name: string;
  is_used: boolean;
  created_at: string;
}

export default function AdminPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState<string>("users");
  
  // States
  const [users, setUsers] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [memberships, setMemberships] = useState<any[]>([]);
  const [newsItems, setNewsItems] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  
  // Loading states
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  
  // Form states
  const [file, setFile] = useState<File | null>(null);
  const [editingBrand, setEditingBrand] = useState<any>(null);
  const [newBrand, setNewBrand] = useState({
    name: "",
    category: "Diğer",
    description: "",
    discount_info: "",
    logo_url: "",
    website_url: "",
    is_active: true,
    display_order: 0,
  });

  // Product form
  const [productDialogOpen, setProductDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [productName, setProductName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [productPrice, setProductPrice] = useState("");
  const [productStock, setProductStock] = useState("");
  const [productImageUrl, setProductImageUrl] = useState("");
  const [productCategory, setProductCategory] = useState("");
  const [productIsActive, setProductIsActive] = useState(true);

  useEffect(() => {
    checkAdminAccess();
  }, [router]);

  const checkAdminAccess = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      router.push("/auth/login");
      return;
    }

    const { data: role } = await supabase
      .from("roles")
      .select("*")
      .eq("user_id", session.user.id)
      .single();

    if (!role || (role.role !== "admin" && role.role !== "moderator")) {
      toast({ title: "Erişim Reddedildi", description: "Bu sayfayı görüntüleme yetkiniz yok.", variant: "destructive" });
      router.push("/");
      return;
    }

    loadData();
  };

  const loadData = async () => {
    await loadUsers();
    await loadBrands();
    await loadMemberships();
    await loadNews();
    await loadProducts();
    await loadOrders();
    setLoading(false);
  };

  const loadUsers = async () => {
    const { data: profiles } = await profileService.getAllProfiles();
    
    if (profiles) {
      // Load roles for all users
      const { data: rolesData } = await supabase
        .from("roles")
        .select("*");

      const usersWithRoles = profiles.map((profile: any) => {
        const userRole = rolesData?.find(r => r.user_id === profile.id);
        return {
          ...profile,
          role: userRole?.role || "member",
          is_admin: userRole?.role === "admin",
          is_moderator: userRole?.role === "moderator"
        };
      });

      setUsers(usersWithRoles);
    }
    setLoading(false);
  };

  const loadBrands = async () => {
    const { data } = await brandService.getAllBrands();
    if (data) setBrands(data);
  };

  const loadMemberships = async () => {
    const { data, error } = await supabase
      .from("membership_numbers")
      .select("*")
      .order("created_at", { ascending: false });

    if (!error && data) {
      setMemberships(data);
    }
  };

  const loadNews = async () => {
    const { data } = await newsService.getAllNews();
    if (data) setNewsItems(data);
  };

  const loadProducts = async () => {
    const { data } = await productService.getAllProducts();
    if (data) setProducts(data);
  };

  const loadOrders = async () => {
    const { data } = await orderService.getAllOrders();
    if (data) setOrders(data);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
    }
  };

  const parseCSV = (text: string): Array<{ email: string; full_name: string; membership_number: string }> => {
    const lines = text.split("\n").filter(line => line.trim());
    const records: Array<{ email: string; full_name: string; membership_number: string }> = [];

    // Skip header line
    for (let i = 1; i < lines.length; i++) {
      const line = lines[i].trim();
      if (!line) continue;

      const parts = line.includes(";") 
        ? line.split(";").map(p => p.trim()) 
        : line.split(",").map(p => p.trim());

      if (parts.length >= 3) {
        const [email, full_name, membership_number] = parts;
        
        if (membership_number && /^\d{8}$/.test(membership_number.trim())) {
          records.push({
            email: email.trim(),
            full_name: full_name.trim(),
            membership_number: membership_number.trim(),
          });
        }
      }
    }

    return records;
  };

  const handleUpload = async () => {
    if (!file) {
      toast({ title: "Hata", description: "Lütfen bir dosya seçin", variant: "destructive" });
      return;
    }

    setUploading(true);

    try {
      const text = await file.text();
      const records = parseCSV(text);

      if (records.length === 0) {
        toast({
          title: "Hata",
          description: "Dosyada geçerli kayıt bulunamadı. Format: Email, Ad Soyad, Üyelik No (8 haneli)",
          variant: "destructive",
        });
        setUploading(false);
        return;
      }

      const { error } = await supabase.from("membership_numbers").insert(records);

      if (error) {
        toast({ title: "Hata", description: `Kayıtlar eklenirken hata: ${error.message}`, variant: "destructive" });
      } else {
        toast({ title: "Başarılı", description: `${records.length} kayıt başarıyla eklendi` });
        setFile(null);
        loadMemberships();
      }
    } catch (error: any) {
      toast({ title: "Hata", description: `Dosya işlenirken hata: ${error.message}`, variant: "destructive" });
    }

    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    const { error } = await supabase.from("membership_numbers").delete().eq("id", id);
    if (error) {
      toast({ title: "Hata", description: "Kayıt silinemedi", variant: "destructive" });
    } else {
      toast({ title: "Başarılı", description: "Kayıt silindi" });
      loadMemberships();
    }
  };

  const downloadTemplate = () => {
    const csvContent = "Email,Full Name,Membership Number\nahmet@example.com,Ahmet Yılmaz,12345678\nayse@example.com,Ayşe Demir,87654321";
    const blob = new Blob([csvContent], { type: "text/csv" });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "membership_template.csv";
    a.click();
    window.URL.revokeObjectURL(url);
  };

  const handleRoleUpdate = async (userId: string, newRole: string) => {
    try {
      // Check if user already has a role entry
      const { data: existingRole } = await supabase
        .from("roles")
        .select("*")
        .eq("user_id", userId)
        .single();

      if (existingRole) {
        // Update existing role
        const { error } = await supabase
          .from("roles")
          .update({ role: newRole })
          .eq("user_id", userId);

        if (error) {
          toast({ title: "Hata", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "Rol güncellendi" });
          loadUsers();
        }
      } else {
        // Insert new role
        const { error } = await supabase
          .from("roles")
          .insert({ user_id: userId, role: newRole });

        if (error) {
          toast({ title: "Hata", description: error.message, variant: "destructive" });
        } else {
          toast({ title: "Rol eklendi" });
          loadUsers();
        }
      }
    } catch (err: any) {
      toast({ title: "Hata", description: err.message, variant: "destructive" });
    }
  };

  const handleCreateBrand = async () => {
    if (!newBrand.name || !newBrand.discount_info) {
      toast({ title: "Hata", description: "Marka adı ve indirim bilgisi gerekli", variant: "destructive" });
      return;
    }

    const { error } = await brandService.createBrand(newBrand);
    if (!error) {
      toast({ title: "Marka eklendi" });
      setNewBrand({
        name: "", category: "Diğer", description: "", discount_info: "",
        logo_url: "", website_url: "", is_active: true, display_order: 0,
      });
      loadBrands();
    } else {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    }
  };

  const handleUpdateBrand = async () => {
    if (!editingBrand) return;
    const { error } = await brandService.updateBrand(editingBrand.id, editingBrand);
    if (!error) {
      toast({ title: "Marka güncellendi" });
      setEditingBrand(null);
      loadBrands();
    } else {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteBrand = async (id: string) => {
    if (!confirm("Bu markayı silmek istediğinizden emin misiniz?")) return;
    const { error } = await brandService.deleteBrand(id);
    if (!error) {
      toast({ title: "Marka silindi" });
      loadBrands();
    } else {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    }
  };

  const handleToggleBrand = async (id: string, isActive: boolean) => {
    const { error } = await brandService.toggleBrandStatus(id, isActive);
    if (!error) {
      toast({ title: isActive ? "Marka aktif edildi" : "Marka pasif edildi" });
      loadBrands();
    } else {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    }
  };

  const handleDeleteNews = async (id: string) => {
    if (!confirm("Bu haberi silmek istediğinizden emin misiniz?")) return;
    const { error } = await newsService.deleteNews(id);
    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Haber silindi" });
      loadNews();
    }
  };

  const openProductDialog = (product?: any) => {
    if (product) {
      setEditingProduct(product);
      setProductName(product.name);
      setProductDescription(product.description || "");
      setProductPrice(product.price.toString());
      setProductStock(product.stock.toString());
      setProductImageUrl(product.image_url || "");
      setProductCategory(product.category || "");
      setProductIsActive(product.is_active);
    } else {
      setEditingProduct(null);
      setProductName("");
      setProductDescription("");
      setProductPrice("");
      setProductStock("");
      setProductImageUrl("");
      setProductCategory("");
      setProductIsActive(true);
    }
    setProductDialogOpen(true);
  };

  const handleSaveProduct = async () => {
    if (!productName || !productPrice || !productStock) {
      toast({ title: "Hata", description: "Lütfen zorunlu alanları doldurun", variant: "destructive" });
      return;
    }

    const productData = {
      name: productName,
      description: productDescription,
      price: parseFloat(productPrice),
      stock: parseInt(productStock),
      image_url: productImageUrl,
      category: productCategory,
      is_active: productIsActive,
    };

    if (editingProduct) {
      const { error } = await productService.updateProduct(editingProduct.id, productData);
      if (error) {
        toast({ title: "Hata", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Ürün güncellendi" });
        loadProducts();
        setProductDialogOpen(false);
      }
    } else {
      const { error } = await productService.createProduct(productData);
      if (error) {
        toast({ title: "Hata", description: error.message, variant: "destructive" });
      } else {
        toast({ title: "Ürün oluşturuldu" });
        loadProducts();
        setProductDialogOpen(false);
      }
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (!confirm("Bu ürünü silmek istediğinizden emin misiniz?")) return;
    const { error } = await productService.deleteProduct(id);
    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Ürün silindi" });
      loadProducts();
    }
  };

  const handleToggleProductStatus = async (id: string, isActive: boolean) => {
    const { error } = await productService.toggleProductStatus(id, isActive);
    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } else {
      toast({ title: isActive ? "Ürün aktif edildi" : "Ürün pasif edildi" });
      loadProducts();
    }
  };

  const handleUpdateOrderStatus = async (orderId: string, status: string) => {
    const { error } = await orderService.updateOrderStatus(orderId, status as any);
    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Sipariş durumu güncellendi" });
      loadOrders();
    }
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
      <SEO title="Admin Panel - Mezunlar Derneği" description="Yönetim paneli" />
      
      <div className="min-h-screen bg-background">
        <Navigation />

        <main className="container py-8">
          <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-heading font-bold">Admin Panel</h1>
            </div>

            {/* Toplu Yükleme Bölümü (Her zaman üstte görünsün) */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-5 w-5" />
                  Toplu Üyelik Numarası Yükleme
                </CardTitle>
                <CardDescription>CSV veya Excel dosyasından üyelik numaralarını toplu yükleyin</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="bg-muted p-4 rounded-lg space-y-2">
                  <p className="text-sm font-medium">Dosya Formatı:</p>
                  <ul className="text-sm text-muted-foreground list-disc list-inside space-y-1">
                    <li>CSV formatı (virgül veya noktalı virgül ile ayrılmış)</li>
                    <li>İlk satır başlık: Email, Full Name, Membership Number</li>
                    <li>Örnek: ahmet@example.com,Ahmet Yılmaz,12345678</li>
                  </ul>
                  <Button variant="outline" size="sm" onClick={downloadTemplate} className="mt-2">
                    <Download className="h-4 w-4 mr-2" /> Örnek Dosya İndir
                  </Button>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="csv-file">CSV/Excel Dosyası</Label>
                  <Input id="csv-file" type="file" accept=".csv,.xlsx,.xls" onChange={handleFileChange} />
                  {file && <p className="text-sm text-muted-foreground">Seçilen dosya: {file.name}</p>}
                </div>

                <Button onClick={handleUpload} disabled={!file || uploading} className="w-full">
                  {uploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Yükleniyor...</> : <><Upload className="mr-2 h-4 w-4" /> Dosyayı Yükle</>}
                </Button>
              </CardContent>
            </Card>

            {/* SEKMELER */}
            <Tabs defaultValue="users" className="space-y-6">
              <TabsList className="grid grid-cols-3 lg:grid-cols-7 gap-2">
                <TabsTrigger value="users" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Kullanıcılar
                </TabsTrigger>
                <TabsTrigger value="events" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Etkinlikler
                </TabsTrigger>
                <TabsTrigger value="jobs" className="flex items-center gap-2">
                  <Briefcase className="h-4 w-4" />
                  İş İlanları
                </TabsTrigger>
                <TabsTrigger value="news" className="flex items-center gap-2">
                  <Newspaper className="h-4 w-4" />
                  Haberler
                </TabsTrigger>
                <TabsTrigger value="products" className="flex items-center gap-2">
                  <Package className="h-4 w-4" />
                  Ürünler
                </TabsTrigger>
                <TabsTrigger value="orders" className="flex items-center gap-2">
                  <ShoppingCart className="h-4 w-4" />
                  Siparişler
                </TabsTrigger>
                <TabsTrigger value="roles" className="flex items-center gap-2">
                  <ShieldCheck className="h-4 w-4" />
                  Yetkiler
                </TabsTrigger>
              </TabsList>

              {/* SEKME 1: KULLANICILAR */}
              <TabsContent value="users" className="space-y-4 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Sistemdeki Kullanıcılar ({users.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ad Soyad</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Üyelik No</TableHead>
                          <TableHead>Kayıt Tarihi</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell className="font-medium">{u.full_name || 'İsimsiz'}</TableCell>
                            <TableCell>{u.email}</TableCell>
                            <TableCell>{u.membership_number || '-'}</TableCell>
                            <TableCell>{new Date(u.created_at).toLocaleDateString('tr-TR')}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* SEKME 2: ROLLER */}
              <TabsContent value="roles" className="space-y-4 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle>Kullanıcı Rolleri</CardTitle>
                    <CardDescription>Sistemdeki yöneticileri ve moderatörleri belirleyin</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Kullanıcı</TableHead>
                          <TableHead>Mevcut Rol</TableHead>
                          <TableHead>Rol Değiştir</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {users.map((u) => (
                          <TableRow key={u.id}>
                            <TableCell>
                              <div>
                                <p className="font-medium">{u.full_name}</p>
                                <p className="text-sm text-muted-foreground">{u.email}</p>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Select
                                defaultValue={u.role || "member"}
                                onValueChange={(val) => handleRoleUpdate(u.id, val)}
                              >
                                <SelectTrigger className="w-[150px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="member">Kullanıcı</SelectItem>
                                  <SelectItem value="moderator">Moderatör</SelectItem>
                                  <SelectItem value="admin">Admin</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* SEKME 3: MARKALAR */}
              <TabsContent value="brands" className="space-y-6 mt-6">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Plus className="h-5 w-5" /> Yeni Marka Ekle</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Marka Adı *</Label>
                        <Input value={newBrand.name} onChange={(e) => setNewBrand({ ...newBrand, name: e.target.value })} placeholder="Örn: Starbucks" />
                      </div>
                      <div className="space-y-2">
                        <Label>Kategori</Label>
                        <Select value={newBrand.category} onValueChange={(val) => setNewBrand({ ...newBrand, category: val })}>
                          <SelectTrigger><SelectValue /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Yeme-İçme">Yeme-İçme</SelectItem>
                            <SelectItem value="Giyim">Giyim</SelectItem>
                            <SelectItem value="Teknoloji">Teknoloji</SelectItem>
                            <SelectItem value="Sağlık">Sağlık</SelectItem>
                            <SelectItem value="Eğitim">Eğitim</SelectItem>
                            <SelectItem value="Diğer">Diğer</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label>Açıklama</Label>
                      <Textarea value={newBrand.description} onChange={(e) => setNewBrand({ ...newBrand, description: e.target.value })} rows={2} />
                    </div>
                    <div className="space-y-2">
                      <Label>İndirim Bilgisi *</Label>
                      <Input value={newBrand.discount_info} onChange={(e) => setNewBrand({ ...newBrand, discount_info: e.target.value })} placeholder="Örn: %15 indirim" />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label>Logo URL</Label>
                        <Input value={newBrand.logo_url} onChange={(e) => setNewBrand({ ...newBrand, logo_url: e.target.value })} />
                      </div>
                      <div className="space-y-2">
                        <Label>Website URL</Label>
                        <Input value={newBrand.website_url} onChange={(e) => setNewBrand({ ...newBrand, website_url: e.target.value })} />
                      </div>
                    </div>
                    <Button onClick={handleCreateBrand} className="w-full"><Plus className="h-4 w-4 mr-2" /> Marka Ekle</Button>
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader>
                    <CardTitle>Mevcut Markalar ({brands.length})</CardTitle>
                  </CardHeader>
                  <CardContent>
                    {brands.length === 0 ? (
                      <p className="text-center text-muted-foreground py-8">Henüz marka eklenmemiş</p>
                    ) : (
                      <div className="space-y-4">
                        {brands.map((brand) => (
                          <Card key={brand.id}>
                            <CardContent className="pt-6">
                              {editingBrand?.id === brand.id ? (
                                <div className="space-y-4">
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input value={editingBrand.name} onChange={(e) => setEditingBrand({ ...editingBrand, name: e.target.value })} />
                                    <Select value={editingBrand.category} onValueChange={(val) => setEditingBrand({ ...editingBrand, category: val })}>
                                      <SelectTrigger><SelectValue /></SelectTrigger>
                                      <SelectContent>
                                        <SelectItem value="Yeme-İçme">Yeme-İçme</SelectItem>
                                        <SelectItem value="Giyim">Giyim</SelectItem>
                                        <SelectItem value="Teknoloji">Teknoloji</SelectItem>
                                        <SelectItem value="Sağlık">Sağlık</SelectItem>
                                        <SelectItem value="Eğitim">Eğitim</SelectItem>
                                        <SelectItem value="Diğer">Diğer</SelectItem>
                                      </SelectContent>
                                    </Select>
                                  </div>
                                  <Textarea value={editingBrand.description || ""} onChange={(e) => setEditingBrand({ ...editingBrand, description: e.target.value })} rows={2} />
                                  <Input value={editingBrand.discount_info} onChange={(e) => setEditingBrand({ ...editingBrand, discount_info: e.target.value })} />
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <Input value={editingBrand.logo_url || ""} onChange={(e) => setEditingBrand({ ...editingBrand, logo_url: e.target.value })} placeholder="Logo URL" />
                                    <Input value={editingBrand.website_url || ""} onChange={(e) => setEditingBrand({ ...editingBrand, website_url: e.target.value })} placeholder="Website URL" />
                                  </div>
                                  <div className="flex gap-2">
                                    <Button onClick={handleUpdateBrand} size="sm"><Save className="h-4 w-4 mr-2" /> Kaydet</Button>
                                    <Button onClick={() => setEditingBrand(null)} size="sm" variant="outline"><X className="h-4 w-4 mr-2" /> İptal</Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1">
                                    <div className="flex items-center gap-3 mb-2">
                                      <h3 className="font-semibold text-lg">{brand.name}</h3>
                                      <Badge variant="outline">{brand.category}</Badge>
                                      {!brand.is_active && <Badge variant="secondary">Pasif</Badge>}
                                    </div>
                                    {brand.description && <p className="text-sm text-muted-foreground mb-2">{brand.description}</p>}
                                    <p className="text-sm font-medium text-green-600">{brand.discount_info}</p>
                                  </div>
                                  <div className="flex gap-2">
                                    <Button size="sm" variant="outline" onClick={() => handleToggleBrand(brand.id, !brand.is_active)}>
                                      {brand.is_active ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </Button>
                                    <Button size="sm" variant="outline" onClick={() => setEditingBrand(brand)}><Edit2 className="h-4 w-4" /></Button>
                                    <Button size="sm" variant="destructive" onClick={() => handleDeleteBrand(brand.id)}><Trash2 className="h-4 w-4" /></Button>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Products Tab */}
              <TabsContent value="products">
                <Card>
                  <CardHeader className="flex flex-row items-center justify-between">
                    <div>
                      <CardTitle>Ürün Yönetimi</CardTitle>
                      <CardDescription>Mezun Store ürünlerini yönetin</CardDescription>
                    </div>
                    <Dialog open={productDialogOpen} onOpenChange={setProductDialogOpen}>
                      <DialogTrigger asChild>
                        <Button onClick={() => openProductDialog()}>
                          <Plus className="h-4 w-4 mr-2" />
                          Yeni Ürün
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-2xl">
                        <DialogHeader>
                          <DialogTitle>{editingProduct ? "Ürünü Düzenle" : "Yeni Ürün Ekle"}</DialogTitle>
                          <DialogDescription>
                            Mezun Store için ürün bilgilerini girin
                          </DialogDescription>
                        </DialogHeader>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="product_name">Ürün Adı *</Label>
                              <Input
                                id="product_name"
                                value={productName}
                                onChange={(e) => setProductName(e.target.value)}
                                placeholder="Eyüboğlu Tişört"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="product_category">Kategori</Label>
                              <Input
                                id="product_category"
                                value={productCategory}
                                onChange={(e) => setProductCategory(e.target.value)}
                                placeholder="Giyim"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="product_description">Açıklama</Label>
                            <Textarea
                              id="product_description"
                              value={productDescription}
                              onChange={(e) => setProductDescription(e.target.value)}
                              rows={3}
                              placeholder="Ürün açıklaması..."
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <Label htmlFor="product_price">Fiyat (₺) *</Label>
                              <Input
                                id="product_price"
                                type="number"
                                step="0.01"
                                value={productPrice}
                                onChange={(e) => setProductPrice(e.target.value)}
                                placeholder="199.99"
                              />
                            </div>
                            <div className="space-y-2">
                              <Label htmlFor="product_stock">Stok Adedi *</Label>
                              <Input
                                id="product_stock"
                                type="number"
                                value={productStock}
                                onChange={(e) => setProductStock(e.target.value)}
                                placeholder="50"
                              />
                            </div>
                          </div>
                          <div className="space-y-2">
                            <Label htmlFor="product_image">Ürün Görseli URL</Label>
                            <Input
                              id="product_image"
                              value={productImageUrl}
                              onChange={(e) => setProductImageUrl(e.target.value)}
                              placeholder="https://example.com/image.jpg"
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div className="space-y-0.5">
                              <Label htmlFor="product_active">Aktif</Label>
                              <p className="text-sm text-muted-foreground">
                                Ürün mağazada görünsün mü?
                              </p>
                            </div>
                            <Switch
                              id="product_active"
                              checked={productIsActive}
                              onCheckedChange={setProductIsActive}
                            />
                          </div>
                          <div className="flex gap-3">
                            <Button onClick={handleSaveProduct} className="flex-1">
                              {editingProduct ? "Güncelle" : "Oluştur"}
                            </Button>
                            <Button variant="outline" onClick={() => setProductDialogOpen(false)} className="flex-1">
                              İptal
                            </Button>
                          </div>
                        </div>
                      </DialogContent>
                    </Dialog>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Ürün</TableHead>
                          <TableHead>Kategori</TableHead>
                          <TableHead>Fiyat</TableHead>
                          <TableHead>Stok</TableHead>
                          <TableHead>Durum</TableHead>
                          <TableHead className="text-right">İşlemler</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {products.map((product) => (
                          <TableRow key={product.id}>
                            <TableCell>
                              <div className="flex items-center gap-3">
                                {product.image_url && (
                                  <img
                                    src={product.image_url}
                                    alt={product.name}
                                    className="h-10 w-10 rounded object-cover"
                                  />
                                )}
                                <div>
                                  <p className="font-medium">{product.name}</p>
                                  <p className="text-sm text-muted-foreground line-clamp-1">
                                    {product.description}
                                  </p>
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              {product.category && (
                                <Badge variant="outline">{product.category}</Badge>
                              )}
                            </TableCell>
                            <TableCell>{product.price.toLocaleString("tr-TR")} ₺</TableCell>
                            <TableCell>
                              <Badge variant={product.stock > 10 ? "default" : "destructive"}>
                                {product.stock} adet
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleProductStatus(product.id, !product.is_active)}
                              >
                                {product.is_active ? (
                                  <Eye className="h-4 w-4 text-green-600" />
                                ) : (
                                  <EyeOff className="h-4 w-4 text-muted-foreground" />
                                )}
                              </Button>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end gap-2">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => openProductDialog(product)}
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteProduct(product.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-destructive" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>

              {/* Orders Tab */}
              <TabsContent value="orders">
                <Card>
                  <CardHeader>
                    <CardTitle>Sipariş Yönetimi</CardTitle>
                    <CardDescription>Tüm siparişleri görüntüleyin ve yönetin</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Sipariş No</TableHead>
                          <TableHead>Kullanıcı</TableHead>
                          <TableHead>Toplam</TableHead>
                          <TableHead>Ödeme</TableHead>
                          <TableHead>Durum</TableHead>
                          <TableHead>Tarih</TableHead>
                          <TableHead className="text-right">İşlemler</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {orders.map((order) => (
                          <TableRow key={order.id}>
                            <TableCell className="font-mono text-sm">
                              {order.id.slice(0, 8)}
                            </TableCell>
                            <TableCell>
                              {order.profiles?.full_name || order.profiles?.email}
                            </TableCell>
                            <TableCell className="font-medium">
                              {order.total_amount.toLocaleString("tr-TR")} ₺
                            </TableCell>
                            <TableCell>
                              <Badge variant="outline">
                                {order.payment_method === "bank_transfer" ? "Havale" : "Kredi Kartı"}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              <Select
                                defaultValue={order.status}
                                onValueChange={(val) => handleUpdateOrderStatus(order.id, val)}
                              >
                                <SelectTrigger className="w-[140px]">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="pending">Bekliyor</SelectItem>
                                  <SelectItem value="paid">Ödendi</SelectItem>
                                  <SelectItem value="shipped">Kargoda</SelectItem>
                                  <SelectItem value="delivered">Teslim Edildi</SelectItem>
                                  <SelectItem value="cancelled">İptal</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                            <TableCell className="text-sm text-muted-foreground">
                              {new Date(order.created_at).toLocaleDateString("tr-TR")}
                            </TableCell>
                            <TableCell className="text-right">
                              <Dialog>
                                <DialogTrigger asChild>
                                  <Button variant="outline" size="sm">Detay</Button>
                                </DialogTrigger>
                                <DialogContent className="max-w-2xl">
                                  <DialogHeader>
                                    <DialogTitle>Sipariş Detayları</DialogTitle>
                                    <DialogDescription>
                                      Sipariş No: {order.id}
                                    </DialogDescription>
                                  </DialogHeader>
                                  <div className="space-y-4">
                                    <div>
                                      <h4 className="font-semibold mb-2">Müşteri Bilgileri</h4>
                                      <p className="text-sm">
                                        <strong>Ad:</strong> {order.profiles?.full_name}
                                      </p>
                                      <p className="text-sm">
                                        <strong>Email:</strong> {order.profiles?.email}
                                      </p>
                                      <p className="text-sm">
                                        <strong>Telefon:</strong> {order.shipping_phone}
                                      </p>
                                    </div>
                                    <div>
                                      <h4 className="font-semibold mb-2">Teslimat Adresi</h4>
                                      <p className="text-sm">{order.shipping_address}</p>
                                      <p className="text-sm">
                                        {order.shipping_city} {order.shipping_zip}
                                      </p>
                                    </div>
                                    {order.notes && (
                                      <div>
                                        <h4 className="font-semibold mb-2">Sipariş Notu</h4>
                                        <p className="text-sm text-muted-foreground">{order.notes}</p>
                                      </div>
                                    )}
                                  </div>
                                </DialogContent>
                              </Dialog>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </CardContent>
                </Card>
              </TabsContent>
            </Tabs>
          </div>
        </main>
      </div>
    </>
  );
}