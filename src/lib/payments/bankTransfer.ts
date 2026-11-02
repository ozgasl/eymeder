import type { BankInstructions, PaymentProvider } from "./types";

export function getBankDetails(env: Record<string, string | undefined> = process.env): Omit<BankInstructions, "reference"> {
  return {
    bankName: env.BANK_NAME || "Türkiye İş Bankası",
    accountName: env.BANK_ACCOUNT_NAME || "Eyüboğlu Mezunlar Derneği",
    iban: env.BANK_IBAN || "TR00 0000 0000 0000 0000 0000 00", // To be updated by admin
  };
}

export function orderReference(orderId: string): string {
  return orderId.slice(0, 8).toUpperCase();
}

// Bank transfer has no gateway: staff confirm payment by hand in the admin
// panel, so there is no callback to handle.
export const bankTransferProvider: PaymentProvider = {
  id: "bank_transfer",
  label: "Havale / EFT",
  enabled: () => true,
  async initialize({ order }) {
    return {
      status: "manual",
      instructions: { ...getBankDetails(), reference: orderReference(order.id) },
    };
  },
  async handleCallback() {
    throw new Error("Havale ödemeleri için geri çağırma (callback) desteklenmez.");
  },
};
