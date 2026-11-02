import { bankTransferProvider } from "./bankTransfer";
import type { PaymentProvider } from "./types";

function disabledProvider(id: string, label: string): PaymentProvider {
  const message = `${label} ödeme yöntemi henüz etkin değil.`;
  return {
    id,
    label,
    enabled: () => false,
    async initialize() {
      return { status: "error", message };
    },
    async handleCallback() {
      throw new Error(message);
    },
  };
}

// Providers are registered here. Replace a disabled stub with a real adapter
// (see docs/payments.md) once a payment provider is contracted.
const providers: Record<string, PaymentProvider> = {
  bank_transfer: bankTransferProvider,
  iyzico: disabledProvider("iyzico", "İyzico"),
  payment_link: disabledProvider("payment_link", "Ödeme Bağlantısı"),
};

export function getProvider(id: string): PaymentProvider | null {
  return Object.prototype.hasOwnProperty.call(providers, id) ? providers[id] : null;
}

export function listEnabledProviders(): PaymentProvider[] {
  return Object.values(providers).filter((p) => p.enabled());
}
