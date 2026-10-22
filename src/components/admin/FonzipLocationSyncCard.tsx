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
  // Profiles whose own city/country the reviewer keeps instead of Fonzip's.
  const [keepOurs, setKeepOurs] = useState<Set<string>>(new Set());

  const toggleKeep = (profileId: string) =>
    setKeepOurs((prev) => {
      const next = new Set(prev);
      if (next.has(profileId)) next.delete(profileId);
      else next.add(profileId);
      return next;
    });

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
      // Name who is overwritten and who is kept, so a tick on the wrong row is
      // caught here rather than after the write.
      const names = (kept: boolean) =>
        [...new Set((preview?.plan.overwrites ?? []).filter((o) => keepOurs.has(o.profileId) === kept).map((o) => o.name?.trim() || "(adsız)"))];
      const overwritten = names(false);
      const kept = names(true);
      const message = [
        `Fonzip'ten ${n} profil güncellenecek.`,
        overwritten.length ? `Fonzip ile ÜZERİNE YAZILACAK: ${overwritten.join(", ")}` : "Üzerine yazılacak kimse yok.",
        kept.length ? `BİZİMKİ KORUNACAK: ${kept.join(", ")}` : "Korunacak kimse seçilmedi.",
        "Devam edilsin mi?",
      ].join("\n\n");
      if (!window.confirm(message)) return;
    }
    setBusy(kind);
    setError(null);
    try {
      const data = await call(
        kind === "apply"
          ? { apply: true, expectedChanges: preview?.plan.changeCount, keepOurs: [...keepOurs] }
          : {}
      );
      setResult(data);
      if (kind === "preview") {
        setPreview(data);
        setKeepOurs(new Set());
      } else setPreview(null);
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
            {result.mode === "dry-run" && result.plan.overwrites.length > 0 && (
              <div>
                <p className="font-medium">Üzerine yazılacak değerler (Fonzip kazanır; tutmak istediğinizi işaretleyin)</p>
                <ul className="mt-1 space-y-1">
                  {[...new Set(result.plan.overwrites.map((o) => o.profileId))].map((id) => {
                    const rows = result.plan.overwrites.filter((o) => o.profileId === id);
                    return (
                      <li key={id}>
                        <label className="flex items-start gap-2">
                          <input
                            type="checkbox"
                            className="mt-1"
                            checked={keepOurs.has(id)}
                            onChange={() => toggleKeep(id)}
                          />
                          <span>
                            <strong>{rows[0].name?.trim() || "(adsız)"}</strong>:{" "}
                            {rows.map((o) => `${o.field === "city" ? "şehir" : "ülke"} ${o.from} → ${o.to}`).join(", ")}
                            {keepOurs.has(id) ? " (bizimki korunacak)" : ""}
                          </span>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </div>
            )}
            {result.mode === "dry-run" && result.plan.graduationYearDiffers.length > 0 && (
              <div>
                <p className="font-medium">Mezuniyet yılı farklı (yazılmaz, elle bakın)</p>
                <ul className="list-disc pl-5 text-muted-foreground">
                  {result.plan.graduationYearDiffers.map((d, i) => (
                    <li key={i}>
                      {d.name?.trim() || "(adsız)"}: bizde {d.ours}, Fonzip'te {d.fonzip}
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {result.mode === "dry-run" && result.plan.universityMappings.length > 0 && (
              <details>
                <summary className="cursor-pointer">Üniversite eşlemeleri ({result.plan.universityMappings.length})</summary>
                <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                  {result.plan.universityMappings.map((m, i) => (
                    <li key={i}>
                      "{m.from}" → {m.university}
                      {m.department ? ` / ${m.department}` : ""}
                      {m.count > 1 ? ` (${m.count})` : ""}
                    </li>
                  ))}
                </ul>
              </details>
            )}
            {result.mode === "dry-run" &&
              (result.plan.unresolvedPlaces.length > 0 || result.plan.unmatchedUniversities.length > 0) && (
                <details>
                  <summary className="cursor-pointer">
                    Eşleşmeyen, yazılmayacak metinler ({result.plan.unresolvedPlaces.length + result.plan.unmatchedUniversities.length})
                  </summary>
                  <ul className="mt-1 list-disc pl-5 text-muted-foreground">
                    {result.plan.unresolvedPlaces.map((v, i) => (
                      <li key={`p${i}`}>
                        şehir: "{v.value}"{v.count > 1 ? ` (${v.count})` : ""}
                      </li>
                    ))}
                    {result.plan.unmatchedUniversities.map((v, i) => (
                      <li key={`u${i}`}>
                        üniversite: "{v.value}"{v.count > 1 ? ` (${v.count})` : ""}
                      </li>
                    ))}
                  </ul>
                </details>
              )}
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
