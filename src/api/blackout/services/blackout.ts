/**
 * blackout service
 */

import { updateUtmifyPayment } from '../../../services/utmify.service';
import { updatePaymentStatus } from '../../../services/payment.service';

export default {
  async processWebhook(externalRef: string, status: string) {
    const transactionId = parseInt(externalRef, 10);

    if (isNaN(transactionId)) {
      strapi.log.error(`Invalid transaction ID: ${externalRef}`);
      return false;
    }

    return await updatePaymentStatus(transactionId, status);
  }
};
