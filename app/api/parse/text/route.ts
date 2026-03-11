import { NextRequest, NextResponse } from 'next/server'
import { parseTransactionText } from '@/lib/parser'

export async function POST(req: NextRequest) {
  const { text, includePaymentsOfBalance } = await req.json()
  if (!text || typeof text !== 'string') {
    return NextResponse.json({ error: 'text requerido' }, { status: 400 })
  }
  const transactions = parseTransactionText(text, { includePaymentsOfBalance: !!includePaymentsOfBalance })
  return NextResponse.json(transactions)
}
