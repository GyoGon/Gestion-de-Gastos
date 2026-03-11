import { NextRequest, NextResponse } from 'next/server'
import { getTransactions, insertTransactions, getSummary } from '@/lib/db'

export async function GET(req: NextRequest) {
  const mes = req.nextUrl.searchParams.get('mes')
  if (!mes) return NextResponse.json({ error: 'mes requerido (?mes=YYYY-MM)' }, { status: 400 })
  const transactions = getTransactions(mes)
  const summary = getSummary(mes)
  return NextResponse.json({ transactions, summary })
}

export async function POST(req: NextRequest) {
  const body = await req.json()
  const rows = Array.isArray(body) ? body : [body]

  for (const r of rows) {
    if (!r.mes || !r.descripcion || r.monto === undefined) {
      return NextResponse.json({ error: 'Campos requeridos: mes, descripcion, monto' }, { status: 400 })
    }
  }

  const result = insertTransactions(rows)
  return NextResponse.json({ ok: true, ...result })
}
