import type { NextApiRequest, NextApiResponse } from "next";
import { supabaseAdmin } from "@/integrations/supabase/admin";
import { isAuthError, requireSignedIn } from "@/lib/requireMember";
import { getProvider } from "@/lib/payments/registry";

// Starts a payment for one of the caller's own pending orders. The amount is
// always read from orders.total_amount; nothing price-related comes from the client.
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

  const auth = await requireSignedIn(req);
  if (isAuthError(auth)) {
    return res.status(auth.status).json({ error: auth.error });
  }

  const orderId = typeof req.body?.orderId === "string" ? req.body.orderId : "";
  if (!orderId) {
    return res.status(400).json({ error: "Sipariş numarası gerekli." });
  }

  const { data: order, error: orderError } = await supabaseAdmin
    .from("orders")
    .select("id, user_id, total_amount, status, payment_status")
    .eq("id", orderId)
    .maybeSingle();

  // Same answer for "missing" and "someone else's" so order ids can't be probed.
  if (orderError || !order || order.user_id !== auth.userId) {
    return res.status(404).json({ error: "Sipariş bulunamadı." });
  }
  if (order.payment_status !== "pending" || order.status === "cancelled") {
    return res.status(409).json({ error: "Bu sipariş için ödeme başlatılamaz." });
  }

  const { data: profile } = await supabaseAdmin
    .from("profiles")
    .select("full_name, email, phone")
    .eq("id", auth.userId)
    .maybeSingle();

  const origin = process.env.NEXT_PUBLIC_SITE_URL || `https://${req.headers.host}`;
  const result = await provider.initialize({
    order: { id: order.id, amount: Number(order.total_amount), currency: "TRY" },
    buyer: {
      id: auth.userId,
      email: profile?.email ?? null,
      name: profile?.full_name ?? null,
      phone: profile?.phone ?? null,
    },
    returnUrl: `${origin}/store/checkout?order=${order.id}`,
  });

  if (result.status === "error") {
    return res.status(502).json({ error: result.message });
  }

  const { error: updateError } = await supabaseAdmin
    .from("orders")
    .update({ payment_provider: provider.id })
    .eq("id", order.id)
    .eq("payment_status", "pending");

  if (updateError) {
    return res.status(500).json({ error: "Ödeme başlatılamadı, lütfen tekrar deneyin." });
  }

  return res.status(200).json(result);
}
