/**
 * Serviço centralizado para operações de pagamentos
 */

import { Payment } from '../types/payment';
import { updateUtmifyPayment } from './utmify.service';
import {BlackoutData, BlackoutWebhook} from "../types";

/**
 * Atualiza o status de um pagamento e sincroniza com serviços externos
 */
export const updatePaymentStatus = async (transactionId: number, newStatus: string,webhook: BlackoutData): Promise<boolean> => {
  try {
    const payments= await strapi.documents('api::payment.payment').findMany({
        filters: { transactionId },
    })
    if (!payments || payments.length === 0) {
        strapi.log.warn(`Payment with transaction ID ${transactionId} not found.`);
        return false;
    }
    const payment = payments[0]
    await strapi.documents('api::payment.payment').update({
      documentId: payment.documentId,
      data: {
        paymentStatus: newStatus as any,
        ...(newStatus === 'paid' && { approvedDate:  webhook.paidAt}),
        ...(newStatus === 'refunded' && { refundedAt: new Date().toISOString() }),
      },
    });
    // @ts-ignore
    if (newStatus === 'paid' && strapi.io) {
      strapi.log.info(`Emitting payment-confirmation to room ${payment.documentId}`);
      // @ts-ignore
      strapi.io.to(payment.documentId).emit('payment-confirmation', {
        message: 'Payment confirmed successfully!',
        documentId: payment.documentId
      });
    }
    // Sincroniza com UTMIFY
    const utmifyUpdated = await updateUtmifyPayment(transactionId, newStatus);

    return utmifyUpdated;
  } catch (error) {
    strapi.log.error(`Error updating payment status for transaction ${transactionId}:`, error);
    return false;
  }
};

/**
 * Busca um pagamento por transactionId com todas as relações populadas
 */
export const findPaymentByTransactionId = async (transactionId: string): Promise<Payment | null> => {
  try {
    const payments = await strapi.documents('api::payment.payment').findMany({
      filters: { transactionId },
      populate: ['products', 'customer'],
    });

    if (!payments || payments.length === 0) {
      return null;
    }

    return payments[0] as any;
  } catch (error) {
    strapi.log.error(`Error finding payment with transaction ID ${transactionId}:`, error);
    return null;
  }
};

export default {
  updatePaymentStatus,
  findPaymentByTransactionId,
};
