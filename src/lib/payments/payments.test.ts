import { describe, expect, it } from "vitest";
import { getProvider, listEnabledProviders } from "./registry";
import { getBankDetails, bankTransferProvider } from "./bankTransfer";
import { buildEventRow, isUniqueViolation, planOrderUpdate } from "./callbackLogic";

describe("registry", () => {
  it("enables only bank_transfer", () => {
    expect(listEnabledProviders().map((p) => p.id)).toEqual(["bank_transfer"]);
  });

  it("returns disabled stubs with a Turkish error", async () => {
    for (const id of ["iyzico", "payment_link"]) {
      const p = getProvider(id)!;
      expect(p.enabled()).toBe(false);
      const r = await p.initialize({
        order: { id: "o1", amount: 10, currency: "TRY" },
        buyer: { id: "u1", email: null, name: null, phone: null },
        returnUrl: "https://x",
      });
      expect(r.status).toBe("error");
      if (r.status === "error") expect(r.message).toContain("henüz etkin değil");
    }
  });

  it("returns null for unknown ids, including prototype keys", () => {
    expect(getProvider("nope")).toBeNull();
    expect(getProvider("constructor")).toBeNull();
  });
});

describe("bank transfer", () => {
  it("uses defaults and env overrides", () => {
    expect(getBankDetails({}).bankName).toBe("Türkiye İş Bankası");
    expect(getBankDetails({ BANK_IBAN: "TR11" }).iban).toBe("TR11");
  });

  it("initialize returns manual instructions with an order reference", async () => {
    const r = await bankTransferProvider.initialize({
      order: { id: "abcdef12-0000", amount: 100, currency: "TRY" },
      buyer: { id: "u1", email: null, name: null, phone: null },
      returnUrl: "https://x",
    });
    expect(r.status).toBe("manual");
    if (r.status === "manual") expect(r.instructions.reference).toBe("ABCDEF12");
  });
});

describe("callback logic", () => {
  const paid = { outcome: "paid" as const, reference: "ref1" };

  it("paid + pending order confirms it", () => {
    const now = new Date("2026-11-02T10:00:00Z");
    expect(planOrderUpdate({ status: "pending", payment_status: "pending" }, paid, now)).toEqual({
      payment_status: "paid",
      paid_at: now.toISOString(),
      payment_reference: "ref1",
      status: "confirmed",
    });
  });

  it("paid does not change a non-pending order status", () => {
    const p = planOrderUpdate({ status: "shipped", payment_status: "pending" }, paid)!;
    expect(p.status).toBeUndefined();
    expect(p.payment_status).toBe("paid");
  });

  it("is a no-op for already paid / out-of-order callbacks", () => {
    expect(planOrderUpdate({ status: "confirmed", payment_status: "paid" }, paid)).toBeNull();
    expect(planOrderUpdate({ status: "confirmed", payment_status: "paid" }, { outcome: "failed", reference: null })).toBeNull();
    expect(planOrderUpdate({ status: "pending", payment_status: "pending" }, { outcome: "refunded", reference: null })).toBeNull();
  });

  it("failed and refunded map correctly", () => {
    expect(planOrderUpdate({ status: "pending", payment_status: "pending" }, { outcome: "failed", reference: null })).toEqual({ payment_status: "failed" });
    expect(planOrderUpdate({ status: "confirmed", payment_status: "paid" }, { outcome: "refunded", reference: null })).toEqual({ payment_status: "refunded" });
  });

  it("detects unique violations as duplicates", () => {
    expect(isUniqueViolation({ code: "23505" })).toBe(true);
    expect(isUniqueViolation({ code: "42501" })).toBe(false);
    expect(isUniqueViolation(null)).toBe(false);
  });

  it("builds the event row keyed by provider + event id", () => {
    expect(buildEventRow("iyzico", { providerEventId: "e1", orderId: "o1", outcome: "paid", reference: null, raw: { a: 1 } })).toEqual({
      order_id: "o1",
      provider: "iyzico",
      provider_event_id: "e1",
      event_type: "paid",
      payload: { a: 1 },
    });
  });
});
