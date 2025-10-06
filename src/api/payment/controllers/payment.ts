import {factories} from '@strapi/strapi';
import {ApplicationError} from '@strapi/utils/dist/errors';
import axios from 'axios';
import {Context} from 'koa';
import {
    mapStatusToUtmify,
    generateUtmifyPayload,
    sendToUtmify
} from '../../../services/utmify.service';

import {
    UtmifyCustomer,
    UtmifyProduct,
    UtmifyTrackingParameters,
    UtmifyCommission,
    UtmifyPayload,
    UtmifyPaymentMethod,
    UtmifyPaymentStatus
} from '../../../types/utmify';
import {BlackoutPaymentCreated} from "../../../types";

export interface PaymentRequestBody {
    platform?: string
    paymentMethod: string
    card?: string
    installments?: number
    customer: PaymentRequestCustomer
    products: Product[]
    commission: Commission
    tracking: Tracking
}

export interface PaymentRequestCustomer {
    name: string
    email: string
    document: string | null
    phone: any
    country: string
}

export interface Product {
    id: string
    name: string
    planId: any
    planName: any
    quantity: number
    priceInCents: number
}

export interface Commission {
    totalPriceInCents: number
    gatewayFeeInCents: number
    userCommissionInCents: number
    currency: string
}

export interface Tracking {
    src: any
    sck: any
    utm_source: string
    utm_campaign: string
    utm_medium: string
    utm_content: string
    utm_term: any
}

/**
 * Controller 'payment'
 */
export default factories.createCoreController('api::payment.payment', ({strapi}) => ({
    async create(ctx: Context) {

        const body = ctx.request.body as PaymentRequestBody;

        const publicKey = process.env.BLACKOUT_PUBLIC_KEY;
        const secretKey = process.env.BLACKOUT_SECRET_KEY;
        const auth = 'Basic ' + Buffer.from(publicKey + ':' + secretKey).toString('base64');
        // 1. Validação das chaves de API
        const utmifyApiToken = process.env.UTMIFY_API_TOKEN;

        if (!utmifyApiToken || !publicKey || !secretKey) {
            strapi.log.error('As variáveis de ambiente UTMIFY_API_TOKEN ou BLACK_PAYMENTS_API_KEY não estão configuradas.');
            throw new ApplicationError('Erro de configuração na integração de pagamento.');
        }

        // 2. Processar pagamento com a Black Payments
        let paymentResponse = await processBlackoutPayment(body, auth, ctx);

        // 3. Mapeamento e chamada para a Utmify
        await processUtmifyIntegration(paymentResponse, body);

        // 4. Salvar o pagamento no banco de dados do Strapi
        const payment = await savePaymentToDatabase(body, paymentResponse);

        // 5. Preparar a resposta
        return {
            data: payment,
            meta: {
                blackoutResponse: {
                    transactionId: paymentResponse.id,
                    status: paymentResponse.status,
                    paymentMethod: paymentResponse.paymentMethod,
                    secureUrl: paymentResponse.secureUrl,
                },
                pix: paymentResponse.pix
            }
        };
    }
}));

/**
 * Processa o pagamento com a Black Payments
 */
async function processBlackoutPayment(body: PaymentRequestBody, auth: string, ctx: Context): Promise<BlackoutPaymentCreated> {
    try {
        // Mapeia os dados do frontend para o formato da Black Payments
        const blackPaymentsPayload = {
            amount: body.commission.totalPriceInCents,
            paymentMethod: body.paymentMethod, // 'credit_card', 'boleto', 'pix'
            installments: body?.installments, // Obrigatório para 'credit_card'
            card: body.card, // Obrigatório para 'credit_card'
            items: body.products.map(p => ({
                title: p.name,
                unitPrice: p.priceInCents,
                quantity: p.quantity,
                tangible: false // Assumindo produto digital
            })),
            customer: {
                name: body.customer.name,
                email: body.customer.email,
                document: {number: body.customer.document || "17183516741", type: 'cpf'},
                phone_number: body.customer.phone,
            },
            postbackUrl: (process.env.WEBHOOK_URL || 'http://localhost:1337') + '/api/blackout/webhook',
            ip: ctx.request.ip // Captura o IP do cliente da requisição
        };

        strapi.log.info(`Iniciando transação com a Black Payments para o cliente ${body.customer.email}.`);

        const {data} = await axios.post('https://api.blackpayments.pro/v1/transactions', blackPaymentsPayload, {
            headers: {
                Authorization: auth,
                'accept': 'application/json',
                'content-type': 'application/json'
            }
        });

        const paymentResponse = data as BlackoutPaymentCreated;
        strapi.log.info(`Transação ${paymentResponse.id} processada com status: ${paymentResponse.status}.`);
        return paymentResponse;

    } catch (error) {
        const errorMessage = error.response?.data?.message || error.message;
        strapi.log.error('Erro ao processar pagamento com a Black Payments:', errorMessage);
        throw new ApplicationError('Falha ao processar o pagamento.', {details: errorMessage});
    }
}

