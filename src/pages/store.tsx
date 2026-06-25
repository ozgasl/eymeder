import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { productService } from "@/services/productService";
import { cartService } from "@/services/cartService";
import { ShoppingCart, Search, Package, Star, Filter, Loader2, ShoppingBag } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function StorePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [products, setProducts] = useState<any[]>([]);
  const [filteredProducts, setFilteredProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [cartCount, setCartCount] = useState(0);
  const [addingToCart, setAddingToCart] = useState<string | null>(null);

  useEffect(() => {
    loadProducts();
    loadCartCount();
  }, []);

  useEffect(() => {
    filterProducts();
  }, [products, searchQuery, categoryFilter]);

  const loadProducts = async () => {
    const { data } = await productService.getProducts();
    if (data) {
      setProducts(data);
    }
    setLoading(false);
  };

  const loadCartCount = async () => {
    const { itemCount } = await cartService.getCartTotal();
    setCartCount(itemCount);
  };

  const filterProducts = () => {
    let filtered = [...products];

    if (searchQuery) {
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          p.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (categoryFilter !== "all") {
      filtered = filtered.filter((p) => p.category === categoryFilter);
    }

    setFilteredProducts(filtered);
  };

  const handleAddToCart = async (productId: string) => {
    setAddingToCart(productId);
    const { error } = await cartService.addToCart(productId, 1);
    
    if (error) {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
    } else {
      toast({
        title: "Sepete Eklendi",
        description: "Ürün başarıyla sepete eklendi",
      });
      loadCartCount();
    }
    setAddingToCart(null);
  };

  const categories = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);

  return (
    <>
      <Head>
        <SEO 
          title="Mezun Store - Eyüboğlu Mezunlar Derneği" 
          description="Mezunlara özel ürünler ve hediyelik eşyalar"
        />
      </Head>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container py-8" role="main">
          {/* Header */}
          <div className="mb-8">
            <div className="flex items-center justify-between flex-wrap gap-4">
              <div>
                <h1 className="text-4xl font-bold mb-2 flex items-center gap-3">
                  <ShoppingBag className="h-10 w-10 text-primary" aria-hidden="true" />
                  Mezun Store
                </h1>
                <p className="text-muted-foreground">
                  Mezunlara özel ürünler ve hediyelik eşyalar
                </p>
              </div>
              <Button 
                size="lg" 
                onClick={() => router.push("/store/cart")}
                className="gap-2 relative focus:ring-2 focus:ring-primary focus:ring-offset-2"
                aria-label={`Sepet, ${cartCount} ürün`}
              >
                <ShoppingCart className="h-5 w-5" aria-hidden="true" />
                Sepet
                {cartCount > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-6 w-6 flex items-center justify-center p-0" aria-label={`${cartCount} ürün`}>
                    {cartCount}
                  </Badge>
                )}
              </Button>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Filters Sidebar */}
            <aside className="lg:col-span-1" role="search" aria-label="Ürün arama ve filtreleme">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Filter className="h-5 w-5" aria-hidden="true" />
                    Filtreler
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="search">Ürün Ara</Label>
                    <div className="relative">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" aria-hidden="true" />
                      <Input
                        id="search"
                        placeholder="Ara..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        aria-label="Ürün adı veya açıklama ara"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="category">Kategori</Label>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                      <SelectTrigger id="category" aria-label="Kategoriye göre filtrele">
                        <SelectValue placeholder="Tüm kategoriler" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">Tüm Kategoriler</SelectItem>
                        {categories.map((cat) => (
                          <SelectItem key={cat} value={cat}>
                            {cat}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      setSearchQuery("");
                      setCategoryFilter("all");
                    }}
                    aria-label="Tüm filtreleri temizle"
                  >
                    Filtreleri Temizle
                  </Button>
                </CardContent>
              </Card>
            </aside>

            {/* Products Grid */}
            <section className="lg:col-span-3" aria-label="Ürün listesi">
              {loading ? (
                <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  <span className="sr-only">Ürünler yükleniyor...</span>
                </div>
              ) : filteredProducts.length === 0 ? (
                <Card>
                  <CardContent className="py-12 text-center">
                    <Package className="h-16 w-16 mx-auto mb-4 text-muted-foreground" aria-hidden="true" />
                    <h3 className="font-semibold mb-2">Henüz Ürün Yok</h3>
                    <p className="text-sm text-muted-foreground">
                      {searchQuery || categoryFilter !== "all"
                        ? "Filtreleri değiştirmeyi deneyin"
                        : "Yakında ürünler eklenecek!"}
                    </p>
                  </CardContent>
                </Card>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6" role="list">
                  {filteredProducts.map((product) => (
                    <article key={product.id} role="listitem">
                      <Card className="h-full flex flex-col hover:shadow-lg transition-shadow focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2">
                        {/* Product Image */}
                        {product.image_url ? (
                          <div className="h-48 bg-muted rounded-t-lg overflow-hidden">
                            <img
                              src={product.image_url}
                              alt={product.name}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ) : (
                          <div className="h-48 bg-gradient-to-br from-primary/10 to-accent/10 rounded-t-lg flex items-center justify-center">
                            <Package className="h-16 w-16 text-muted-foreground" aria-hidden="true" />
                          </div>
                        )}

                        <CardHeader className="flex-1">
                          <div className="flex items-start justify-between gap-2 mb-2">
                            <CardTitle className="text-lg">{product.name}</CardTitle>
                            {product.featured && (
                              <Badge className="bg-yellow-500 hover:bg-yellow-600" aria-label="Öne çıkan ürün">
                                <Star className="h-3 w-3 mr-1" aria-hidden="true" />
                                Öne Çıkan
                              </Badge>
                            )}
                          </div>
                          {product.category && (
                            <Badge variant="secondary" className="w-fit">
                              {product.category}
                            </Badge>
                          )}
                          {product.description && (
                            <CardDescription className="mt-2 line-clamp-2">
                              {product.description}
                            </CardDescription>
                          )}
                        </CardHeader>

                        <CardFooter className="flex flex-col gap-3">
                          <div className="w-full flex items-center justify-between">
                            <span className="text-2xl font-bold text-primary">
                              {product.price.toLocaleString("tr-TR")} ₺
                            </span>
                            {product.stock_quantity !== null && (
                              <span className="text-sm text-muted-foreground">
                                Stok: {product.stock_quantity}
                              </span>
                            )}
                          </div>
                          <Button
                            className="w-full gap-2"
                            onClick={() => handleAddToCart(product.id)}
                            disabled={
                              addingToCart === product.id ||
                              (product.stock_quantity !== null && product.stock_quantity <= 0)
                            }
                            aria-label={`${product.name} ürününü sepete ekle`}
                          >
                            {addingToCart === product.id ? (
                              <>
                                <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                                Ekleniyor...
                              </>
                            ) : product.stock_quantity !== null && product.stock_quantity <= 0 ? (
                              "Stokta Yok"
                            ) : (
                              <>
                                <ShoppingCart className="h-4 w-4" aria-hidden="true" />
                                Sepete Ekle
                              </>
                            )}
                          </Button>
                        </CardFooter>
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