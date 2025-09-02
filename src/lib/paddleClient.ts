'use client';

import { initializePaddle } from '@paddle/paddle-js';

// Define the Paddle instance type based on how it's used
interface PaddleInstance {
  Checkout: {
    open: (options: {
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
      cancelUrl?: string;
      settings?: {
        displayMode?: 'overlay' | 'inline';
        theme?: 'light' | 'dark';
        locale?: string;
        allowLogout?: boolean;
      };
    }) => Promise<any>;
  };
}

// Paddle configuration for sandbox environment
const PADDLE_ENVIRONMENT = process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'sandbox';
const PADDLE_CLIENT_TOKEN = process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN!;

let paddle: PaddleInstance | null = null;

export const initPaddle = async (): Promise<PaddleInstance> => {
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
    }) as unknown as PaddleInstance;

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

// ... existing code ...