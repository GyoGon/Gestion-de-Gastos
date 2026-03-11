'use client'

import { useState, useEffect, useCallback } from 'react'
import { formatCLP, formatMes } from '@/lib/parser'

interface Transaction {
  id: number
  fecha: string | null
  mes: string
  descripcion: string
  monto: number
}

interface Summary {
  total_cargos: number
  total_pagos: number
  saldo: number
  count: number
}

interface MonthData {
  mes: string
  cerrado: number
  total_cargos: number
  total_pagos: number
  saldo: number
  count: number
}

function currentMonthStr() {
  const now = new Date()
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`
}

export default function ResumenPage() {
  const [months, setMonths] = useState<MonthData[]>([])
  const [selectedMes, setSelectedMes] = useState(currentMonthStr())
  const [transactions, setTransactions] = useState<Transaction[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(false)
  const [closing, setClosing] = useState(false)
  const [closingAll, setClosingAll] = useState(false)

  const fetchMonths = useCallback(async () => {
    const res = await fetch('/api/months')
    const data: MonthData[] = await res.json()
    setMonths(data)
    // Auto-select most recent month if current month has no data
    if (data.length > 0 && !data.find((m) => m.mes === selectedMes)) {
      setSelectedMes(data[0].mes)
    }
  }, [selectedMes])

  const fetchData = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/transactions?mes=${selectedMes}`)
      const data = await res.json()
      setTransactions(data.transactions)
      setSummary(data.summary)
    } finally {
      setLoading(false)
    }
  }, [selectedMes])

  useEffect(() => { fetchMonths() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => { fetchData() }, [fetchData])

  async function handleDelete(id: number) {
    await fetch(`/api/transactions/${id}`, { method: 'DELETE' })
    fetchData()
    fetchMonths()
  }

  async function handleDeleteMonth() {
    if (!confirm(`¿Borrar TODAS las transacciones de ${formatMes(selectedMes)}? Esto no se puede deshacer.`)) return
    await fetch(`/api/months/${selectedMes}`, { method: 'DELETE' })
    fetchMonths()
    fetchData()
  }

  async function handleClose() {
    if (!confirm(`¿Cerrar el mes ${formatMes(selectedMes)}? Quedará guardado en el historial.`)) return
    setClosing(true)
    await fetch(`/api/months/${selectedMes}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'close' }),
    })
    setClosing(false)
    fetchMonths()
    fetchData()
  }

  async function handleCloseAll() {
    const names = openMonths.filter((m) => m.count > 0).map((m) => formatMes(m.mes)).join(' y ')
    if (!confirm(`¿Cerrar el período completo (${names})? Quedará guardado en el historial.`)) return
    setClosingAll(true)
    await fetch('/api/months/close-all', { method: 'POST' })
    setClosingAll(false)
    fetchMonths()
    fetchData()
  }

  const openMonths = months.filter((m) => m.cerrado === 0)
  const currentMonthData = months.find((m) => m.mes === selectedMes)
  const isClosed = currentMonthData?.cerrado === 1

  // Total real = suma de todos los meses abiertos
  const totalDeuda = openMonths.reduce((s, m) => s + m.saldo, 0)
  const totalCargos = openMonths.reduce((s, m) => s + m.total_cargos, 0)
  const totalPagos = openMonths.reduce((s, m) => s + m.total_pagos, 0)
  const hasOpenData = openMonths.some((m) => m.count > 0)

  // Running balance for selected month table
  const sorted = [...transactions].sort((a, b) => {
    if (!a.fecha && !b.fecha) return 0
    if (!a.fecha) return 1
    if (!b.fecha) return -1
    return a.fecha < b.fecha ? -1 : 1
  })
  const withBalance = sorted.map((t, i, arr) => ({
    ...t,
    balance: arr.slice(0, i + 1).reduce((s, x) => s + x.monto, 0),
  })).reverse()

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-zinc-100">Resumen</h1>

      {/* Totales globales (meses abiertos) */}
      {hasOpenData && (
        <div className="space-y-2">
          <p className="text-xs text-zinc-600 uppercase tracking-wide">
            Total acumulado — meses abiertos
            {openMonths.length > 1 && (
              <span className="ml-2 normal-case text-zinc-700">
                ({openMonths.map(m => formatMes(m.mes)).join(', ')})
              </span>
            )}
          </p>
          <div className="grid grid-cols-3 gap-3">
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Cargos</p>
              <p className="text-lg font-bold text-red-400">-{formatCLP(totalCargos)}</p>
            </div>
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-4">
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">Pagos / Abonos</p>
              <p className="text-lg font-bold text-emerald-400">+{formatCLP(totalPagos)}</p>
            </div>
            <div className={`border rounded-xl p-4 ${totalDeuda < 0 ? 'bg-red-950/30 border-red-800' : 'bg-emerald-950/30 border-emerald-800'}`}>
              <p className="text-xs text-zinc-500 uppercase tracking-wide mb-1">
                {totalDeuda < 0 ? 'Deuda actual' : 'Saldo a favor'}
              </p>
              <p className={`text-lg font-bold ${totalDeuda < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                {totalDeuda < 0 ? '-' : '+'}{formatCLP(totalDeuda)}
              </p>
            </div>
          </div>
          {openMonths.filter((m) => m.count > 0).length > 0 && (
            <div className="flex justify-end">
              <button
                onClick={handleCloseAll}
                disabled={closingAll}
                className="text-sm text-zinc-500 hover:text-zinc-300 border border-zinc-700 hover:border-zinc-500 rounded-lg px-4 py-2 transition-colors disabled:opacity-40"
              >
                {closingAll ? 'Cerrando...' : '🔒 Cerrar período'}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Selector de mes para ver el detalle */}
      <div className="flex items-center justify-between gap-4 pt-2 border-t border-zinc-800">
        <p className="text-sm text-zinc-500">Detalle por mes</p>
        <div className="flex items-center gap-2">
          {!isClosed && summary && summary.count > 0 && (
            <button
              onClick={handleDeleteMonth}
              className="text-xs text-zinc-600 hover:text-red-400 border border-zinc-800 hover:border-red-900 rounded-lg px-3 py-2 transition-colors"
              title="Borrar todas las transacciones de este mes"
            >
              🗑 Borrar mes
            </button>
          )}
          {months.length > 0 && (
            <select
              value={selectedMes}
              onChange={(e) => setSelectedMes(e.target.value)}
              className="bg-zinc-800 border border-zinc-700 text-zinc-200 text-sm rounded-lg px-3 py-2 focus:outline-none focus:border-zinc-500"
            >
              {months.map((m) => (
                <option key={m.mes} value={m.mes}>
                  {formatMes(m.mes)} {m.cerrado ? '(cerrado)' : ''}
                </option>
              ))}
            </select>
          )}
        </div>
      </div>

      {isClosed && (
        <div className="bg-zinc-800/50 border border-zinc-700 rounded-lg px-4 py-2 text-sm text-zinc-500 text-center -mt-2">
          Mes cerrado — visible en Historial
        </div>
      )}

      {/* Transactions table */}
      {loading ? (
        <p className="text-center text-zinc-600 py-8">Cargando...</p>
      ) : transactions.length === 0 ? (
        <div className="text-center py-12 text-zinc-600">
          <p className="text-4xl mb-3">📭</p>
          <p>No hay transacciones para este mes.</p>
          <p className="text-sm mt-1">Importa desde la pestaña <strong className="text-zinc-400">Importar</strong>.</p>
        </div>
      ) : (
        <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wide">
                <th className="text-left px-4 py-3 font-medium">Fecha</th>
                <th className="text-left px-4 py-3 font-medium">Descripción</th>
                <th className="text-right px-4 py-3 font-medium">Monto</th>
                <th className="text-right px-4 py-3 font-medium">Acum. mes</th>
                {!isClosed && <th className="px-3 py-3"></th>}
              </tr>
            </thead>
            <tbody>
              {withBalance.map((row) => (
                <tr key={row.id} className="border-b border-zinc-800/50 hover:bg-zinc-800/20 transition-colors">
                  <td className="px-4 py-2.5 text-zinc-500 whitespace-nowrap font-mono text-xs">
                    {row.fecha
                      ? row.fecha.slice(8) + '/' + row.fecha.slice(5, 7) + '/' + row.fecha.slice(0, 4)
                      : '—'}
                  </td>
                  <td className="px-4 py-2.5 text-zinc-300 max-w-[180px] truncate" title={row.descripcion}>
                    {row.descripcion}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono font-medium whitespace-nowrap ${row.monto < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                    {row.monto < 0 ? '-' : '+'}{formatCLP(row.monto)}
                  </td>
                  <td className={`px-4 py-2.5 text-right font-mono text-xs whitespace-nowrap ${row.balance < 0 ? 'text-red-500' : 'text-emerald-500'}`}>
                    {row.balance < 0 ? '-' : '+'}{formatCLP(row.balance)}
                  </td>
                  {!isClosed && (
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => handleDelete(row.id)}
                        className="text-zinc-700 hover:text-red-400 transition-colors text-xs"
                        title="Eliminar"
                      >
                        ✕
                      </button>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
