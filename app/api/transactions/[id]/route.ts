import { NextRequest, NextResponse } from 'next/server'
import { deleteTransaction } from '@/lib/db'

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  deleteTransaction(parseInt(id, 10))
  return NextResponse.json({ ok: true })
}
