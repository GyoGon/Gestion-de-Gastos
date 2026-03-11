import { NextResponse } from 'next/server'
import { getMonths, closeMonth } from '@/lib/db'

export async function POST() {
  const months = getMonths()
  const open = months.filter((m) => m.cerrado === 0 && m.count > 0)
  for (const m of open) {
    closeMonth(m.mes)
  }
  return NextResponse.json({ ok: true, closed: open.map((m) => m.mes) })
}
