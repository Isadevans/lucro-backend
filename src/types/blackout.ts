/**
 * Tipagens relacionadas ao Blackout
 */

export interface BlackoutWebhook {
    type: string
    url: string
    objectId: string
    data: BlackoutData
}

export interface BlackoutData {
    id: number
    tenantId: string
    companyId: number
    amount: number
    currency: string
    paymentMethod: string
    status: string
    installments: number
    paidAt: any
    paidAmount: number
    refundedAt: any
    refundedAmount: number
    postbackUrl: string
    metadata: string
    ip: string
    externalRef: string
    secureId: string
    secureUrl: string
    createdAt: string
    updatedAt: string
    payer: any
    traceable: boolean
    authorizationCode: any
    basePrice: number
    interestRate: number
    items: BlackoutItem[]
    customer: BlackoutCustomer
    fee: BlackoutFee
    splits: BlackoutSplit[]
    refunds: any[]
    pix: BlackoutPix
    boleto: any
    card: any
    refusedReason: any
    shipping: any
    delivery: any
    threeDS: BlackoutThreeDs
}

export interface BlackoutItem {
    title: string
    quantity: number
    tangible: boolean
    unitPrice: number
    externalRef: string
}

export interface BlackoutCustomer {
    id: number
    name: string
    email: string
    phone: string
    birthdate: string
    createdAt: string
    externalRef: any
    document: BlackoutDocument
    address: BlackoutAddress
}

export interface BlackoutDocument {
    type: string
    number: string
}

export interface BlackoutAddress {
    street: string
    streetNumber: string
    complement: string
    zipCode: string
    neighborhood: string
    city: string
    state: string
    country: string
}

export interface BlackoutFee {
    netAmount: number
    estimatedFee: number
    fixedAmount: number
    spreadPercent: number
    currency: string
}

export interface BlackoutSplit {
    amount: number
    netAmount: number
}

export interface BlackoutPix {
    // Adicionar propriedades do Pix conforme necessário
}

export interface BlackoutThreeDs {
    // Adicionar propriedades do ThreeDs conforme necessário
}

export interface BlackoutPaymentCreated{
    id: number
    tenantId: string
    companyId: number
    amount: number
    currency: string
    paymentMethod: string
    status: string
    installments: number
    paidAt: any
    paidAmount: number
    refundedAt: any
    refundedAmount: number
    redirectUrl: any
    returnUrl: any
    postbackUrl: string
    metadata: any
    ip: string
    externalRef: any
    secureId: string
    secureUrl: string
    createdAt: string
    updatedAt: string
    payer: any
    traceable: boolean
    authorizationCode: any
    basePrice: any
    interestRate: any
    items: Item[]
    customer: BlackoutCustomer
    fee: Fee
    splits: Split[]
    refunds: any[]
    pix: Pix
    boleto: any
    card: any
    refusedReason: any
    shipping: any
    delivery: any
    threeDS: any
}

export interface Item {
    title: string
    quantity: number
    tangible: boolean
    unitPrice: number
    externalRef: string
}


export interface Document {
    type: string
    number: string
}

export interface Fee {
    netAmount: number
    estimatedFee: number
    fixedAmount: number
    spreadPercent: number
    currency: string
}

export interface Split {
    amount: number
    netAmount: number
    recipientId: number
    chargeProcessingFee: boolean
}

export interface Pix {
    qrcode: string
    end2EndId: any
    receiptUrl: any
    expirationDate: string
}
