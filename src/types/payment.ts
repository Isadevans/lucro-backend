/**
 * Tipagens relacionadas ao Payment
 */

export interface Payment {
  id: number;
  transactionId: string;
  platform: string;
  paymentMethod: string;
  paymentStatus: string;
  createdAt: string;
  approvedDate: string | null;
  refundedAt: string | null;
  commission: {
    totalPriceInCents: number;
    gatewayFeeInCents: number;
    userCommissionInCents: number;
    currency?: string;
  };
  trackingParameters?: {
    src: string | null;
    sck: string | null;
    utm_source: string | null;
    utm_campaign: string | null;
    utm_medium: string | null;
    utm_content: string | null;
    utm_term: string | null;
  };
  isTest?: boolean;
  customer: any;
  products: any[];
}
