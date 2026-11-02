import type { NextApiRequest } from "next";

// Provider-agnostic payment contract. Server-side only: adapters may read
// secrets from process.env and must never be imported from a React component.

export type PaymentOutcome = "paid" | "failed" | "refunded";

export interface PaymentOrder {
  id: string;
  // Always read from orders.total_amount in the database, never from the client.
  amount: number;
  currency: "TRY";
}

export interface PaymentBuyer {
  id: string;
  email: string | null;
  name: string | null;
  phone: string | null;
}

export interface InitializeInput {
  order: PaymentOrder;
  buyer: PaymentBuyer;
  returnUrl: string;
}

export interface BankInstructions {
  bankName: string;
  accountName: string;
  iban: string;
  // Reference the buyer should put in the transfer description.
  reference: string;
}

export type InitializeResult =
  | { status: "redirect"; url: string }
  | { status: "manual"; instructions: BankInstructions }
  | { status: "error"; message: string };

export interface CallbackResult {
  // Unique per provider delivery; (provider, providerEventId) is the idempotency key.
  providerEventId: string;
  orderId: string;
  outcome: PaymentOutcome;
  reference: string | null;
  raw: unknown;
}

export interface PaymentProvider {
  id: string;
  label: string;
  enabled(): boolean;
  initialize(input: InitializeInput): Promise<InitializeResult>;
  // Must verify the provider's signature/token and throw on anything invalid.
  handleCallback(req: NextApiRequest): Promise<CallbackResult>;
}
