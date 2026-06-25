import { useState } from "react";
import { useRouter } from "next/router";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { SEO } from "@/components/SEO";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        setError(error.message);
      } else if (data.user) {
        router.push("/");
      }
    } catch (err: any) {
      setError(err.message || "Giriş başarısız");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <SEO title="Giriş Yap - Mezunlar Derneği" description="Mezunlar ağınıza erişin" />
      
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <Card className="w-full max-w-md shadow-xl">
          <CardHeader className="space-y-1">
            <CardTitle className="text-3xl font-heading font-bold text-center">Giriş Yap</CardTitle>
            <CardDescription className="text-center">
              Mezunlar ağınıza erişin
            </CardDescription>
          </CardHeader>

          <CardContent>
            {error && (
              <Alert variant="destructive" className="mb-4">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleLogin} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="login-email">E-posta</Label>
                <Input
                  id="login-email"
                  type="email"
                  placeholder="ornek@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="login-password">Şifre</Label>
                <Input
                  id="login-password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Giriş Yap
              </Button>
            </form>
          </CardContent>

          <CardFooter className="flex justify-center">
            <div className="text-sm text-center text-muted-foreground">
              Hesabınız yok mu?{" "}
              <Link href="/auth/signup" className="text-primary hover:underline font-medium">
                Kayıt Olun
              </Link>
            </div>
          </CardFooter>
        </Card>
      </div>
    </>
  );
}