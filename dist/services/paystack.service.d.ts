export interface PaystackInitResponse {
    status: boolean;
    message: string;
    data?: {
        authorization_url: string;
        access_code: string;
        reference: string;
    };
}
export interface PaystackVerifyResponse {
    status: boolean;
    message: string;
    data?: {
        id: number;
        status: 'success' | 'failed' | 'abandoned';
        reference: string;
        amount: number;
        currency: string;
        channel: string;
        customer: {
            id: number;
            email: string;
            first_name: string;
            last_name: string;
        };
        metadata?: Record<string, any>;
        paid_at: string;
    };
}
/**
 * Initialize a payment transaction
 */
export declare const initializePayment: (params: {
    email: string;
    amount: number;
    reference: string;
    metadata?: Record<string, any>;
    callback_url?: string;
}) => Promise<PaystackInitResponse>;
/**
 * Verify a payment transaction
 */
export declare const verifyPayment: (reference: string) => Promise<PaystackVerifyResponse>;
/**
 * Check if Paystack is configured
 */
export declare const isPaystackConfigured: () => boolean;
/**
 * Generate a unique payment reference
 */
export declare const generateReference: (prefix?: string) => string;
/**
 * Debug: Log current configuration
 */
export declare const debugConfig: () => void;
declare const _default: {
    initializePayment: (params: {
        email: string;
        amount: number;
        reference: string;
        metadata?: Record<string, any>;
        callback_url?: string;
    }) => Promise<PaystackInitResponse>;
    verifyPayment: (reference: string) => Promise<PaystackVerifyResponse>;
    isPaystackConfigured: () => boolean;
    generateReference: (prefix?: string) => string;
    debugConfig: () => void;
};
export default _default;
//# sourceMappingURL=paystack.service.d.ts.map