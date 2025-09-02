# ENT Clinic Billing Feature - Setup & Testing Guide

## Overview

This guide provides instructions for setting up and testing the billing feature integrated with Paddle sandbox for the ENT Clinic CRM system.

## Features Implemented

- ✅ Bill creation and management
- ✅ Dynamic bill item addition (consultation, tests, medicines)  
- ✅ Automatic bill total calculation
- ✅ Paddle sandbox payment integration
- ✅ Webhook handling for payment status updates
- ✅ Patient-bill relationship management
- ✅ Payment status tracking (paid/unpaid)

## Database Setup

### 1. Run Database Migrations

Execute the updated `supabase.sql` file in your Supabase dashboard to create the billing tables:

```sql
-- Bills table
CREATE TABLE public.bills (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  patient_id uuid NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
  doctor_name text NOT NULL,
  bill_date date NOT NULL DEFAULT current_date,
  total_amount decimal(10,2) NOT NULL DEFAULT 0.00,
  payment_status text NOT NULL DEFAULT 'unpaid' CHECK (payment_status IN ('paid', 'unpaid')),
  paddle_checkout_id text,
  paddle_transaction_id text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Bill items table
CREATE TABLE public.bill_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  bill_id uuid NOT NULL REFERENCES public.bills(id) ON DELETE CASCADE,
  item_type text NOT NULL CHECK (item_type IN ('consultation', 'test', 'medicine')),
  description text NOT NULL,
  quantity int NOT NULL DEFAULT 1 CHECK (quantity > 0),
  rate decimal(10,2) NOT NULL CHECK (rate >= 0),
  amount decimal(10,2) NOT NULL CHECK (amount >= 0),
  created_at timestamptz NOT NULL DEFAULT now()
);
```

### 2. Enable Row Level Security (RLS)

The SQL file includes RLS policies for the new tables to maintain security.

## Paddle Sandbox Setup

### 1. Create Paddle Sandbox Account

