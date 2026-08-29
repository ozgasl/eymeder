import Link from "next/link";
import { SEO } from "@/components/SEO";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function WelcomePage() {
  return (
    <>
      <SEO title="Hoş Geldiniz - Eyüboğlu Mezunlar Derneği" description="Mezunlar ağına katılın" />

      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/5 via-background to-accent/5 p-4">
        <Card className="w-full max-w-md shadow-xl text-center">
          <CardHeader className="space-y-3">
            <img
              src="/logo.jpg"
              alt="Eyüboğlu Mezunlar Derneği logosu"
              className="h-16 w-auto mx-auto"
              onError={(e) => {
                e.currentTarget.style.display = "none";
              }}
            />
            <CardTitle className="text-3xl font-heading font-bold">Eyüboğlu Mezunlar Derneği</CardTitle>
            <CardDescription>Mezunlar ağına hoş geldiniz</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <Button asChild size="lg" className="w-full">
              <Link href="/auth/login">Giriş Yap</Link>
            </Button>
            <Button asChild size="lg" variant="outline" className="w-full">
              <Link href="/auth/signup">Kayıt Ol</Link>
            </Button>
            <Button asChild variant="ghost" className="w-full">
              <Link href="/auth/forgot-password">Şifremi Unuttum</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    </>
  );
}
