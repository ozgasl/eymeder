import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { getProvider } from "@/lib/payments/registry";
import { buildEventRow, isUniqueViolation, planOrderUpdate } from "@/lib/payments/callbackLogic";

// Provider webhook / return endpoint. Authenticity is the adapter's job
// (handleCallback must verify the provider's signature and throw otherwise).
// Idempotent: payment_events has UNIQUE(provider, provider_event_id), so a
// repeated delivery is acknowledged with 200 and not processed again.
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const providerId = typeof req.query.provider === "string" ? req.query.provider : "";
  const provider = getProvider(providerId);
  if (!provider) {
    return res.status(404).json({ error: "Ödeme yöntemi bulunamadı." });
  }
  if (!provider.enabled()) {
    return res.status(501).json({ error: `${provider.label} ödeme yöntemi henüz etkin değil.` });
  }

  let result;
  try {
    result = await provider.handleCallback(req);
  } catch {
    return res.status(400).json({ error: "Geçersiz ödeme bildirimi." });
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("id, status, payment_status")
    .eq("id", result.orderId)
    .maybeSingle();

  if (orderError) {
    return res.status(500).json({ error: "Sipariş okunamadı." });
  }
  if (!order) {
    return res.status(404).json({ error: "Sipariş bulunamadı." });
  }

  const { error: eventError } = await supabaseAdmin
    .from("payment_events")
    .insert(buildEventRow(provider.id, result));

  if (isUniqueViolation(eventError)) {
    return res.status(200).json({ received: true, duplicate: true });
  }
  if (eventError) {
    return res.status(500).json({ error: "Ödeme olayı kaydedilemedi." });
  }

  const patch = planOrderUpdate(order, result);
  if (patch) {
    // Guard on the payment_status we read so a concurrent callback can't be overwritten.
    const { error: updateError } = await supabaseAdmin
      .from("orders")
      .update(patch)
      .eq("id", order.id)
      .eq("payment_status", order.payment_status);

    if (updateError) {
      // Drop the event so the provider's retry is processed instead of skipped as a duplicate.
      await supabaseAdmin
        .from("payment_events")
        .delete()
        .eq("provider", provider.id)
        .eq("provider_event_id", result.providerEventId);
      return res.status(500).json({ error: "Sipariş güncellenemedi." });
    }
  }

  return res.status(200).json({ received: true });
}