1. Go to [Paddle Sandbox](https://sandbox-vendors.paddle.com/)
2. Create a developer account
3. Complete the vendor setup process

### 2. Create Products and Prices

In your Paddle sandbox dashboard:

1. **Products** → Create the following products:
   - ENT Consultation
   - Medical Tests  
   - Medicines

2. **Prices** → Create prices for each product:
   - Consultation: $150.00 USD
   - Test: $75.00 USD
   - Medicine: $25.00 USD

3. **Copy the Price IDs** and update them in `src/lib/paddleClient.ts`:

```typescript
export const TEST_PRICE_IDS = {
  CONSULTATION: 'pro_01k460kve28wj9bdmmypdhfrt4',
  TEST: 'pro_01k460mr0qexhsn9cq0kb5cxd4',
  MEDICINE: 'pro_01k460nfnwr9qra9ffch56eskq'
};
```

### 3. Configure Webhook Endpoint

1. In Paddle dashboard, go to **Developer Tools** → **Webhooks**
2. Add webhook URL: `https://yourdomain.com/api/paddle/webhook`
3. Select events:
   - `transaction.completed`
   - `transaction.payment_failed`
   - `checkout.completed`
4. Save the webhook configuration

### 4. Get API Credentials

1. Go to **Developer Tools** → **API Keys**
2. Copy your **Client Token** (starts with `test_`)
3. Update `PADDLE_CLIENT_TOKEN` in `src/lib/paddleClient.ts`

```typescript
const PADDLE_CLIENT_TOKEN = 'test_your_client_token_here';
```

## Environment Variables

Add these environment variables to your `.env.local` file:

```env
# Existing Supabase variables
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key

# Paddle Sandbox Configuration
NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=test_your_client_token_here
```

## Installation & Setup

### 1. Install Dependencies

```bash
npm install
```

The Paddle SDK (`@paddlehq/paddle-js`) is already added to package.json.

### 2. Run Database Migrations

Execute the `supabase.sql` file in your Supabase dashboard SQL editor.

### 3. Start Development Server

```bash
npm run dev
```

## Testing the Billing Feature

### 1. Access the Application

1. Navigate to `http://localhost:3000`
2. Create a patient if none exists
3. Click on the **"Bills & Payments"** tab

### 2. Create a Test Bill

1. Click **"Create Bill"** button
2. Fill in the form:
   - **Patient**: Select a patient
   - **Doctor Name**: Enter a doctor's name
   - **Bill Date**: Use default or select a date
3. Add bill items:
   - **Type**: Choose consultation, test, or medicine
   - **Description**: Enter item description
   - **Quantity**: Set quantity
   - **Rate**: Enter rate in USD
   - Click **"Add Item"**
4. Repeat for multiple items
5. Click **"Create Bill"**

### 3. Test Paddle Payments

1. In the bills list, find an unpaid bill
2. Click the **credit card icon** (💳) to initiate payment
3. The system will simulate Paddle checkout process
4. After 3 seconds, the bill will automatically be marked as "paid"

### 4. Test Card Details

For actual Paddle sandbox testing, use these test cards:

#### Successful Payments
- **Visa**: `4000000000000002`
- **Mastercard**: `5555555555554444`
- **American Express**: `378282246310005`

#### Declined Payments  
- **Visa Declined**: `4000000000000069`
- **Insufficient Funds**: `4000000000000051`
- **Mastercard Declined**: `5555555555554477`
- **Amex Declined**: `378282246310013`

#### Test CVV and Expiry
- **CVV**: Any 3-digit number (e.g., 123)
- **Expiry**: Any future date (e.g., 12/25)

### 5. Webhook Testing

To test webhooks locally:

1. **Use ngrok** to expose your local server:
   ```bash
   ngrok http 3000
   ```

2. **Update webhook URL** in Paddle dashboard to:
   ```
   https://your-ngrok-url.ngrok.io/api/paddle/webhook
   ```

3. **Test webhook events** by making actual payments in Paddle sandbox

## API Endpoints

### Bill Management
- `GET /api/bills` - List all bills
- `POST /api/bills` - Create a new bill
- `GET /api/bills/[id]` - Get specific bill
- `PUT /api/bills/[id]` - Update bill
- `DELETE /api/bills/[id]` - Delete bill

### Bill Items
- `POST /api/bills/[id]/items` - Add item to bill
- `PUT /api/bills/[id]/items` - Update bill item  
- `DELETE /api/bills/[id]/items` - Delete bill item

### Paddle Integration
- `POST /api/paddle/checkout` - Create checkout session
- `POST /api/paddle/webhook` - Handle Paddle webhooks

## Sample API Requests

### Create Bill
```javascript
const response = await fetch('/api/bills', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    patient_id: 'uuid-of-patient',
    doctor_name: 'Dr. Smith',
    bill_date: '2024-01-15',
    items: [
      {
        item_type: 'consultation',
        description: 'ENT Consultation',
        quantity: 1,
        rate: 150.00
      },
      {
        item_type: 'test',
        description: 'Hearing Test',
        quantity: 1,
        rate: 75.00
      }
    ]
  })
});
```

### Initiate Payment
```javascript
const response = await fetch('/api/paddle/checkout', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    bill_id: 'uuid-of-bill',
    customer_email: 'patient@example.com'
  })
});
```

## Troubleshooting

### Common Issues

1. **Bills not showing**: Check if patients exist and database migrations ran successfully
2. **Payment not working**: Verify Paddle client token and price IDs are correct
3. **Webhook not receiving events**: Ensure webhook URL is publicly accessible (use ngrok for local testing)
4. **Database errors**: Check RLS policies and user permissions

### Debug Mode

Enable console logging for Paddle events by checking browser dev tools console during payment flow.

### Support

For Paddle-specific issues:
- [Paddle Developer Documentation](https://developer.paddle.com/)
- [Paddle Sandbox Environment](https://sandbox-vendors.paddle.com/)

## Production Considerations

When moving to production:

1. **Switch to Paddle Live Environment**:
   ```typescript
   const PADDLE_ENVIRONMENT = 'production';
   const PADDLE_CLIENT_TOKEN = 'live_your_live_token_here';
   ```

2. **Update Price IDs** to live environment price IDs

3. **Configure Live Webhook URL** in Paddle dashboard

4. **Enable Paddle Vendor Account** verification for live transactions

5. **Test thoroughly** with small amounts before going live

## Security Notes

- All sensitive Paddle configuration is client-side only for sandbox testing
- Webhook signatures should be verified in production
- Never expose live Paddle tokens in client-side code
- Use server-side API keys for production webhook validation

---

**Note**: This implementation uses Paddle sandbox for testing only. No real money transactions will occur. For production use, proper Paddle vendor verification and live environment setup is required.
