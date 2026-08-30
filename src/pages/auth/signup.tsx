import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { SEO } from "@/components/SEO";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const [fullName, setFullName] = useState("");
  const [graduationYear, setGraduationYear] = useState("");
  const [schoolNumber, setSchoolNumber] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [kvkkAccepted, setKvkkAccepted] = useState(false);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    if (!fullName || !graduationYear || !schoolNumber || !phone || !email || !password) {
      toast({ title: "Hata", description: "Lütfen tüm alanları doldurun", variant: "destructive" });
      return;
    }

    if (!kvkkAccepted) {
      toast({ title: "Hata", description: "Devam etmek için KVKK Aydınlatma Metni'ni onaylamanız gerekiyor", variant: "destructive" });
      return;
    }

    if (password.length < 6) {
      toast({ title: "Hata", description: "Şifre en az 6 karakter olmalıdır", variant: "destructive" });
      return;
    }

    if (password !== confirmPassword) {
      toast({ title: "Hata", description: "Şifreler eşleşmiyor", variant: "destructive" });
      return;
    }

    setLoading(true);

    try {
      const res = await fetch("/api/auth/request-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, purpose: "signup" }),
      });
      const data = await res.json();

      if (!res.ok) {
        toast({ title: "Hata", description: data.error || "Kod gönderilemedi", variant: "destructive" });
        setLoading(false);
        return;
      }

      sessionStorage.setItem(
        "pendingSignup",
        JSON.stringify({
          fullName,
          graduationYear: Number(graduationYear),
          schoolNumber,
          phone,
          email,
          password,
        })
      );

      toast({ title: "Kod gönderildi", description: "E-postanıza gelen 6 haneli kodu girin" });
      router.push("/auth/verify-code");
    } catch (err: any) {
      toast({ title: "Hata", description: err.message || "Bir hata oluştu", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO title="Kayıt Ol - Mezunlar Derneği" description="Mezunlar ağına katılın" />

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl font-heading font-bold text-center">Kayıt Ol</CardTitle>
            <CardDescription className="text-center">
              Mezunlar ağına katılın ve bağlantılar kurun
            </CardDescription>
          </CardHeader>

          <CardContent>
            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="fullname">Ad Soyad</Label>
                <Input id="fullname" type="text" placeholder="Ad Soyad" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="graduation-year">Mezuniyet Yılı</Label>
                <Input id="graduation-year" type="number" placeholder="2015" min={1950} max={2100} value={graduationYear} onChange={(e) => setGraduationYear(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="school-number">Okul Numarası</Label>
                <Input id="school-number" type="text" placeholder="Okul numaranız" value={schoolNumber} onChange={(e) => setSchoolNumber(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefon</Label>
                <Input id="phone" type="tel" placeholder="+90 555 123 45 67" value={phone} onChange={(e) => setPhone(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-email">E-posta Adresi</Label>
                <Input id="signup-email" type="email" placeholder="ornek@email.com" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">Şifre</Label>
                <Input id="signup-password" type="password" placeholder="En az 6 karakter" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Şifre Tekrar</Label>
                <Input id="confirm-password" type="password" placeholder="Şifrenizi tekrar girin" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
              </div>

              <div className="flex items-start gap-2 pt-1">
                <Checkbox
                  id="kvkk-consent"
                  checked={kvkkAccepted}
                  onCheckedChange={(checked) => setKvkkAccepted(checked === true)}
                  className="mt-0.5"
                />
                <Label htmlFor="kvkk-consent" className="text-sm font-normal leading-snug text-muted-foreground">
                  <Link href="/kvkk" target="_blank" className="text-primary hover:underline">
                    KVKK Aydınlatma Metni'ni
                  </Link>{" "}
                  okudum, kişisel verilerimin belirtilen kapsamda işlenmesini kabul ediyorum.
                </Label>
              </div>

              <Button type="submit" className="w-full" disabled={loading || !kvkkAccepted}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Kod Gönder
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex justify-center">
            <div className="text-sm text-center text-muted-foreground">
              Zaten hesabınız var mı?{" "}
              <Link href="/auth/login" className="text-primary hover:underline font-medium">
                Giriş Yapın
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}
