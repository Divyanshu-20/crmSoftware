import { NextResponse } from 'next/server';
import { supabaseServer } from '@/lib/supabaseServer';


// POST /api/bills/[id]/items - Add an item to a bill
export async function POST(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { item_type, description, quantity, rate } = body;

    if (!item_type || !description || !quantity || !rate) {
      return NextResponse.json(
        { error: 'Missing required fields: item_type, description, quantity, rate' },
        { status: 400 }
      );
    }

    const amount = parseFloat(rate) * quantity;

    const { data, error } = await supabaseServer
      .from('bill_items')
      .insert([{
        bill_id: params.id,
        item_type,
        description,
        quantity,
        rate: parseFloat(rate),
        amount
      }])
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data, { status: 201 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// PUT /api/bills/[id]/items - Update a bill item
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    // Implementation placeholder
    return NextResponse.json({ message: 'Update not implemented yet' }, { status: 501 });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
try {
    const body = await request.json();
    const { item_id, item_type, description, quantity, rate } = body;

    if (!item_id) {
      return NextResponse.json(
        { error: 'item_id is required' },
        { status: 400 }
      );
    }

    const updateData: any = {};
    if (item_type) updateData.item_type = item_type;
    if (description) updateData.description = description;
    if (quantity) updateData.quantity = quantity;
    if (rate) updateData.rate = parseFloat(rate);
    
    // Calculate amount if quantity or rate is updated
    if (quantity || rate) {
      // Get current item data
      const { data: currentItem } = await supabaseServer
        .from('bill_items')
        .select('quantity, rate')
        .eq('id', item_id)
        .single();

      if (currentItem) {
        const newQuantity = quantity || currentItem.quantity;
        const newRate = rate ? parseFloat(rate) : currentItem.rate;
        updateData.amount = newQuantity * newRate;
      }
    }

    const { data, error } = await supabaseServer
      .from('bill_items')
      .update(updateData)
      .eq('id', item_id)
      .eq('bill_id', params.id)
      .select()
      .single();

    if (error) throw error;

    return NextResponse.json(data);
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}

// DELETE /api/bills/[id]/items - Delete a bill item
export async function DELETE(request: Request, { params }: { params: { id: string } }) {
  try {
    const body = await request.json();
    const { item_id } = body;

    if (!item_id) {
      return NextResponse.json(
        { error: 'item_id is required' },
        { status: 400 }
      );
    }

    const { error } = await supabaseServer
      .from('bill_items')
      .delete()
      .eq('id', item_id)
      .eq('bill_id', params.id);

    if (error) throw error;

    return NextResponse.json({ message: 'Bill item deleted successfully' });
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    );
  }
}
