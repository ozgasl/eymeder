import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { brandCodeService } from "@/services/brandCodeService";
import { describeCodeWindow } from "@/lib/discountCode";
import { Check, Copy, Loader2, Ticket } from "lucide-react";

export interface MemberCodeUsage {
  brand_code_id: string;
  member_code: string | null;
  expires_at: string | null;
  redeemed_at: string | null;
}

export interface BrandCode {
  id: string;
  code: string;
  label: string | null;
  discount_info: string | null;
  is_single_use: boolean;
  is_active: boolean;
  valid_from: string | null;
  valid_until: string | null;
}

interface BrandDiscountCodesProps {
  codes: BrandCode[];
  /** The signed-in member's usage rows, keyed by campaign id. */
  usages: Record<string, MemberCodeUsage>;
  /** How many times the member has used each campaign, keyed by campaign id. */
  useCounts: Record<string, number>;
  /** Called after a personal code is issued so the parent can refresh usages. */
  onIssued: () => void;
}

/**
 * The discount codes a member can use at one brand. Shared codes are hidden
 * behind a "show" button so the reveal counter in the admin panel means
 * something, and stay usable afterwards (each visit is counted separately);
 * single-use campaigns hand each member their own code, once.
 */
export function BrandDiscountCodes({ codes, usages, useCounts, onIssued }: BrandDiscountCodesProps) {
  const { toast } = useToast();
  const [revealed, setRevealed] = useState<Record<string, boolean>>({});
  const [issuing, setIssuing] = useState<string | null>(null);
  const [copied, setCopied] = useState<string | null>(null);

  if (codes.length === 0) return null;

  const copy = async (value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(value);
      setTimeout(() => setCopied((current) => (current === value ? null : current)), 2000);
    } catch {
      toast({ title: "Kopyalanamadı", description: "Kodu elle not alabilirsiniz.", variant: "destructive" });
    }
  };

  const reveal = (code: BrandCode) => {
    setRevealed((current) => ({ ...current, [code.id]: true }));
    brandCodeService.recordView(code.id);
  };

  const issue = async (code: BrandCode) => {
    setIssuing(code.id);
    try {
      const result = await brandCodeService.issueMyCode(code.id);
      setRevealed((current) => ({ ...current, [code.id]: true }));
      toast({
        title: result.reissued ? "Yeni kodunuz hazır" : "Kodunuz hazır",
        description: result.code,
      });
      onIssued();
    } catch (error: any) {
      toast({ title: "Kod alınamadı", description: error.message, variant: "destructive" });
    } finally {
      setIssuing(null);
    }
  };

  return (
    <div className="space-y-3">
      {codes.map((code) => {
        const usage = usages[code.id];
        const validity = describeCodeWindow(code);
        const lastUsedAt = usage?.redeemed_at ?? null;
        const useCount = useCounts[code.id] ?? 0;
        // A shared code can be used again on the next visit, so only a
        // single-use personal code is ever spent for good.
        const isSpent = code.is_single_use && Boolean(lastUsedAt);
        const personalCode = usage?.member_code ?? null;
        const personalExpired = Boolean(
          usage?.expires_at && new Date(usage.expires_at).getTime() < Date.now(),
        );
        const shownCode = code.is_single_use ? personalCode : code.code;
        const canShow = code.is_single_use
          ? Boolean(personalCode) && !personalExpired && !isSpent
          : Boolean(revealed[code.id]);

        return (
          <div key={code.id} className="rounded-lg border border-primary/20 bg-primary/5 p-3 space-y-2">
            <div className="flex items-center gap-2 flex-wrap">
              <Ticket className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">{code.label || "İndirim Kodu"}</span>
              {code.is_single_use && <Badge variant="outline" className="text-xs">Size özel, tek kullanım</Badge>}
              {isSpent && <Badge variant="secondary" className="text-xs">Kullanıldı</Badge>}
              {!code.is_single_use && useCount > 0 && (
                <Badge variant="secondary" className="text-xs">{useCount} kez kullandınız</Badge>
              )}
            </div>

            {code.discount_info && <p className="text-sm text-muted-foreground">{code.discount_info}</p>}

            {isSpent && lastUsedAt ? (
              <p className="text-xs text-muted-foreground">
                Bu kodu {new Date(lastUsedAt).toLocaleDateString("tr-TR")} tarihinde kullandınız.
              </p>
            ) : canShow && shownCode ? (
              <div className="flex items-center gap-2 flex-wrap">
                <code className="font-mono text-lg font-bold text-primary tracking-wider">{shownCode}</code>
                <Button size="sm" variant="outline" onClick={() => copy(shownCode)} className="gap-1">
                  {copied === shownCode ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
                  {copied === shownCode ? "Kopyalandı" : "Kopyala"}
                </Button>
              </div>
            ) : code.is_single_use ? (
              <Button size="sm" onClick={() => issue(code)} disabled={issuing === code.id} className="gap-2">
                {issuing === code.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Ticket className="h-4 w-4" />}
                {personalExpired ? "Yeni Kod Al" : "Bana Özel Kod Al"}
              </Button>
            ) : (
              <Button size="sm" variant="secondary" onClick={() => reveal(code)}>
                İndirim Kodunu Göster
              </Button>
            )}

            {(validity || (canShow && code.is_single_use && usage?.expires_at)) && !isSpent && (
              <p className="text-xs text-muted-foreground">
                {code.is_single_use && usage?.expires_at && canShow
                  ? `Kodunuz ${new Date(usage.expires_at).toLocaleDateString("tr-TR")} tarihine kadar geçerli`
                  : validity}
              </p>
            )}

            {!code.is_single_use && lastUsedAt && (
              <p className="text-xs text-muted-foreground">
                Son kullanım: {new Date(lastUsedAt).toLocaleDateString("tr-TR")}
              </p>
            )}
          </div>
        );
      })}
    </div>
  );
}
