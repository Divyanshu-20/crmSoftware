'use client';

import { initializePaddle } from '@paddle/paddle-js';

// Paddle configuration for sandbox environment
const PADDLE_ENVIRONMENT = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'sandbox';
const PADDLE_CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!;

let paddle: any = null;

export const initPaddle = async () => {
  if (paddle) return paddle;

  try {
    console.log('Initializing Paddle with:', {
      environment: PADDLE_ENVIRONMENT,
      token: PADDLE_CLIENT_TOKEN ? `${PADDLE_CLIENT_TOKEN.substring(0, 10)}...` : 'NOT_SET'
    });

    if (!PADDLE_CLIENT_TOKEN) {
      throw new Error('Paddle client token is not configured');
    }

    paddle = await initializePaddle({
      environment: PADDLE_ENVIRONMENT as 'sandbox' | 'production',
      token: PADDLE_CLIENT_TOKEN,
      eventCallback: (data: any) => {
        console.log('Paddle event:', data);
        
        // Handle Paddle events
        switch (data.name) {
          case 'checkout.completed':
            console.log('Checkout completed:', data.data);
            // You can trigger additional actions here
            break;
          case 'checkout.payment.initiated':
            console.log('Payment initiated:', data.data);
            break;
          case 'checkout.payment.completed':
            console.log('Payment completed:', data.data);
            // Refresh the page or update bill status
            window.location.reload();
            break;
          case 'checkout.payment.failed':
            console.log('Payment failed:', data.data);
            break;
        }
      }
    });

    console.log('Paddle initialized successfully');
    return paddle;
  } catch (error) {
    console.error('Failed to initialize Paddle:', error);
    throw error;
  }
};

export const openPaddleCheckout = async (checkoutOptions: {
  items: Array<{
    priceId: string;
    quantity: number;
  }>;
  customData?: Record<string, any>;
  customer?: {
    email?: string;
    name?: string;
  };
  discountCode?: string;
  successUrl?: string;
  settings?: {
    displayMode?: 'overlay' | 'inline';
    theme?: 'light' | 'dark';
    locale?: string;
    allowLogout?: boolean;
  };
}) => {
  try {
    if (!paddle) {
      paddle = await initPaddle();
    }

    const checkout = await paddle.Checkout.open({
      items: checkoutOptions.items,
      customData: checkoutOptions.customData,
      customer: checkoutOptions.customer,
      settings: {
        displayMode: 'overlay',
        theme: 'dark',
        allowLogout: false,
        ...checkoutOptions.settings
      }
    });

    return checkout;
  } catch (error) {
    console.error('Failed to open Paddle checkout:', error);
    throw error;
  }
};

// Test card numbers for Paddle sandbox
export const TEST_CARDS = {
  VISA_SUCCESS: '4000000000000002',
  VISA_DECLINED: '4000000000000069',
  VISA_INSUFFICIENT_FUNDS: '4000000000000051',
  MASTERCARD_SUCCESS: '5555555555554444',
  MASTERCARD_DECLINED: '5555555555554477',
  AMEX_SUCCESS: '378282246310005',
  AMEX_DECLINED: '378282246310013'
};

// Test price IDs for sandbox (you'll need to create these in your Paddle sandbox)
export const TEST_PRICE_IDS = {
  CONSULTATION: 'pro_01k460kve28wj9bdmmypdhfrt4', // Replace with actual sandbox price ID
  TEST: 'pro_01k460mr0qexhsn9cq0kb5cxd4',       // Replace with actual sandbox price ID  
  MEDICINE: 'pro_01k460nfnwr9qra9ffch56eskq'     // Replace with actual sandbox price ID
};

export { paddle };
