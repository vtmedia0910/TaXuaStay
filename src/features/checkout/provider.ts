export interface PaymentProviderAdapter {
  readonly providerKey: null;
  readonly state: "unconfigured";
  readonly supportsPaymentIntent: false;
  readonly supportsWebhook: false;
  readonly supportsRefund: false;
}

export interface FutureProviderEventContract {
  provider_event_id: string;
  provider_payment_reference: string;
  checkout_session_id: string;
  booking_code: string;
  quote_version: number;
  amount_vnd: number;
  currency: "VND";
  status: string;
  event_time: string;
  signature_verification_result: "verified" | "rejected" | "unavailable";
}

export const unconfiguredPaymentProvider: PaymentProviderAdapter = {
  providerKey: null,
  state: "unconfigured",
  supportsPaymentIntent: false,
  supportsWebhook: false,
  supportsRefund: false,
};