/**
 * Processa a integração com UTMIFY
 */
async function processUtmifyIntegration(paymentResponse: BlackoutPaymentCreated, body: PaymentRequestBody): Promise<void> {
    try {
        const utmifyPayload: UtmifyPayload = {
            orderId: paymentResponse.id.toString(), // Usa o ID da transação da Black Payments
            platform: body.platform || 'blackout',
            paymentMethod: (body.paymentMethod as UtmifyPaymentMethod) || 'pix',
            status: mapStatusToUtmify(paymentResponse.status),
            createdAt: paymentResponse.createdAt,
            approvedDate: paymentResponse.status === 'paid' ? paymentResponse.updatedAt : null,
            refundedAt: null, // A ser gerenciado por webhooks
            customer: {
                name: body.customer.name,
                email: body.customer.email,
                document: body.customer.document,
                phone: body.customer.phone
            },
            products: body.products.map(p => ({
                id: p.id,
                name: p.name,
                planId: null,
                planName: null,
                quantity: p.quantity,
                priceInCents: 0,
            })),

            trackingParameters: {
                src: body.tracking?.src || null,
                sck: body.tracking?.sck || null,
                utm_source: body.tracking?.utm_source || null,
                utm_campaign: body.tracking?.utm_campaign || null,
                utm_medium: body.tracking?.utm_medium || null,
                utm_content: body.tracking?.utm_content || null,
                utm_term: body.tracking?.utm_term || null
            },
            commission: body.commission as UtmifyCommission,
            isTest: true
        };

        await sendToUtmify(utmifyPayload);

    } catch (error) {
        const errorMessage = error.response?.data || error.message;
        strapi.log.error(`Pagamento ${paymentResponse.id} processado, mas falhou ao enviar para a Utmify:`, errorMessage);
    }
}

/**
 * Salva os dados do pagamento no banco de dados
 */
async function savePaymentToDatabase(body: PaymentRequestBody, paymentResponse: any) {
    try {
        // 1. Verificar se o cliente já existe ou criar um novo
        let customerId;
        const existingCustomers = await strapi.documents('api::customer.customer').findMany({
            filters: {email: body.customer.email}
        });

        if (existingCustomers && existingCustomers.length > 0) {
            customerId = existingCustomers[0].id;
            strapi.log.info(`Cliente já existe: ${customerId}`);
        } else {
            // Criar um novo cliente
            const newCustomer = await strapi.documents('api::customer.customer').create({
                data: {
                    name: body.customer.name,
                    email: body.customer.email,
                    document: body.customer.document,
                    phone: body.customer.phone,
                }
            });
            customerId = newCustomer.id;
            strapi.log.info(`Novo cliente criado: ${customerId}`);
        }

        // 2. Verificar e criar produtos conforme necessário
        const productIds = [];
        for (const product of body.products) {
            // Convertemos o preço de centavos para a moeda principal
            const priceInMainCurrency = product.priceInCents / 100;

            const productData = await strapi.documents('api::product.product').create({
                data: {
                    name: product.name,
                    quantity: product.quantity,
                    // Adicione outros campos conforme necessário para seu modelo de produto
                }
            });
            productIds.push(productData.id);
        }

        // 3. Criar o registro de pagamento
        // Mapear status do pagamento para os valores permitidos no schema
        const paymentStatusMapping = {
            'pending': 'waiting_payment',
            'paid': 'paid',
            // Adicione outros mapeamentos conforme necessário
        };

        // Calcular o preço total em moeda principal (não em centavos)
        const priceTotal = body.commission.totalPriceInCents / 100;

        // Criar o pagamento usando Strapi Documents API com sintaxe correta
        const payment = await strapi.documents('api::payment.payment').create({
            data: {
                transactionId: paymentResponse.id,
                price: priceTotal,
                paymentStatus: paymentStatusMapping[paymentResponse.status] || 'waiting_payment',
                customer: customerId,
                products: productIds,
                commission: body.commission as any,
                trackingParameters: body.tracking as any,
            }
        });

        strapi.log.info(`Pagamento salvo no banco de dados: ${payment.id}`);
        return payment;
    } catch (error) {
        strapi.log.error('Erro ao salvar o pagamento no banco de dados:', error);
        throw new ApplicationError('Falha ao salvar os dados do pagamento.', {details: error.message});
    }
}
