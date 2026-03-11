import { NextRequest, NextResponse } from 'next/server'
import { getDb } from '@/lib/db'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ mes: string }> }) {
  const { mes } = await params
  const db = getDb()
  db.prepare('DELETE FROM transactions WHERE mes = ?').run(mes)
  db.prepare('DELETE FROM months WHERE mes = ?').run(mes)
  return NextResponse.json({ ok: true })
}
