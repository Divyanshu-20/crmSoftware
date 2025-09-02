import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';
import { supabase } from '@/lib/supabaseClient';

// GET /api/bills/[id] - Get a specific bill with items
export async function GET(request: Request, { params }: { params: { id: string } }) {
  try {
    const { data, error } = await supabaseServer
      .from('bills')
      .select(`
        *,
        patients (id, name, age, chief_complaint),
        bill_items (*)
      `)
      .eq('id', params.id)
      .single();

    if (error) throw error;

    if (!data) {
      return NextResponse.json(
        { error: 'Bill not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// PUT /api/bills/[id] - Update a bill
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { doctor_name, bill_date, payment_status, paddle_checkout_id, paddle_transaction_id } = body;

    const updateData: any = {};
    if (doctor_name) updateData.doctor_name = doctor_name;
    if (bill_date) updateData.bill_date = bill_date;
    if (payment_status) updateData.payment_status = payment_status;
    if (paddle_checkout_id) updateData.paddle_checkout_id = paddle_checkout_id;
    if (paddle_transaction_id) updateData.paddle_transaction_id = paddle_transaction_id;
    
    updateData.updated_at = new Date().toISOString();

    const { data, error } = await supabaseServer
      .from('bills')
      .update(updateData)
      .eq('id', params.id)
      .select(`
        *,
        patients (id, name, age, chief_complaint),
        bill_items (*)
      `)
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}

// DELETE /api/bills/[id] - Delete a bill
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const { error } = await supabaseServer
      .from('bills')
      .delete()
      .eq('id', params.id);

    if (error) throw error;

    return NextResponse.json({ message: 'Bill deleted successfully' });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
