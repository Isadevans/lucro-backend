/**
 * Serviço centralizado para interações com a API UTMIFY
 */

import axios from 'axios';
import {UtmifyPayload, UtmifyPaymentStatus} from '../types/utmify';
import {Payment} from '../types/payment';

/**
 * Maps Blackout status to UTMIFY status format
 */
export const mapStatusToUtmify = (status: string): UtmifyPaymentStatus => {
    const statusMap: Record<string, UtmifyPaymentStatus> = {
        'pending': 'waiting_payment',
        'paid': 'paid',
        'refused': 'refused',
        'refunded': 'refunded',
        'chargeback': 'chargedback'
    };
    return statusMap[status] || 'waiting_payment';
};

/**
 * Generates a complete UTMIFY payload based on our database records
 * to ensure data integrity when updating
 */
export const generateUtmifyPayload = async (transactionId: number, newStatus?: string): Promise<UtmifyPayload | null> => {
    try {
        // Find the payment in our database with all related data
        const payments = await strapi.documents('api::payment.payment').findMany({
            filters: {transactionId},
            populate: ['products', 'customer'],
        });

        if (!payments || payments.length === 0) {
            strapi.log.warn(`No payment found for transaction ID '${transactionId}'`);
            return null;
        }

        const payment = payments[0];
        const status = newStatus ? mapStatusToUtmify(newStatus) : mapStatusToUtmify(payment.paymentStatus);
        // @ts-ignore
        const commission = payment.commission as any
        
        // Ensure tracking parameters meet the required format
        // @ts-ignore
        const rawTrackingParameters = payment.trackingParameters as any || {};
        const trackingParameters = {
            src: rawTrackingParameters.src || null,
            sck: rawTrackingParameters.sck || null,
            utm_source: rawTrackingParameters.utm_source || null,
            utm_campaign: rawTrackingParameters.utm_campaign || null,
            utm_medium: rawTrackingParameters.utm_medium || null,
            utm_content: rawTrackingParameters.utm_content || null,
            utm_term: rawTrackingParameters.utm_term || null
        };

        return {
            orderId: payment.documentId,
            platform: 'blackout',
            paymentMethod: 'pix',
            status,
            createdAt: new Date(payment.createdAt).toISOString(),
            approvedDate: status === 'paid' && !payment.approvedDate?.toString()
                ? new Date().toISOString()
                : payment.approvedDate?.toString() || null,
            refundedAt: null,
            customer: {
                name: payment.customer.name,
                email: payment.customer.email,
                phone: payment.customer.phone,
                document: payment.customer.document,
                // country: payment.customer.country,
                // ip: payment.customer.ip,
            },
            products: payment.products.map(p => ({
                id: p.id.toString(),
                name: p.name,
                planId: null,
                planName: null,
                quantity: p.quantity,
                priceInCents: 0,
            })),
            trackingParameters,
            commission,
            // @ts-ignore
            isTest: payment.isTest || process.env.NODE_ENV !== 'production',
        };
    } catch (error) {
        strapi.log.error(`Error generating UTMIFY payload for transaction ${transactionId}:`, error);
        return null;
    }
};

/**
 * Sends a payload to UTMIFY API, handling errors and logging
 */
export const sendToUtmify = async (payload: UtmifyPayload): Promise<boolean> => {
    const utmifyApiToken = process.env.UTMIFY_API_TOKEN;

    if (!utmifyApiToken) {
        strapi.log.error('The environment variable UTMIFY_API_TOKEN is not configured.');
        return false;
    }

    try {
        strapi.log.info(`Updating order ${payload.orderId} in UTMIFY with status '${payload.status}'.`);

        await axios.post('https://api.utmify.com.br/api-credentials/orders', payload, {
            headers: {
                'x-api-token': utmifyApiToken,
                'Content-Type': 'application/json'
            }
        });

        strapi.log.info(`Order ${payload.orderId} successfully updated in UTMIFY.`);
        return true;
    } catch (error) {
        const errorMessage = error.response?.data || error.message;
        strapi.log.error(`Failed to update order ${payload.orderId} in UTMIFY:`, errorMessage);
        return false;
    }
};

/**
 * Main function to update a payment in UTMIFY
 * This ensures we always send a complete payload to maintain data integrity
 */
export const updateUtmifyPayment = async (transactionId: number, newStatus?: string): Promise<boolean> => {
    const payload = await generateUtmifyPayload(transactionId, newStatus);

    if (!payload) {
        return false;
    }

    return await sendToUtmify(payload);
};

export default {
    mapStatusToUtmify,
    generateUtmifyPayload,
    sendToUtmify,
    updateUtmifyPayment
};
