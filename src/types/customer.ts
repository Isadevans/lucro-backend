/**
 * Tipagens relacionadas ao Customer
 */

export interface Customer {
  id: number;
  name: string;
  email: string;
  phone: string;
  document: string;
  country?: string;
  ip?: string;
  address?: {
    street: string;
    streetNumber: string;
    complement: string;
    zipCode: string;
    neighborhood: string;
    city: string;
    state: string;
    country: string;
  };
}
