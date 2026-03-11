import { NextResponse } from 'next/server'
import { getMonths } from '@/lib/db'

export async function GET() {
  const months = getMonths()
  return NextResponse.json(months)
}
