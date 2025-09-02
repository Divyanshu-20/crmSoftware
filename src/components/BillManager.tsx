"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Plus, CreditCard, Edit, Trash2, DollarSign, User, Calendar, CheckCircle, AlertCircle, X } from "lucide-react";

// Types
export interface BillItem {
  id?: string;
  item_type: 'consultation' | 'test' | 'medicine';
  description: string;
  quantity: number;
  rate: number;
  amount: number;
}

export interface Bill {
  id: string;
  patient_id: string;
  doctor_name: string;
  bill_date: string;
  total_amount: number;
  payment_status: 'paid' | 'unpaid';
  paddle_checkout_id?: string;
  paddle_transaction_id?: string;
  created_at: string;
  updated_at: string;
  patients: {
    id: string;
    name: string;
    age: number;
    chief_complaint: string;
  };
  bill_items: BillItem[];
}

interface Patient {
  id: string;
  name: string;
  age: number;
  chief_complaint: string;
}

interface BillFormData {
  patient_id: string;
  doctor_name: string;
  bill_date: string;
  items: Omit<BillItem, 'id' | 'amount'>[];
}

interface BillManagerProps {
  patients: Patient[];
  selectedPatientId?: string;
}

export default function BillManager({ patients, selectedPatientId }: BillManagerProps) {
  const [bills, setBills] = useState<Bill[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingBill, setEditingBill] = useState<Bill | null>(null);
  
  const [billForm, setBillForm] = useState<BillFormData>({
    patient_id: selectedPatientId || '',
    doctor_name: '',
    bill_date: new Date().toISOString().split('T')[0],
    items: []
  });

  const [newItem, setNewItem] = useState<Omit<BillItem, 'id' | 'amount'>>({
    item_type: 'consultation',
    description: '',
    quantity: 1,
    rate: 0
  });

  useEffect(() => {
    loadBills();
  }, []);

  useEffect(() => {
    if (selectedPatientId) {
      setBillForm(prev => ({ ...prev, patient_id: selectedPatientId }));
    }
  }, [selectedPatientId]);

  const loadBills = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/bills');
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('API Error:', response.status, errorData);
        
        if (response.status === 500 && errorData.error?.includes('relation "bills" does not exist')) {
          toast.error('Database tables not found. Please run the SQL migration first.');
          setBills([]);
          return;
        }
        throw new Error(errorData.error || 'Failed to load bills');
      }
      const data = await response.json();
      setBills(data || []);
    } catch (error: any) {
      console.error('Error loading bills:', error);
      if (error.message.includes('relation "bills" does not exist')) {
        toast.error('Please run the database migration (supabase.sql) first');
      } else {
        toast.error('Failed to load bills: ' + error.message);
      }
      setBills([]);
    } finally {
      setLoading(false);
    }
  };

  const addItemToForm = () => {
    if (!newItem.description || newItem.rate <= 0) {
      toast.error('Please fill in all item details');
      return;
    }

    const amount = newItem.quantity * newItem.rate;
    setBillForm(prev => ({
      ...prev,
      items: [...prev.items, { ...newItem, amount }]
    }));

    setNewItem({
      item_type: 'consultation',
      description: '',
      quantity: 1,
      rate: 0
    });
  };

  const removeItemFromForm = (index: number) => {
    setBillForm(prev => ({
      ...prev,
      items: prev.items.filter((_, i) => i !== index)
    }));
  };

  const handleCreateBill = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!billForm.patient_id || !billForm.doctor_name || billForm.items.length === 0) {
      toast.error('Please fill in all required fields and add at least one item');
      return;
    }

    try {
      const response = await fetch('/api/bills', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(billForm)
      });

      if (!response.ok) throw new Error('Failed to create bill');
      const newBill = await response.json();
      
      setBills(prev => [newBill, ...prev]);
      toast.success('Bill created successfully');
      
      // Reset form
      setBillForm({
        patient_id: selectedPatientId || '',
        doctor_name: '',
        bill_date: new Date().toISOString().split('T')[0],
        items: []
      });
      setShowCreateForm(false);
    } catch (error: any) {
      toast.error('Failed to create bill');
      console.error('Error creating bill:', error);
    }
  };

  const handlePayment = async (bill: Bill) => {
    try {
      console.log('Starting payment for bill:', bill.id);
      
      const response = await fetch('/api/paddle/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          bill_id: bill.id,
          customer_email: bill.patients.name.toLowerCase().replace(/\s+/g, '') + '@example.com'
        })
      });

      console.log('Checkout API response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('Checkout API Error:', response.status, errorData);
        throw new Error(errorData.error || 'Failed to create checkout');
      }
      const checkoutData = await response.json();
      console.log('Checkout API response data:', checkoutData);
      
      // Open Paddle checkout using client-side integration
      toast.success('Opening Paddle checkout...');
      console.log('Checkout data:', checkoutData.checkout_data);
      
      try {
        // Initialize Paddle and open checkout
        const { initPaddle } = await import('@/lib/paddleClient');
        console.log('Initializing Paddle...');
        const paddle = await initPaddle();
        console.log('Paddle initialized:', paddle);
        
        // Add validation for checkout data
        if (!checkoutData.checkout_data.items || checkoutData.checkout_data.items.length === 0) {
          throw new Error('No items found in checkout data');
        }
        
        if (!checkoutData.checkout_data.customer || !checkoutData.checkout_data.customer.email) {
          throw new Error('No customer email found in checkout data');
        }
        
        console.log('Validating checkout data:', {
          hasItems: !!checkoutData.checkout_data.items,
          itemCount: checkoutData.checkout_data.items?.length,
          hasCustomer: !!checkoutData.checkout_data.customer,
          customerEmail: checkoutData.checkout_data.customer?.email,
          hasCustomData: !!checkoutData.checkout_data.customData
        });
        
        if (paddle && paddle.Checkout) {
          console.log('Opening Paddle checkout with data:', {
            items: checkoutData.checkout_data.items,
            customer: checkoutData.checkout_data.customer,
            customData: checkoutData.checkout_data.customData,
            successUrl: checkoutData.checkout_data.successUrl,
            cancelUrl: checkoutData.checkout_data.cancelUrl
          });
          
          paddle.Checkout.open({
            items: checkoutData.checkout_data.items,
            customer: checkoutData.checkout_data.customer,
            customData: checkoutData.checkout_data.customData,
            successUrl: checkoutData.checkout_data.successUrl,
            cancelUrl: checkoutData.checkout_data.cancelUrl
          });
        } else {
          console.error('Paddle not properly initialized:', paddle);
          throw new Error('Failed to initialize Paddle - Checkout not available');
        }
      } catch (paddleError: any) {
        console.error('Paddle initialization error:', paddleError);
        
        // Fallback: Show error with more details
        toast.error(`Paddle Error: ${paddleError.message || 'Unknown error'}`);
        
        // For debugging, let's also show the checkout data
        console.log('Checkout data that failed:', checkoutData.checkout_data);
        
        throw new Error(`Paddle error: ${paddleError.message || 'Unknown error'}`);
      }

    } catch (error: any) {
      toast.error('Failed to initiate payment');
      console.error('Payment error:', error);
    }
  };

  const deleteBill = async (billId: string) => {
    if (!confirm('Are you sure you want to delete this bill?')) return;

    try {
      const response = await fetch(`/api/bills/${billId}`, {
        method: 'DELETE'
      });

      if (!response.ok) throw new Error('Failed to delete bill');
      
      setBills(prev => prev.filter(b => b.id !== billId));
      toast.success('Bill deleted successfully');
    } catch (error: any) {
      toast.error('Failed to delete bill');
      console.error('Delete error:', error);
    }
  };

  const getTotalAmount = (items: BillFormData['items']) => {
    return items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const getItemTypeIcon = (type: string) => {
    switch (type) {
      case 'consultation': return <User className="h-4 w-4" />;
      case 'test': return <CheckCircle className="h-4 w-4" />;
      case 'medicine': return <Plus className="h-4 w-4" />;
      default: return <DollarSign className="h-4 w-4" />;
    }
  };

  const getItemTypeColor = (type: string) => {
    switch (type) {
      case 'consultation': return 'text-blue-400';
      case 'test': return 'text-green-400';
      case 'medicine': return 'text-purple-400';
      default: return 'text-gray-400';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h2 className="text-xl font-semibold text-white">Bills & Payments</h2>
          <div className="h-0.5 w-8 bg-gradient-to-r from-green-400 via-cyan-400 to-blue-400 rounded-full"></div>
        </div>
        <button 
          onClick={() => setShowCreateForm(true)}
          className="btn-primary px-4 py-2 text-sm rounded-lg flex items-center gap-2"
        >
          <Plus className="h-4 w-4" /> Create Bill
        </button>
      </div>

      {/* Create Bill Form */}
      {showCreateForm && (
        <div className="card-medical p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-white">Create New Bill</h3>
            <button 
              onClick={() => setShowCreateForm(false)}
              className="p-2 text-gray-400 hover:text-white rounded-lg"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <form onSubmit={handleCreateBill} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-semibold text-white">Patient <span className="text-red-400">*</span></label>
                <select 
                  className="input-medical w-full text-sm mt-1"
                  value={billForm.patient_id}
                  onChange={(e) => setBillForm(prev => ({ ...prev, patient_id: e.target.value }))}
                  required
                >
                  <option value="">Select Patient</option>
                  {patients.map(patient => (
                    <option key={patient.id} value={patient.id}>
                      {patient.name} (Age: {patient.age})
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-semibold text-white">Doctor Name <span className="text-red-400">*</span></label>
                <input 
                  className="input-medical w-full text-sm mt-1"
                  value={billForm.doctor_name}
                  onChange={(e) => setBillForm(prev => ({ ...prev, doctor_name: e.target.value }))}
                  placeholder="Dr. Smith"
                  required
                />
              </div>
              <div>
                <label className="text-sm font-semibold text-white">Bill Date</label>
                <input 
                  type="date"
                  className="input-medical w-full text-sm mt-1"
                  value={billForm.bill_date}
                  onChange={(e) => setBillForm(prev => ({ ...prev, bill_date: e.target.value }))}
                />
              </div>
            </div>

            {/* Add Items */}
            <div className="border-t border-white/10 pt-4">
              <h4 className="text-base font-semibold text-white mb-3">Add Items</h4>
              <div className="grid grid-cols-1 md:grid-cols-5 gap-3 items-end">
                <div>
                  <label className="text-sm text-white">Type</label>
                  <select 
                    className="input-medical w-full text-sm mt-1"
                    value={newItem.item_type}
                    onChange={(e) => setNewItem(prev => ({ ...prev, item_type: e.target.value as any }))}
                  >
                    <option value="consultation">Consultation</option>
                    <option value="test">Test</option>
                    <option value="medicine">Medicine</option>
                  </select>
                </div>
                <div>
                  <label className="text-sm text-white">Description</label>
                  <input 
                    className="input-medical w-full text-sm mt-1"
                    value={newItem.description}
                    onChange={(e) => setNewItem(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Item description"
                  />
                </div>
                <div>
                  <label className="text-sm text-white">Quantity</label>
                  <input 
                    type="number"
                    min="1"
                    className="input-medical w-full text-sm mt-1"
                    value={newItem.quantity}
                    onChange={(e) => setNewItem(prev => ({ ...prev, quantity: parseInt(e.target.value) || 1 }))}
                  />
                </div>
                <div>
                  <label className="text-sm text-white">Rate ($)</label>
                  <input 
                    type="number"
                    step="0.01"
                    min="0"
                    className="input-medical w-full text-sm mt-1"
                    value={newItem.rate}
                    onChange={(e) => setNewItem(prev => ({ ...prev, rate: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                <button 
                  type="button"
                  onClick={addItemToForm}
                  className="btn-secondary px-4 py-2 text-sm"
                >
                  Add Item
                </button>
              </div>
            </div>

            {/* Items List */}
            {billForm.items.length > 0 && (
              <div className="space-y-2">
                <h5 className="text-sm font-semibold text-white">Bill Items</h5>
                <div className="space-y-2">
                  {billForm.items.map((item, index) => (
                    <div key={index} className="flex items-center justify-between bg-black/20 rounded-lg p-3">
                      <div className="flex items-center gap-3 flex-1">
                        <div className={`${getItemTypeColor(item.item_type)}`}>
                          {getItemTypeIcon(item.item_type)}
                        </div>
                        <div className="flex-1">
                          <p className="text-white text-sm font-medium">{item.description}</p>
                          <p className="text-gray-400 text-xs">
                            {item.quantity} × {formatCurrency(item.rate)} = {formatCurrency(item.quantity * item.rate)}
                          </p>
                        </div>
                      </div>
                      <button 
                        type="button"
                        onClick={() => removeItemFromForm(index)}
                        className="p-1 text-red-400 hover:text-red-300"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
                <div className="text-right">
                  <span className="text-lg font-semibold text-white">
                    Total: {formatCurrency(getTotalAmount(billForm.items))}
                  </span>
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-4">
              <button 
                type="submit"
                className="btn-primary px-6 py-2"
                disabled={!billForm.patient_id || !billForm.doctor_name || billForm.items.length === 0}
              >
                Create Bill
              </button>
              <button 
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="btn-secondary px-6 py-2"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Bills List */}
      <div className="card-medical p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Recent Bills</h3>
        
        {loading ? (
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="h-20 skeleton rounded-lg" />
            ))}
          </div>
        ) : bills.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-400 mb-4">No bills created yet.</p>
            <div className="mb-6 p-4 bg-blue-400/10 border border-blue-400/30 rounded-lg text-left max-w-md mx-auto">
              <h4 className="text-blue-400 font-semibold mb-2">Setup Required:</h4>
              <ol className="text-sm text-gray-300 space-y-1">
                <li>1. Run the SQL migration in Supabase dashboard</li>
                <li>2. Copy and execute the contents of supabase.sql</li>
                <li>3. This creates the billing tables</li>
              </ol>
            </div>
            <button 
              onClick={() => setShowCreateForm(true)}
              className="btn-primary px-4 py-2 text-sm"
            >
              Create First Bill
            </button>
          </div>
        ) : (
          <div className="space-y-3">
            {bills.map(bill => (
              <div key={bill.id} className="patient-card">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 bg-gradient-to-br from-green-400 via-cyan-400 to-blue-400 rounded-full flex items-center justify-center text-white font-semibold text-sm">
                      {bill.patients.name.charAt(0).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-white">{bill.patients.name}</h4>
                      <p className="text-sm text-gray-400">
                        Dr. {bill.doctor_name} • {new Date(bill.bill_date).toLocaleDateString()}
                      </p>
                      <p className="text-xs text-gray-500">{bill.bill_items.length} items</p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <p className="font-semibold text-white">{formatCurrency(bill.total_amount)}</p>
                      <div className="flex items-center gap-1">
                        {bill.payment_status === 'paid' ? (
                          <>
                            <CheckCircle className="h-4 w-4 text-green-400" />
                            <span className="text-xs text-green-400">Paid</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="h-4 w-4 text-yellow-400" />
                            <span className="text-xs text-yellow-400">Unpaid</span>
                          </>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      {bill.payment_status === 'unpaid' && (
                        <button
                          onClick={() => handlePayment(bill)}
                          className="p-2 text-green-400 hover:text-green-300 hover:bg-green-400/10 rounded-lg transition-all duration-200"
                          title="Pay Bill"
                        >
                          <CreditCard className="h-4 w-4" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteBill(bill.id)}
                        className="p-2 text-red-400 hover:text-red-300 hover:bg-red-400/10 rounded-lg transition-all duration-200"
                        title="Delete Bill"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
                
                {/* Bill Items */}
                <div className="mt-3 pt-3 border-t border-white/10 space-y-2">
                  {bill.bill_items.map(item => (
                    <div key={item.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <div className={getItemTypeColor(item.item_type)}>
                          {getItemTypeIcon(item.item_type)}
                        </div>
                        <span className="text-gray-300">{item.description}</span>
                      </div>
                      <span className="text-gray-400">
                        {item.quantity} × {formatCurrency(item.rate)} = {formatCurrency(item.amount)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
