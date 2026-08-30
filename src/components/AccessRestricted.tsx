import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Lock, ShieldAlert } from "lucide-react";

interface AccessRestrictedProps {
  /** membership: gated behind paid "dernek üyesi" tier. staff: gated behind admin/moderator role. */
  variant?: "membership" | "staff";
  featureName: string;
}

export function AccessRestricted({ variant = "membership", featureName }: AccessRestrictedProps) {
  const isMembership = variant === "membership";

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
          <CardContent>
            <Button asChild>
              <a href="https://fonzip.com/eymeder/odeme" target="_blank" rel="noopener noreferrer">
                Aidatımı Öde
              </a>
            </Button>
          </CardContent>
        )}
      </Card>
    </main>
  );
}
