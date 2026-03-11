import { NextRequest, NextResponse } from 'next/server'
import { closeMonth, reopenMonth } from '@/lib/db'

export async function POST(req: NextRequest, { params }: { params: Promise<{ mes: string }> }) {
  const { mes } = await params
  const { action } = await req.json().catch(() => ({ action: 'close' }))
  if (action === 'reopen') {
    reopenMonth(mes)
  } else {
    closeMonth(mes)
  }
  return NextResponse.json({ ok: true })
}
