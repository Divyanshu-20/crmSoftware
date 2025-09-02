import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { Paddle, Environment } from '@paddle/paddle-node-sdk';

// Initialize Paddle SDK inside function to avoid module-level crashes
function initializePaddle() {
  try {
    if (!process.env.PADDLE_API_KEY) {
      console.error('❌ PADDLE_API_KEY is not set');
      throw new Error('PADDLE_API_KEY environment variable is required');
    }
    
    console.log('🔍 Initializing Paddle SDK...');
    const paddle = new Paddle(process.env.PADDLE_API_KEY, {
      environment: Environment.sandbox
    });
    console.log('✅ Paddle SDK initialized successfully');
    return paddle;
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('💥 Paddle SDK initialization failed:', errorMessage);
    throw new Error(errorMessage);
  }
}

// Your actual price IDs from Paddle sandbox
const PRICE_IDS = {
  consultation: 'pro_01k460kve28wj9bdmmypdhfrt4',
  test: 'pro_01k460mr0qexhsn9cq0kb5cxd4', 
  medicine: 'pro_01k460nfnwr9qra9ffch56eskq'
};

export async function POST(request: Request) {
  try {
    console.log('🔍 Starting Paddle checkout request');
    
    // Initialize Paddle (moved inside function for serverless compatibility)
    // const paddle = initializePaddle(); // Currently unused but kept for future use

    const body = await request.json();
    const { bill_id, customer_email, success_url, cancel_url } = body;

    if (!bill_id) {
      return NextResponse.json(
        { error: 'bill_id is required' },
        { status: 400 }
      );
    }

    // Get bill details
    const { data: bill, error: billError } = await supabaseServer
      .from('bills')
      .select(`
        *,
        patients (name, contact),
        bill_items (*)
      `)
      .eq('id', bill_id)
      .single();

    if (billError || !bill) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      );
    }

    // Prepare checkout data for client-side Paddle integration
    const checkoutData = {
      items: bill.bill_items.map((item: { item_type: string; quantity: number }) => {
        const priceId = PRICE_IDS[item.item_type as keyof typeof PRICE_IDS];
        console.log(`🔍 Mapping item: ${item.item_type} -> ${priceId}`);
        return {
          priceId: priceId,
          quantity: item.quantity
        };
      }),
      customer: {
        email: customer_email || bill.patients.contact || ''
      },
      customData: {
        bill_id: bill.id,
        patient_name: bill.patients.name
      },
      successUrl: success_url || `${request.headers.get('origin')}/bills/${bill_id}/success`,
      cancelUrl: cancel_url || `${request.headers.get('origin')}/bills`
    };

    console.log('📦 Prepared checkout data:', {
      items: checkoutData.items,
      customer: checkoutData.customer,
      customData: checkoutData.customData,
      successUrl: checkoutData.successUrl,
      cancelUrl: checkoutData.cancelUrl
    });

    // Generate a unique checkout ID for tracking
    const checkoutId = `chk_${Date.now()}_${Math.random().toString(36).substring(7)}`;
    
    // Update bill with checkout ID
    await supabaseServer
      .from('bills')
      .update({
        paddle_checkout_id: checkoutId,
        updated_at: new Date().toISOString()
      })
      .eq('id', bill_id);

    return NextResponse.json({
      checkout_id: checkoutId,
      checkout_data: checkoutData,
      bill_amount: bill.total_amount,
      message: 'Checkout data prepared for client-side Paddle integration'
    });

  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    console.error('Checkout creation error:', errorMessage);
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
