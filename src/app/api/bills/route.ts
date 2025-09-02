import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';

// GET /api/bills - List all bills with patient info
export async function GET() {
  try {
    console.log('🔍 Starting bills GET request');
    
    // Test basic connection first
    console.log('🔍 Testing Supabase connection...');
    const { data: testData, error: testError } = await supabaseServer
      .from('patients')
      .select('id')
      .limit(1);
    
    if (testError) {
      console.error('❌ Supabase connection test failed:', testError);
      throw new Error(`Supabase connection failed: ${testError.message}`);
    }
    
    console.log('✅ Supabase connection test passed');
    
    const { data, error } = await supabaseServer
      .from('bills')
      .select(`
        *,
        patients (id, name, age, chief_complaint),
        bill_items (*)
      `)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('❌ Bills query error:', error);
      throw error;
    }

    console.log('✅ Bills query successful, returning data');
    return NextResponse.json(data);
  } catch (error: any) {
    console.error('💥 Bills GET error:', {
      message: error.message,
      stack: error.stack,
      name: error.name
    });
    return NextResponse.json(
      { 
        error: error.message,
        details: error.stack?.substring(0, 500) // First 500 chars of stack trace
      },
      { status: 500 }
    );
  }
}

// POST /api/bills - Create a new bill
export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { patient_id, doctor_name, bill_date, items } = body;

    if (!patient_id || !doctor_name || !items || items.length === 0) {
      return NextResponse.json(
        { error: 'Missing required fields: patient_id, doctor_name, and items' },
        { status: 400 }
      );
    }

    // Create bill
    const { data: billData, error: billError } = await supabaseServer
      .from('bills')
      .insert([{
        patient_id,
        doctor_name,
        bill_date: bill_date || new Date().toISOString().split('T')[0],
        total_amount: 0 // Will be updated by triggers
      }])
      .select()
      .single();

    if (billError) throw billError;

    // Create bill items
    const itemsToInsert = items.map((item: any) => ({
      bill_id: billData.id,
      item_type: item.item_type,
      description: item.description,
      quantity: item.quantity,
      rate: parseFloat(item.rate),
      amount: parseFloat(item.rate) * item.quantity
    }));

    const { error: itemsError } = await supabaseServer
      .from('bill_items')
      .insert(itemsToInsert);

    if (itemsError) throw itemsError;

    // Fetch the complete bill with items
    const { data: completeBill, error: fetchError } = await supabaseServer
      .from('bills')
      .select(`
        *,
        patients (id, name, age, chief_complaint),
        bill_items (*)
      `)
      .eq('id', billData.id)
      .single();

    if (fetchError) throw fetchError;

    return NextResponse.json(completeBill, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
