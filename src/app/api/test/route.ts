import { NextResponse } from 'next/server';

export async function GET() {
  try {
    console.log('🔍 Test endpoint called');
    
    // Check environment variables
    const envStatus = {
      SUPABASE_URL: !!process.env.NEXT_PUBLIC_SUPABASE_URL,
      SUPABASE_ANON_KEY: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
      PADDLE_API_KEY: !!process.env.PADDLE_API_KEY,
      PADDLE_CLIENT_TOKEN: !!process.env.NEXT_PUBLIC_PADDLE_CLIENT_TOKEN,
      PADDLE_ENVIRONMENT: process.env.NEXT_PUBLIC_PADDLE_ENVIRONMENT || 'not_set'
    };
    
    console.log('🔍 Environment check:', envStatus);
    
    return NextResponse.json({ 
      message: 'API is working!',
      timestamp: new Date().toISOString(),
      environment_check: envStatus,
      node_version: process.version
    });
  } catch (error: any) {
    console.error('💥 Test endpoint error:', error);
    return NextResponse.json(
      { 
        error: 'Test endpoint failed',
        details: error.message 
      },
      { status: 500 }
    );
  }
}
