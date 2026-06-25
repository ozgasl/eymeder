import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import Head from "next/head";
import Link from "next/link";
import { SEO } from "@/components/SEO";
import { Navigation } from "@/components/Navigation";
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { cartService } from "@/services/cartService";
import { ShoppingCart, Trash2, Plus, Minus, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CartPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    const { data } = await cartService.getCart();
    if (data) {
      setCartItems(data);
    }
    setLoading(false);
  };

  const handleUpdateQuantity = async (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    setUpdating(itemId);
    const { error } = await cartService.updateQuantity(itemId, newQuantity);
    
    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } else {
      loadCart();
    }
    setUpdating(null);
  };

  const handleRemoveItem = async (itemId: string) => {
    setUpdating(itemId);
    const { error } = await cartService.removeFromCart(itemId);
    
    if (error) {
      toast({ title: "Hata", description: error.message, variant: "destructive" });
    } else {
      toast({ title: "Ürün Kaldırıldı" });
      loadCart();
    }
    setUpdating(null);
  };

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + item.products.price * item.quantity, 0);
  };

  return (
    <>
      <Head>
        <SEO title="Sepet - Mezun Store" />
      </Head>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container py-8" role="main">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="mb-8">
              <Button
                variant="ghost"
                onClick={() => router.push("/store")}
                className="mb-4 gap-2 focus:ring-2 focus:ring-primary focus:ring-offset-2"
                aria-label="Alışverişe devam et"
              >
                <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                Alışverişe Devam
              </Button>
              <h1 className="text-4xl font-bold flex items-center gap-3">
                <ShoppingCart className="h-10 w-10 text-primary" aria-hidden="true" />
                Sepetim
              </h1>
            </div>

            {loading ? (
              <div className="flex items-center justify-center py-12" role="status" aria-live="polite">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <span className="sr-only">Sepet yükleniyor...</span>
              </div>
            ) : cartItems.length === 0 ? (
              <Card>
                <CardContent className="py-12 text-center">
                  <ShoppingCart className="h-16 w-16 mx-auto mb-4 text-muted-foreground" aria-hidden="true" />
                  <h3 className="font-semibold mb-2">Sepetiniz Boş</h3>
                  <p className="text-sm text-muted-foreground mb-6">
                    Alışverişe başlamak için mağazamızı ziyaret edin
                  </p>
                  <Button onClick={() => router.push("/store")} aria-label="Mağazaya git">
                    Mağazaya Git
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {/* Cart Items */}
                <Card>
                  <CardHeader>
                    <CardTitle>Sepet Ürünleri ({cartItems.length})</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {cartItems.map((item) => (
                      <article
                        key={item.id}
                        className="flex items-center gap-4 pb-4 border-b last:border-0"
                        aria-label={`${item.products.name}, ${item.quantity} adet`}
                      >
                        {/* Product Image */}
                        {item.products.image_url ? (
                          <img
                            src={item.products.image_url}
                            alt={item.products.name}
                            className="w-20 h-20 object-cover rounded-md"
                          />
                        ) : (
                          <div className="w-20 h-20 bg-muted rounded-md flex items-center justify-center">
                            <ShoppingCart className="h-8 w-8 text-muted-foreground" aria-hidden="true" />
                          </div>
                        )}

                        {/* Product Info */}
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold truncate">{item.products.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {item.products.price.toLocaleString("tr-TR")} ₺
                          </p>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-2" role="group" aria-label="Ürün miktarı">
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity - 1)}
                            disabled={item.quantity <= 1 || updating === item.id}
                            aria-label="Miktarı azalt"
                          >
                            <Minus className="h-4 w-4" aria-hidden="true" />
                          </Button>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => {
                              const val = parseInt(e.target.value);
                              if (val > 0) handleUpdateQuantity(item.id, val);
                            }}
                            className="w-16 text-center"
                            min="1"
                            aria-label="Miktar"
                          />
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleUpdateQuantity(item.id, item.quantity + 1)}
                            disabled={updating === item.id}
                            aria-label="Miktarı artır"
                          >
                            <Plus className="h-4 w-4" aria-hidden="true" />
                          </Button>
                        </div>

                        {/* Subtotal */}
                        <div className="text-right min-w-[100px]">
                          <p className="font-semibold">
                            {(item.products.price * item.quantity).toLocaleString("tr-TR")} ₺
                          </p>
                        </div>

                        {/* Remove Button */}
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleRemoveItem(item.id)}
                          disabled={updating === item.id}
                          className="text-destructive hover:text-destructive hover:bg-destructive/10 focus:ring-2 focus:ring-destructive focus:ring-offset-2"
                          aria-label={`${item.products.name} ürününü sepetten kaldır`}
                        >
                          {updating === item.id ? (
                            <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                          ) : (
                            <Trash2 className="h-4 w-4" aria-hidden="true" />
                          )}
                        </Button>
                      </article>
                    ))}
                  </CardContent>
                </Card>

                {/* Order Summary */}
                <Card>
                  <CardHeader>
                    <CardTitle>Sipariş Özeti</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Ara Toplam</span>
                      <span>{calculateTotal().toLocaleString("tr-TR")} ₺</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-muted-foreground">Kargo</span>
                      <span>Ödeme sırasında hesaplanacak</span>
                    </div>
                    <div className="border-t pt-2 flex justify-between text-lg font-bold">
                      <span>Toplam</span>
                      <span className="text-primary">{calculateTotal().toLocaleString("tr-TR")} ₺</span>
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button
                      size="lg"
                      className="w-full gap-2 focus:ring-2 focus:ring-primary focus:ring-offset-2"
                      onClick={() => router.push("/store/checkout")}
                      aria-label="Ödemeye geç"
                    >
                      Ödemeye Geç
                      <ArrowRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </CardFooter>
                </Card>
              </div>
            )}
          </div>
        </main>
      </div>
    </>
  );
}