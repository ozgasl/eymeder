import type { CallbackResult } from "./types";

export interface OrderSnapshot {
  status: string;
  payment_status: string;
}

export interface OrderPatch {
  payment_status: "paid" | "failed" | "refunded";
  payment_reference?: string;
  paid_at?: string;
  status?: "confirmed";
}

// Decides what a verified callback may change on an order. Returns null when
// the callback is a no-op (e.g. already paid), so late or out-of-order
// deliveries never regress an order (paid -> failed) or re-confirm it.
export function planOrderUpdate(
  order: OrderSnapshot,
  result: Pick<CallbackResult, "outcome" | "reference">,
  now: Date = new Date()
): OrderPatch | null {
  switch (result.outcome) {
    case "paid": {
      if (order.payment_status === "paid" || order.payment_status === "refunded") return null;
      const patch: OrderPatch = { payment_status: "paid", paid_at: now.toISOString() };
      if (result.reference) patch.payment_reference = result.reference;
      // Stock is adjusted by the DB trigger on the pending -> confirmed transition.
      if (order.status === "pending") patch.status = "confirmed";
      return patch;
    }
    case "failed": {
      if (order.payment_status !== "pending") return null;
      const patch: OrderPatch = { payment_status: "failed" };
      if (result.reference) patch.payment_reference = result.reference;
      return patch;
    }
    case "refunded": {
      if (order.payment_status !== "paid") return null;
      return { payment_status: "refunded" };
    }
    default:
      return null;
  }
}

export function buildEventRow(provider: string, result: CallbackResult) {
  return {
    order_id: result.orderId,
    provider,
    provider_event_id: result.providerEventId,
    event_type: result.outcome,
    // JSONB column; the adapter's raw payload is JSON-serializable by contract.
    payload: (result.raw ?? null) as never,
  };
}

// Postgres unique_violation: the event was already recorded -> duplicate delivery.
export function isUniqueViolation(error: { code?: string } | null | undefined): boolean {
  return error?.code === "23505";
}
