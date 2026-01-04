import https from 'https';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Ensure dotenv is loaded
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const PAYSTACK_SECRET_KEY = process.env.PAYSTACK_SECRET_KEY || '';
const PAYSTACK_BASE_URL = 'api.paystack.co';

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
 * Make HTTPS request to Paystack API
 */
const makeRequest = <T>(
  method: string,
  path: string,
  data?: Record<string, any>
): Promise<T> => {
  return new Promise((resolve, reject) => {
    const options = {
      hostname: PAYSTACK_BASE_URL,
      port: 443,
      path,
      method,
      headers: {
        Authorization: `Bearer ${PAYSTACK_SECRET_KEY}`,
        'Content-Type': 'application/json',
      },
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });
      res.on('end', () => {
        try {
          const response = JSON.parse(body);
          resolve(response as T);
        } catch (error) {
          reject(new Error('Failed to parse Paystack response'));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    if (data) {
      req.write(JSON.stringify(data));
    }
    req.end();
  });
};

/**
 * Initialize a payment transaction
 */
export const initializePayment = async (params: {
  email: string;
  amount: number; // in kobo (₦1 = 100 kobo)
  reference: string;
  metadata?: Record<string, any>;
  callback_url?: string;
}): Promise<PaystackInitResponse> => {
  if (!PAYSTACK_SECRET_KEY) {
    return {
      status: false,
      message: 'Paystack secret key not configured',
    };
  }

  try {
    const response = await makeRequest<PaystackInitResponse>('POST', '/transaction/initialize', {
      email: params.email,
      amount: params.amount,
      reference: params.reference,
      metadata: params.metadata,
      callback_url: params.callback_url,
    });

    return response;
  } catch (error) {
    console.error('Paystack initialize error:', error);
    return {
      status: false,
      message: 'Failed to initialize payment',
    };
  }
};

/**
 * Verify a payment transaction
 */
export const verifyPayment = async (reference: string): Promise<PaystackVerifyResponse> => {
  if (!PAYSTACK_SECRET_KEY) {
    return {
      status: false,
      message: 'Paystack secret key not configured',
    };
  }

  try {
    const response = await makeRequest<PaystackVerifyResponse>(
      'GET',
      `/transaction/verify/${encodeURIComponent(reference)}`
    );

    return response;
  } catch (error) {
    console.error('Paystack verify error:', error);
    return {
      status: false,
      message: 'Failed to verify payment',
    };
  }
};

/**
 * Check if Paystack is configured
 */
export const isPaystackConfigured = (): boolean => {
  return !!PAYSTACK_SECRET_KEY;
};

/**
 * Generate a unique payment reference
 */
export const generateReference = (prefix: string = 'VLN'): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}_${timestamp}_${random}`;
};

export default {
  initializePayment,
  verifyPayment,
  isPaystackConfigured,
  generateReference,
};


