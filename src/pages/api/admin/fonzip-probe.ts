import type { NextApiRequest, NextApiResponse } from "next";
import { requireStaff } from "@/lib/requireStaff";
import { runFonzipProbe } from "@/lib/fonzipProbe";

// Pages through every Fonzip user several times (one pass per probed field),
// which is more than the default function limit allows.
export const config = { maxDuration: 60 };

// Read-only. Reports which location/university fields Fonzip returns and how
// its members line up with our profiles, as aggregates only.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const auth = await requireStaff(req);
  if ("error" in auth) {
    return res.status(auth.status).json({ error: auth.error });
  }

  try {
    return res.status(200).json(await runFonzipProbe());
  } catch (err: any) {
    return res.status(502).json({ error: `Fonzip keşfi başarısız: ${err?.message ?? "bilinmeyen hata"}` });
  }
}
