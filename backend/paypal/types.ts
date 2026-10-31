export interface ExecutePaymentParams {
  requestId: string;
  amountCents: number;
  currency?: string;
  itemName: string;
  merchantDomain?: string;
  mandateId?: string;
}

export interface PayPalExecutionResult {
  success: boolean;
  paymentId: string;
  paypalOrderId: string;
  paypalStatus: string;
  amountCents: number;
  currency: string;
  idempotentReplay: boolean;
  approvalUrl?: string;
  createdAt: string;
}

export interface PayPalTokenResponse {
  access_token: string;
  token_type: string;
  expires_in: number;
}

export interface PayPalOrderResponse {
  id: string;
  status: string;
  links?: Array<{
    href: string;
    rel: string;
    method: string;
  }>;
}
