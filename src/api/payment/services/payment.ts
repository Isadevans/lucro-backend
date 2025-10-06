/**
 * payment service
 */

import { factories } from '@strapi/strapi';
import { findPaymentByTransactionId, updatePaymentStatus } from '../../../services/payment.service';

const defaultService = factories.createCoreService('api::payment.payment');

export default {
  ...defaultService,
  findPaymentByTransactionId,
  updatePaymentStatus,
};
