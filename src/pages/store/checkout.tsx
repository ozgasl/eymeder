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
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { cartService } from "@/services/cartService";
import { orderService } from "@/services/orderService";
import { paymentService } from "@/services/paymentService";
import { CreditCard, Building2, Loader2, CheckCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function CheckoutPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [cartItems, setCartItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [orderComplete, setOrderComplete] = useState(false);
  const [orderId, setOrderId] = useState("");

  // Form fields
  const [paymentMethod, setPaymentMethod] = useState("bank_transfer");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingZip, setShippingZip] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    loadCart();
  }, []);

  const loadCart = async () => {
    const { data } = await cartService.getCart();
    if (data && data.length > 0) {
      setCartItems(data);
    } else {
      router.push("/store");
    }
    setLoading(false);
  };

  const calculateTotal = () => {
    return cartItems.reduce((sum, item) => sum + item.products.price * item.quantity, 0);
  };

  const handleSubmitOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setProcessing(true);

    const { data: order, error } = await orderService.createOrder({
      payment_method: paymentMethod,
      shipping_address: shippingAddress,
      shipping_city: shippingCity,
      shipping_zip: shippingZip,
      shipping_phone: shippingPhone,
      notes,
    });

    if (error) {
      toast({
        title: "Hata",
        description: error.message,
        variant: "destructive",
      });
      setProcessing(false);
      return;
    }

    setOrderId(order.id);

    if (paymentMethod === "iyzico") {
      // Initialize Iyzico payment
      const { success, paymentPageUrl, error: paymentError } = await paymentService.initializeIyzicoPayment({
        orderId: order.id,
        amount: calculateTotal(),
        buyerEmail: order.user_id,
        buyerName: shippingAddress,
        buyerPhone: shippingPhone,
      });

      if (success && paymentPageUrl) {
        window.location.href = paymentPageUrl;
      } else {
        toast({
          title: "Ödeme Hatası",
          description: paymentError || "Iyzico entegrasyonu henüz tamamlanmadı. Havale ile ödeme yapabilirsiniz.",
          variant: "destructive",
        });
        setProcessing(false);
      }
    } else {
      setOrderComplete(true);
      setProcessing(false);
    }
  };

  if (loading) {
    return (
      <>
        <Head>
          <SEO title="Ödeme - Mezun Store" />
        </Head>
        <div className="min-h-screen bg-background">
          <Navigation />
          <main className="container py-8">
            <div className="flex items-center justify-center h-64">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          </main>
        </div>
      </>
    );
  }

  if (orderComplete) {
    const bankInfo = paymentService.getBankInfo();

    return (
      <>
        <Head>
          <SEO title="Sipariş Tamamlandı - Mezun Store" />
        </Head>
        <div className="min-h-screen bg-background">
          <Navigation />
          <main className="container py-8">
            <div className="max-w-2xl mx-auto">
              <Card>
                <CardContent className="pt-6 text-center space-y-6">
                  <div className="flex justify-center">
                    <div className="bg-green-100 p-4 rounded-full">
                      <CheckCircle className="h-16 w-16 text-green-600" />
                    </div>
                  </div>
                  <div>
                    <h1 className="text-2xl font-bold mb-2">Siparişiniz Alındı!</h1>
                    <p className="text-muted-foreground">Sipariş No: {orderId.slice(0, 8)}</p>
                  </div>

                  {paymentMethod === "bank_transfer" && (
                    <Card className="bg-muted/50">
                      <CardHeader>
                        <CardTitle className="text-lg">Banka Hesap Bilgileri</CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-2 text-left">
                        <div>
                          <p className="text-sm font-medium">Banka Adı</p>
                          <p className="text-sm text-muted-foreground">{bankInfo.bankName}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Hesap Adı</p>
                          <p className="text-sm text-muted-foreground">{bankInfo.accountName}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">IBAN</p>
                          <p className="text-sm font-mono">{bankInfo.iban}</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium">Tutar</p>
                          <p className="text-lg font-bold text-primary">
                            {calculateTotal().toLocaleString("tr-TR")} ₺
                          </p>
                        </div>
                        <div className="pt-4 border-t">
                          <p className="text-sm text-muted-foreground">
                            ⚠️ Ödeme dekontunu admin@eymeder.com adresine gönderin.
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex gap-4">
                    <Button variant="outline" onClick={() => router.push("/store")} className="flex-1">
                      Alışverişe Devam
                    </Button>
                    <Button onClick={() => router.push("/profile")} className="flex-1">
                      Siparişlerime Git
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </main>
        </div>
      </>
    );
  }

  return (
    <>
      <Head>
        <SEO title="Ödeme - Mezun Store" />
      </Head>
      <div className="min-h-screen bg-background">
        <Navigation />
        <main className="container py-8">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-3xl font-bold mb-8">Ödeme</h1>

            <form onSubmit={handleSubmitOrder}>
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left: Shipping & Payment */}
                <div className="lg:col-span-2 space-y-6">
                  {/* Shipping Info */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Teslimat Bilgileri</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="shipping_address">Adres *</Label>
                        <Textarea
                          id="shipping_address"
                          value={shippingAddress}
                          onChange={(e) => setShippingAddress(e.target.value)}
                          required
                          rows={3}
                          placeholder="Tam adresinizi girin"
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="shipping_city">Şehir *</Label>
                          <Input
                            id="shipping_city"
                            value={shippingCity}
                            onChange={(e) => setShippingCity(e.target.value)}
                            required
                          />
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="shipping_zip">Posta Kodu</Label>
                          <Input
                            id="shipping_zip"
                            value={shippingZip}
                            onChange={(e) => setShippingZip(e.target.value)}
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="shipping_phone">Telefon *</Label>
                        <Input
                          id="shipping_phone"
                          type="tel"
                          value={shippingPhone}
                          onChange={(e) => setShippingPhone(e.target.value)}
                          required
                          placeholder="+90 555 123 4567"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="notes">Sipariş Notu (Opsiyonel)</Label>
                        <Textarea
                          id="notes"
                          value={notes}
                          onChange={(e) => setNotes(e.target.value)}
                          rows={2}
                          placeholder="Özel talepleriniz varsa belirtin"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Payment Method */}
                  <Card>
                    <CardHeader>
                      <CardTitle>Ödeme Yöntemi</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <RadioGroup value={paymentMethod} onValueChange={setPaymentMethod}>
                        <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                          <RadioGroupItem value="bank_transfer" id="bank_transfer" />
                          <Label htmlFor="bank_transfer" className="flex-1 cursor-pointer flex items-center gap-2">
                            <Building2 className="h-5 w-5" />
                            <div>
                              <p className="font-medium">Havale / EFT</p>
                              <p className="text-sm text-muted-foreground">Banka hesabına havale ile ödeme</p>
                            </div>
                          </Label>
                        </div>
                        <div className="flex items-center space-x-3 border rounded-lg p-4 cursor-pointer hover:bg-muted/50">
                          <RadioGroupItem value="iyzico" id="iyzico" />
                          <Label htmlFor="iyzico" className="flex-1 cursor-pointer flex items-center gap-2">
                            <CreditCard className="h-5 w-5" />
                            <div>
                              <p className="font-medium">Kredi Kartı (Iyzico)</p>
                              <p className="text-sm text-muted-foreground">Güvenli kredi kartı ödemesi</p>
                            </div>
                          </Label>
                        </div>
                      </RadioGroup>
                    </CardContent>
                  </Card>
                </div>

                {/* Right: Order Summary */}
                <div className="lg:col-span-1">
                  <Card className="sticky top-4">
                    <CardHeader>
                      <CardTitle>Sipariş Özeti</CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div className="space-y-2">
                        {cartItems.map((item) => (
                          <div key={item.id} className="flex justify-between text-sm">
                            <span className="text-muted-foreground">
                              {item.products.name} x{item.quantity}
                            </span>
                            <span>{(item.products.price * item.quantity).toLocaleString("tr-TR")} ₺</span>
                          </div>
                        ))}
                      </div>
                      <div className="border-t pt-4 space-y-2">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Ara Toplam</span>
                          <span>{calculateTotal().toLocaleString("tr-TR")} ₺</span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Kargo</span>
                          <span>Ücretsiz</span>
                        </div>
                        <div className="border-t pt-2 flex justify-between font-bold text-lg">
                          <span>Toplam</span>
                          <span className="text-primary">{calculateTotal().toLocaleString("tr-TR")} ₺</span>
                        </div>
                      </div>
                      <Button type="submit" className="w-full" disabled={processing}>
                        {processing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {processing ? "İşleniyor..." : "Siparişi Tamamla"}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </form>
          </div>
        </main>
      </div>
    </>
  );
}