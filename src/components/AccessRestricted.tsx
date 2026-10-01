import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, Lock, RefreshCw, ShieldAlert } from "lucide-react";
import { profileService } from "@/services/profileService";

interface AccessRestrictedProps {
  /** membership: gated behind paid "dernek üyesi" tier. staff: gated behind admin/moderator role. */
  variant?: "membership" | "staff";
  featureName: string;
}

export function AccessRestricted({ variant = "membership", featureName }: AccessRestrictedProps) {
  const isMembership = variant === "membership";
  const [rechecking, setRechecking] = useState(false);
  const [recheckMessage, setRecheckMessage] = useState<string | null>(null);

  // For a member who just paid: their tier is otherwise only refreshed when
  // staff press "Fonzip yeniden kontrol" in the admin panel.
  const handleRecheck = async () => {
    setRechecking(true);
    setRecheckMessage(null);
    const { tier, error } = await profileService.recheckMyMembership();

    if (tier === "dernek_uyesi") {
      setRecheckMessage("Dernek üyeliğiniz doğrulandı, sayfa yenileniyor…");
      // Every gated page reads the tier once on mount (useAccessControl).
      window.location.reload();
      return;
    }

    setRechecking(false);
    setRecheckMessage(
      error ??
        "Fonzip'te henüz dernek üyesi olarak görünmüyorsunuz. Aidatınızı yeni ödediyseniz kaydınızın işlenmesi biraz zaman alabilir.",
    );
  };

  return (
    <main className="container py-16 flex justify-center">
      <Card className="max-w-md w-full text-center">
        <CardHeader>
          <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-muted">
            {isMembership ? (
              <Lock className="h-7 w-7 text-primary" />
            ) : (
              <ShieldAlert className="h-7 w-7 text-primary" />
            )}
          </div>
          <CardTitle>
            {isMembership ? "Bu özellik dernek üyelerine özel" : "Bu özellik yönetim ekibine özel"}
          </CardTitle>
          <CardDescription>
            {isMembership
              ? `${featureName} sadece aidatını ödemiş dernek üyelerimiz tarafından kullanılabilir.`
              : `${featureName} sadece dernek yönetim ekibi tarafından paylaşılabilir.`}
          </CardDescription>
        </CardHeader>
        {isMembership && (
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row justify-center gap-3">
              {/* /fonzip-signup rather than straight to the dues payment: a mezun_uye
                  may never have applied, and that page offers both the
                  application form and the payment. */}
              <Button asChild>
                <Link href="/fonzip-signup">Dernek Üyesi Ol</Link>
              </Button>
              <Button variant="outline" onClick={handleRecheck} disabled={rechecking} className="gap-2">
                {rechecking ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                )}
                Üyeliğimi tekrar kontrol et
              </Button>
            </div>
            <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
              {recheckMessage}
            </p>
          </CardContent>
        )}
      </Card>
    </main>
  );
}
