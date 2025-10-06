/**
 * UTMIFY Service (adaptador para usar o serviço centralizado)
 */

import {
  updateUtmifyPayment,
  mapStatusToUtmify,
  generateUtmifyPayload,
  sendToUtmify
} from '../../../services';

export {
  updateUtmifyPayment,
  mapStatusToUtmify,
  generateUtmifyPayload,
  sendToUtmify
};

export default {
  updateUtmifyPayment,
  mapStatusToUtmify,
  generateUtmifyPayload,
  sendToUtmify
};
