# Netlify Deployment Crash - Debug Guide

## Critical Issues Found

### 1. ❌ CRITICAL: Missing Paddle API Key
**Location**: `src/app/api/paddle/checkout/route.ts`
**Issue**: The Paddle SDK is being initialized with `process.env.PADDLE_API_KEY!` but this environment variable is not documented.

**Fix Required**: Add the missing environment variable to your Netlify environment settings:
```
PADDLE_API_KEY=your_paddle_api_key_here
```

### 2. ❌ Missing Environment Variables
**Required environment variables for Netlify**:
```
NEXT_PUBLIC_SUPABASE_URL=your_supabase_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_PADDLE_ENVIRONMENT=sandbox
NEXT_PUBLIC_PADDLE_CLIENT_TOKEN=test_your_client_token_here
PADDLE_API_KEY=your_paddle_api_key_here
```

### 3. ⚠️ Potential: Node SDK Server-Side Usage
**Location**: `src/app/api/paddle/checkout/route.ts`
**Issue**: Using `@paddle/paddle-node-sdk` which might not be compatible with Netlify Edge Functions.

**Recommendation**: Consider using HTTP requests to Paddle API instead of the Node SDK.

## Immediate Fixes for Netlify Deployment

### Step 1: Set Environment Variables in Netlify
1. Go to your Netlify site dashboard
2. Navigate to **Site Configuration** → **Environment Variables**
3. Add all the required environment variables listed above

### Step 2: Update Paddle Integration
The current setup uses both client-side (`@paddle/paddle-js`) and server-side (`@paddle/paddle-node-sdk`) Paddle SDKs. For better Netlify compatibility, consider using only the client-side SDK or HTTP requests.

### Step 3: Enable Netlify Functions
Make sure your `netlify.toml` includes:
```toml
[build]
  publish = ".next"
  command = "npm run build"

[functions]
  directory = ".netlify/functions"

[[redirects]]
  from = "/api/*"
  to = "/.netlify/functions/:splat"
  status = 200
```

### Step 4: Check Database Tables
Ensure your Supabase database has the required tables:
- `patients`
- `bills` 
- `bill_items`

Run the SQL from `supabase.sql` in your Supabase dashboard if not done already.

## Testing the Fix

1. Set all environment variables in Netlify
2. Redeploy your application
3. Check the function logs in Netlify dashboard
4. Test the API endpoints:
   - `/api/test` (should work)
   - `/api/bills` (main issue point)
   - `/api/paddle/checkout` (requires Paddle API key)

## Environment Variables Summary

Based on your code, you need these environment variables:

### Required for Supabase:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Required for Paddle:
- `NEXT_PUBLIC_PADDLE_ENVIRONMENT` (set to "sandbox")
- `NEXT_PUBLIC_PADDLE_CLIENT_TOKEN` (client-side token)
- `PADDLE_API_KEY` (server-side API key - **MISSING**)

## Most Likely Cause
The crash is most likely caused by the missing `PADDLE_API_KEY` environment variable. When the Paddle SDK tries to initialize without this key, it throws an unhandled error that crashes the serverless function.

## Next Steps
1. Add all missing environment variables to Netlify
2. Redeploy
3. Check if the issue is resolved
4. If still crashing, check Netlify function logs for more specific errors
