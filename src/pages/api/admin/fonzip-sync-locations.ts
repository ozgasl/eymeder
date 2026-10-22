import type { NextApiRequest, NextApiResponse } from "next";
import { requireStaff } from "@/lib/requireStaff";
import { LocationSyncError, runLocationSync } from "@/lib/fonzipLocationSync";

// Pages through every Fonzip user, then (on apply) writes up to a few hundred rows.
export const config = { maxDuration: 60 };

// Dry run by default: body `{}` only reports what would change. Writing needs
// `{ apply: true, expectedChanges: <changeCount from the dry run> }`.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await requireStaff(req);
  if ("error" in auth) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const { apply, expectedChanges } = (req.body ?? {}) as { apply?: boolean; expectedChanges?: number };

  try {
    return res.status(200).json(await runLocationSync({ apply: apply === true, expectedChanges }));
  } catch (err: any) {
    if (err instanceof LocationSyncError) return res.status(err.status).json({ error: err.message });
    return res.status(502).json({ error: `Fonzip senkronu başarısız: ${err?.message ?? "bilinmeyen hata"}` });
  }
}
