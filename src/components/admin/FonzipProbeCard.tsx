import { useState } from "react";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";

/**
 * Temporary staff tool: asks /api/admin/fonzip-probe which location/university
 * fields Fonzip returns and how its members line up with our profiles. Shows
 * the aggregate JSON as-is; remove once the location sync replaces it.
 */
export function FonzipProbeCard() {
  const [running, setRunning] = useState(false);
  const [report, setReport] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setRunning(true);
    setError(null);
    setReport(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch("/api/admin/fonzip-probe", {
        method: "POST",
        headers: { Authorization: `Bearer ${session?.access_token || ""}` },
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Keşif başarısız oldu.");
      setReport(JSON.stringify(data, null, 2));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setRunning(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fonzip alan keşfi</CardTitle>
        <CardDescription>
          Salt okunur. Fonzip'in ülke, şehir ve üniversite bilgisini verip vermediğini ve üyelerimizle eşleşme
          oranını sayı olarak gösterir; kişi listesi döndürmez. Birkaç saniye sürebilir.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-3">
        <Button onClick={run} disabled={running} variant="outline">
          {running && <Loader2 className="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />}
          Keşfi çalıştır
        </Button>
        {error && <p className="text-sm text-destructive">{error}</p>}
        {report && (
          <pre className="max-h-96 overflow-auto rounded-md bg-muted p-3 text-xs" aria-label="Fonzip keşif raporu">
            {report}
          </pre>
        )}
      </CardContent>
    </Card>
  );
}
