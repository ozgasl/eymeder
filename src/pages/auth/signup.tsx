import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SEO } from "@/components/SEO";
import { signupWithMembershipNumber } from "@/services/authService";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { authService } from "@/services/authService";

export default function SignupPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [membershipNumber, setMembershipNumber] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    // Basic validation
    if (!email || !password || !membershipNumber) {
      toast({
        title: "Hata",
        description: "Lütfen tüm alanları doldurun",
        variant: "destructive",
      });
      return;
    }

    if (password.length < 6) {
      toast({
        title: "Hata",
        description: "Şifre en az 6 karakter olmalıdır",
        variant: "destructive",
      });
      return;
    }

    if (membershipNumber.length !== 8) {
      toast({
        title: "Hata",
        description: "Üyelik numarası 8 haneli olmalıdır",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);

    try {
      // Step 1: Validate membership number
      const validationRes = await fetch("/api/validate-membership", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          membershipNumber,
        }),
      });

      const validationData = await validationRes.json();
      console.log("Validation result:", validationData);

      if (!validationData.valid) {
        toast({
          title: "Üyelik Doğrulanamadı",
          description: validationData.message || "Email ve üyelik numarası eşleşmiyor",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Step 2: Create auth account
      const { user, error: authError } = await authService.signUp(
        email,
        password
      );

      if (authError || !user) {
        toast({
          title: "Kayıt Hatası",
          description: authError?.message || "Kayıt oluşturulamadı",
          variant: "destructive",
        });
        setLoading(false);
        return;
      }

      // Step 3: Create profile with membership number
      const { error: profileError } = await supabase
        .from("profiles")
        .update({
          full_name: validationData?.fullName || email.split("@")[0],
          email,
          membership_number: membershipNumber,
        })
        .eq("id", user.id);

      if (profileError) {
        console.error("Profile update error:", profileError);
      }

      // Step 4: Mark membership number as used
      await supabase
        .from("membership_numbers")
        .update({ 
          is_used: true,
          used_by: user.id 
        })
        .eq("membership_number", membershipNumber);

      // Step 5: Generate QR code
      const qrCode = `EYMDER-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;
      const { error: qrError } = await supabase
        .from("user_qr_codes")
        .insert({
          user_id: user.id,
          qr_code: qrCode,
        });

      if (qrError) {
        console.error("QR code creation error:", qrError);
      }

      toast({
        title: "Kayıt Başarılı! 🎉",
        description: "Hesabınız oluşturuldu. QR kodunuz otomatik olarak tanımlandı.",
      });

      setTimeout(() => {
        router.push("/profile");
      }, 1500);

    } catch (err: any) {
      console.error("Signup error:", err);
      toast({
        title: "Hata",
        description: err.message || "Bir hata oluştu",
        variant: "destructive",
      });
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
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSignup} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="signup-email">E-posta Adresi</Label>
                <Input
                  id="signup-email"
                  type="email"
                  placeholder="ornek@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-membership">Üyelik Numarası (8 haneli)</Label>
                <Input
                  id="signup-membership"
                  type="text"
                  placeholder="12345678"
                  maxLength={8}
                  value={membershipNumber}
                  onChange={(e) => setMembershipNumber(e.target.value.replace(/\D/g, ""))}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="fullname">Ad Soyad</Label>
                <Input
                  id="fullname"
                  type="text"
                  placeholder="Ad Soyad"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Telefon (Opsiyonel)</Label>
                <Input
                  id="phone"
                  type="tel"
                  placeholder="+90 555 123 45 67"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="signup-password">Şifre</Label>
                <Input
                  id="signup-password"
                  type="password"
                  placeholder="En az 8 karakter"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="confirm-password">Şifre Tekrar</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  placeholder="Şifrenizi tekrar girin"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Hesap Oluştur
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