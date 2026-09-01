import type { NextApiRequest, NextApiResponse } from "next";
import { listUpcomingFonzipEvents } from "@/lib/fonzipClient";
import { withTimeout } from "@/lib/withTimeout";

// Server-side proxy for Fonzip's /events endpoint: keeps FONZIP_CLIENT_ID/
// SECRET off the client, and never blocks the events page if Fonzip is slow
// or unreachable.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  try {
    const events = await withTimeout(listUpcomingFonzipEvents(), 5000, []);
    return res.status(200).json({ events });
  } catch (error) {
    console.error("Fonzip events fetch failed:", error);
    return res.status(200).json({ events: [] });
  }
}
