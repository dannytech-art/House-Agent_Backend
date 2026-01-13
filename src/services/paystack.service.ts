import https from 'https';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

// Ensure dotenv is loaded first
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const PAYSTACK_BASE_URL = 'api.paystack.co';

// Function to get the secret key (read fresh each time)
const getSecretKey = (): string => {
  return process.env.PAYSTACK_SECRET_KEY || '';
};

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
  apiPath: string,
  data?: Record<string, any>
): Promise<T> => {
  const secretKey = getSecretKey();
  
  return new Promise((resolve, reject) => {
    const options = {
      hostname: PAYSTACK_BASE_URL,
      port: 443,
      path: apiPath,
      method,
      headers: {
        Authorization: `Bearer ${secretKey}`,
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
  const secretKey = getSecretKey();
  
  if (!secretKey) {
    console.error('PAYSTACK_SECRET_KEY not found in environment variables');
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
  const secretKey = getSecretKey();
  
  if (!secretKey) {
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
  const secretKey = getSecretKey();
  const isConfigured = !!secretKey && secretKey.length > 0;
  
  if (!isConfigured) {
    console.log('⚠️ Paystack not configured. PAYSTACK_SECRET_KEY:', secretKey ? 'Set but empty' : 'Not set');
  }
  
  return isConfigured;
};

/**
 * Generate a unique payment reference
 */
export const generateReference = (prefix: string = 'VLN'): string => {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `${prefix}_${timestamp}_${random}`;
};

/**
 * Debug: Log current configuration
 */
export const debugConfig = (): void => {
  const secretKey = getSecretKey();
  console.log('🔧 Paystack Config Debug:');
  console.log('  - Secret Key Set:', !!secretKey);
  console.log('  - Secret Key Length:', secretKey?.length || 0);
  console.log('  - Secret Key Prefix:', secretKey?.substring(0, 8) || 'N/A');
};

export default {
  initializePayment,
  verifyPayment,
  isPaystackConfigured,
  generateReference,
  debugConfig,
};
