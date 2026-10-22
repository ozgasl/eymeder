import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import type { LocationSyncResult } from "@/lib/fonzipLocationSync";

/**
 * Staff tool: fills members' city, country and university from Fonzip. Always
 * previews first (nothing is written); the apply button only exists for a
 * reviewed preview and passes its change count back so a stale preview is
 * refused. Fonzip values overwrite ours, but only when they map onto our lists.
 */
export function FonzipLocationSyncCard() {
  const [busy, setBusy] = useState<"preview" | "apply" | null>(null);
  const [result, setResult] = useState<LocationSyncResult | null>(null);
  const [preview, setPreview] = useState<LocationSyncResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  const call = async (body: Record<string, unknown>): Promise<LocationSyncResult> => {
    const { data: { session } } = await supabase.auth.getSession();
    const res = await fetch("/api/admin/fonzip-sync-locations", {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${session?.access_token || ""}` },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "İşlem başarısız oldu.");
    return data;
  };

  const run = async (kind: "preview" | "apply") => {
    if (kind === "apply") {
      const n = preview?.plan.changeCount ?? 0;
      if (!window.confirm(`Fonzip'ten ${n} profil güncellenecek. Önizlemeyi incelediniz mi? Devam edilsin mi?`)) return;
    }
    setBusy(kind);
    setError(null);
    try {
      const data = await call(kind === "apply" ? { apply: true, expectedChanges: preview?.plan.changeCount } : {});
      setResult(data);
      if (kind === "preview") setPreview(data);
      else setPreview(null);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBusy(null);
    }
  };

  const s = result?.plan.stats;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fonzip'ten konum ve üniversite doldur</CardTitle>
        <CardDescription>
          Önce önizleme: hiçbir şey yazılmaz. Fonzip'te değer varsa ve listelerimize eşleşiyorsa üyenin şehir/ülkesinin
          üzerine yazılır; üniversite yalnızca eklenir, silinmez. Eşleşmeyen metinler yazılmaz, aşağıda listelenir.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" onClick={() => run("preview")} disabled={busy !== null}>
            {busy === "preview" && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            Önizleme
          </Button>
          <Button
            onClick={() => run("apply")}
            disabled={busy !== null || !preview || preview.plan.changeCount === 0}
          >
            {busy === "apply" && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
            Uygula{preview ? ` (${preview.plan.changeCount} profil)` : ""}
          </Button>
        </div>

        {error && <p className="text-sm text-destructive">{error}</p>}

        {result && s && (
          <div className="space-y-2 text-sm">
            <p className="font-medium">{result.mode === "apply" ? "Uygulandı" : "Önizleme (hiçbir şey yazılmadı)"}</p>
            <ul className="list-disc pl-5 text-muted-foreground">
              <li>{s.fonzipUsers} Fonzip kullanıcısı, {s.profiles} profil: {s.matched} eşleşti, {s.unmatched} eşleşmedi</li>
              <li>Şehir: {s.cityFilled} doldurulacak, {s.cityOverwritten} üzerine yazılacak</li>
              <li>Ülke: {s.countryFilled} doldurulacak, {s.countryOverwritten} üzerine yazılacak</li>
              <li>Üniversite: {s.universitiesToAdd} eklenecek, {s.universitiesAlreadyThere} zaten var, {s.junkUniversities} anlamsız metin</li>
              <li>Mezuniyet yılı Fonzip ile farklı: {result.plan.graduationYearDiffers.length} (yazılmaz, aşağıda)</li>
            </ul>
            {result.applied && (
              <p className={result.applied.failures.length ? "text-destructive" : "text-muted-foreground"}>
                {result.applied.updatedProfiles.length} profil güncellendi, {result.applied.insertedUniversities.length} üniversite eklendi,{" "}
                {result.applied.failures.length} hata.
              </p>
            )}
            <details>
              <summary className="cursor-pointer">Ayrıntılı rapor (JSON)</summary>
              <pre className="mt-2 max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs" aria-label="Fonzip senkron raporu">
                {JSON.stringify(result, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
