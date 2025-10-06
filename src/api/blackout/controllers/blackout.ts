import {Context} from 'koa';
import axios from 'axios';
import { BlackoutWebhook } from '../../../types';
import { updatePaymentStatus } from '../../../services';

/**
 * A set of functions called "actions" for `blackout`
 */
export default {
  async webhook(ctx: Context) {
    const body: BlackoutWebhook = ctx.request.body;

    try {
      const { data } = body;
      const status = data.status;

      if (isNaN(data.id)) {
        return ctx.badRequest('Invalid transaction ID');
      }

      const updated = await updatePaymentStatus(data.id, status,data);

      if (!updated) {
        return ctx.badRequest('Failed to update payment');
      }

      return { success: true };
    } catch (error) {
      strapi.log.error('Error processing Blackout webhook:', error);
      return ctx.badRequest('Error processing webhook');
    }
  }
};