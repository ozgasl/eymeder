import { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { BadgeCheck, Loader2, RefreshCw } from "lucide-react";
import { profileService } from "@/services/profileService";

interface MembershipStatusCardProps {
  tier: string | null;
  fonzipCheckedAt: string | null;
}

function formatCheckedAt(value: string | null): string | null {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleString("tr-TR", { dateStyle: "long", timeStyle: "short" });
}

/**
 * The member's own tier on the profile page, and — for a mezun_uye — the
 * "Üyeliğimi tekrar kontrol et" button. Their tier is otherwise only refreshed
 * at signup and when staff press "Fonzip yeniden kontrol" in the admin panel,
 * so someone who just paid their dues would stay locked out until then.
 */
export function MembershipStatusCard({ tier, fonzipCheckedAt }: MembershipStatusCardProps) {
  const isDernekUyesi = tier === "dernek_uyesi";
  const checkedAt = formatCheckedAt(fonzipCheckedAt);
  const [rechecking, setRechecking] = useState(false);
  const [recheckMessage, setRecheckMessage] = useState<string | null>(null);

  const handleRecheck = async () => {
    setRechecking(true);
    setRecheckMessage(null);
    const { tier: newTier, error } = await profileService.recheckMyMembership();

    if (newTier === "dernek_uyesi") {
      setRecheckMessage("Dernek üyeliğiniz doğrulandı, sayfa yenileniyor…");
      // The navigation and every gated page read the tier once on mount.
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
    <Card className="max-w-3xl mx-auto mb-6">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BadgeCheck className="h-6 w-6" aria-hidden="true" />
          Üyelik Durumu
        </CardTitle>
        <CardDescription>Dernek üyeliğiniz Fonzip kayıtlarınızdan belirlenir.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <Badge variant={isDernekUyesi ? "default" : "secondary"}>
            {isDernekUyesi ? "Dernek Üyesi" : "Mezun Üye"}
          </Badge>
          {checkedAt && <span className="text-sm text-muted-foreground">Son kontrol: {checkedAt}</span>}
        </div>

        {!isDernekUyesi && (
          <>
            <p className="text-sm text-muted-foreground">
              Mesajlar, indirimli markalar gibi özellikler dernek üyelerine özel. Aidatınızı ödediyseniz
              üyeliğinizi buradan tekrar kontrol edebilirsiniz.
            </p>
            <div className="flex flex-col sm:flex-row gap-3">
              <Button variant="outline" onClick={handleRecheck} disabled={rechecking} className="gap-2">
                {rechecking ? (
                  <Loader2 className="h-4 w-4 animate-spin" aria-hidden="true" />
                ) : (
                  <RefreshCw className="h-4 w-4" aria-hidden="true" />
                )}
                Üyeliğimi tekrar kontrol et
              </Button>
              <Button asChild>
                <Link href="/fonzip-signup">Dernek Üyesi Ol</Link>
              </Button>
            </div>
            <p className="text-sm text-muted-foreground" role="status" aria-live="polite">
              {recheckMessage}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
