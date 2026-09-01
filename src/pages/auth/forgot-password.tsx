import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { SEO } from "@/components/SEO";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function ForgotPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;
    setLoading(true);

    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "password_reset" }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({ title: "Hata", description: data.error || "Kod gönderilemedi", variant: "destructive" });
        setLoading(false);
        return;
      }

      localStorage.setItem("pendingReset", JSON.stringify({ email }));
      toast({ title: "Kod gönderildi", description: "E-postanıza gelen 6 haneli kodu girin" });
      router.push("/auth/reset-password");
    } catch (err: any) {
      toast({ title: "Hata", description: err.message || "Bir hata oluştu", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO title="Şifremi Unuttum - Mezunlar Derneği" description="Şifrenizi sıfırlayın" />

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl font-heading font-bold text-center">Şifremi Unuttum</CardTitle>
            <CardDescription className="text-center">
              E-posta adresinize bir doğrulama kodu göndereceğiz
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="forgot-email">E-posta</Label>
                <Input id="forgot-email" type="email" placeholder="ornek@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kod Gönder
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex justify-center">
            <div className="text-sm text-center text-muted-foreground">
              <Link href="/auth/login" className="text-primary hover:underline font-medium">
                Giriş sayfasına dön
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
