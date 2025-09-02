import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    console.log('Paddle webhook received:', body);

    // Handle different Paddle events
    switch (body.event_type) {
      case 'transaction.completed':
        await handleTransactionCompleted(body.data);
        break;
      case 'transaction.payment_failed':
        await handleTransactionFailed(body.data);
        break;
      case 'checkout.completed':
        await handleCheckoutCompleted(body.data);
        break;
      default:
        console.log('Unhandled webhook event:', body.event_type);
    }

    return NextResponse.json({ received: true });
  } catch (error: any) {
    console.error('Webhook error:', error);
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

async function handleTransactionCompleted(data: any) {
  try {
    const { id: transaction_id, checkout_id, status } = data;

    // Update bill payment status to paid
    const { error } = await supabaseServer
      .from('bills')
      .update({
        payment_status: 'paid',
        paddle_transaction_id: transaction_id,
        updated_at: new Date().toISOString()
      })
      .eq('paddle_checkout_id', checkout_id);

    if (error) {
      console.error('Error updating bill payment status:', error);
      throw error;
    }

    console.log('Bill payment status updated to paid for checkout:', checkout_id);
  } catch (error) {
    console.error('Error handling transaction completed:', error);
    throw error;
  }
}

async function handleTransactionFailed(data: any) {
  try {
    const { checkout_id } = data;

    // You might want to log the failure or send notifications
    console.log('Transaction failed for checkout:', checkout_id);
    
    // Optionally update bill status or add failure notes
    const { error } = await supabaseServer
      .from('bills')
      .update({
        updated_at: new Date().toISOString()
      })
      .eq('paddle_checkout_id', checkout_id);

    if (error) {
      console.error('Error updating bill after payment failure:', error);
      throw error;
    }
  } catch (error) {
    console.error('Error handling transaction failed:', error);
    throw error;
  }
}

async function handleCheckoutCompleted(data: any) {
  try {
    const { id: checkout_id } = data;

    // Update the checkout ID if needed
    console.log('Checkout completed:', checkout_id);
    
    // This event fires when the checkout is completed but before payment processing
    // We can use this to track checkout completion
  } catch (error) {
    console.error('Error handling checkout completed:', error);
    throw error;
  }
}
