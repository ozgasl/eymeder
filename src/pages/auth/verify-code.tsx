import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SEO } from "@/components/SEO";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface PendingSignup {
  fullName: string;
  graduationYear: number;
  schoolNumber: string;
  phone: string;
  email: string;
  password: string;
}

export default function VerifyCodePage() {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState<PendingSignup | null>(null);
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [resending, setResending] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem("pendingSignup");
    if (!stored) {
      toast({ title: "Kayıt bilgisi bulunamadı", description: "Lütfen önce kayıt formunu doldurun", variant: "destructive" });
      router.replace("/auth/signup");
      return;
    }
    setPending(JSON.parse(stored));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending || loading) return;

    setLoading(true);
    try {
      const res = await fetch("/api/auth/verify-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...pending, code }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({ title: "Doğrulama başarısız", description: data.error || "Kod hatalı", variant: "destructive" });
        setLoading(false);
        return;
      }

      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: pending.email,
        password: pending.password,
      });

      localStorage.removeItem("pendingSignup");

      if (signInError) {
        toast({ title: "Hesap oluşturuldu", description: "Lütfen giriş yapın" });
        router.push("/auth/login");
        return;
      }

      toast({ title: "Kayıt tamamlandı! 🎉", description: "Hoş geldiniz" });
      router.push("/");
    } catch (err: any) {
      toast({ title: "Hata", description: err.message || "Bir hata oluştu", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (!pending || resending) return;
    setResending(true);
    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pending.email, purpose: "signup" }),
      });
      const data = await res.json();
      if (!res.ok) {
        toast({ title: "Hata", description: data.error || "Kod gönderilemedi", variant: "destructive" });
      } else {
        toast({ title: "Kod yeniden gönderildi" });
      }
    } catch (err: any) {
      toast({ title: "Hata", description: err.message || "Bir hata oluştu", variant: "destructive" });
    } finally {
      setResending(false);
    }
  };

  if (!pending) return null;

  return (
    <>
      <SEO title="Kodu Doğrula - Mezunlar Derneği" description="E-postanıza gelen kodu girin" />

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl font-heading font-bold text-center">Kodu Doğrula</CardTitle>
            <CardDescription className="text-center">
              {pending.email} adresine gönderilen 6 haneli kodu girin
            </CardDescription>
          </CardHeader>

          <CardContent className="space-y-4">
            <form onSubmit={handleVerify} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="otp-code">Doğrulama Kodu</Label>
                <Input
                  id="otp-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Doğrula
              </Button>
            </form>

            <Button variant="ghost" className="w-full" onClick={handleResend} disabled={resending}>
              {resending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Kodu Tekrar Gönder
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
