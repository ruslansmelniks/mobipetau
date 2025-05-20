import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  return NextResponse.json({ 
    message: 'Admin API accessible', 
    timestamp: new Date().toISOString()
  });
} 