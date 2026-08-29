import { useEffect, useState } from "react";
import { useRouter } from "next/router";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { SEO } from "@/components/SEO";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface PendingReset {
  email: string;
}

export default function ResetPasswordPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = useState<PendingReset | null>(null);
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("pendingReset");
    if (!stored) {
      toast({ title: "İstek bulunamadı", description: "Lütfen önce şifremi unuttum formunu doldurun", variant: "destructive" });
      router.replace("/auth/forgot-password");
      return;
    }
    setPending(JSON.parse(stored));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!pending || loading) return;

    if (newPassword.length < 6) {
      toast({ title: "Hata", description: "Şifre en az 6 karakter olmalıdır", variant: "destructive" });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({ title: "Hata", description: "Şifreler eşleşmiyor", variant: "destructive" });
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: pending.email, code, newPassword }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({ title: "Hata", description: data.error || "Şifre güncellenemedi", variant: "destructive" });
        setLoading(false);
        return;
      }

      sessionStorage.removeItem("pendingReset");
      toast({ title: "Şifre güncellendi", description: "Yeni şifrenizle giriş yapabilirsiniz" });
      router.push("/auth/login");
    } catch (err: any) {
      toast({ title: "Hata", description: err.message || "Bir hata oluştu", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  if (!pending) return null;

  return (
    <>
      <SEO title="Şifre Sıfırla - Mezunlar Derneği" description="Yeni şifrenizi belirleyin" />

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl font-heading font-bold text-center">Şifre Sıfırla</CardTitle>
            <CardDescription className="text-center">
              {pending.email} adresine gönderilen kodu ve yeni şifrenizi girin
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="reset-code">Doğrulama Kodu</Label>
                <Input
                  id="reset-code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="new-password">Yeni Şifre</Label>
                <Input id="new-password" type="password" placeholder="En az 6 karakter" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-new-password">Yeni Şifre Tekrar</Label>
                <Input id="confirm-new-password" type="password" placeholder="Şifrenizi tekrar girin" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>

              <Button type="submit" className="w-full" disabled={loading || code.length !== 6}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Şifreyi Güncelle
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
