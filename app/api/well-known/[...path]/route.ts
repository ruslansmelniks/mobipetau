import { NextResponse } from 'next/server'

export async function GET() {
  // Return empty JSON for DevTools requests
  return NextResponse.json({})
} 