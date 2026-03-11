'use client'

import { useState, useEffect } from 'react'
import { formatCLP, formatMes } from '@/lib/parser'

interface MonthData {
  mes: string
  cerrado: number
  saldo_final: number | null
  cerrado_at: string | null
  total_cargos: number
  total_pagos: number
  saldo: number
  count: number
}

interface Transaction {
  id: number
  fecha: string | null
  descripcion: string
  monto: number
}

export default function HistorialPage() {
  const [months, setMonths] = useState<MonthData[]>([])
  const [expanded, setExpanded] = useState<string | null>(null)
  const [details, setDetails] = useState<Record<string, Transaction[]>>({})
  const [loading, setLoading] = useState(true)
  const [reopening, setReopening] = useState<string | null>(null)

  async function fetchMonths() {
    const res = await fetch('/api/months')
    const data = await res.json()
    setMonths(data.filter((m: MonthData) => m.cerrado === 1))
    setLoading(false)
  }

  useEffect(() => { fetchMonths() }, [])

  async function toggleExpand(mes: string) {
    if (expanded === mes) {
      setExpanded(null)
      return
    }
    setExpanded(mes)
    if (!details[mes]) {
      const res = await fetch(`/api/transactions?mes=${mes}`)
      const data = await res.json()
      setDetails((prev) => ({ ...prev, [mes]: data.transactions }))
    }
  }

  async function handleReopen(mes: string) {
    if (!confirm(`¿Reabrir el mes ${formatMes(mes)}? Podrás volver a editarlo.`)) return
    setReopening(mes)
    await fetch(`/api/months/${mes}/close`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'reopen' }),
    })
    setReopening(null)
    fetchMonths()
    setExpanded(null)
  }

  if (loading) return <p className="text-center text-zinc-600 py-16">Cargando...</p>

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Historial</h1>
        <p className="text-sm text-zinc-500 mt-1">Meses cerrados y sus saldos finales.</p>
      </div>

      {months.length === 0 ? (
        <div className="text-center py-16 text-zinc-600">
          <p className="text-4xl mb-3">📆</p>
          <p>No hay meses cerrados aún.</p>
          <p className="text-sm mt-1">
            Cierra un mes desde <strong className="text-zinc-400">Resumen</strong> para verlo aquí.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {months.map((m) => (
            <div key={m.mes} className="bg-zinc-900 border border-zinc-800 rounded-xl overflow-hidden">
              {/* Header row */}
              <button
                onClick={() => toggleExpand(m.mes)}
                className="w-full px-5 py-4 flex items-center justify-between hover:bg-zinc-800/40 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <span className="font-semibold text-zinc-100 capitalize">{formatMes(m.mes)}</span>
                  <span className="text-xs text-zinc-600">{m.count} transacciones</span>
                </div>
                <div className="flex items-center gap-6">
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-zinc-600">Cargos</p>
                    <p className="text-sm font-mono text-red-400">-{formatCLP(m.total_cargos)}</p>
                  </div>
                  <div className="text-right hidden sm:block">
                    <p className="text-xs text-zinc-600">Pagos</p>
                    <p className="text-sm font-mono text-emerald-400">+{formatCLP(m.total_pagos)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-zinc-600">Saldo final</p>
                    <p className={`text-sm font-mono font-bold ${m.saldo < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {m.saldo < 0 ? '-' : '+'}{formatCLP(m.saldo)}
                    </p>
                  </div>
                  <span className="text-zinc-600 text-xs ml-2">{expanded === m.mes ? '▲' : '▼'}</span>
                </div>
              </button>

              {/* Detail */}
              {expanded === m.mes && (
                <div className="border-t border-zinc-800">
                  {details[m.mes] ? (
                    <>
                      <table className="w-full text-sm">
                        <tbody>
                          {details[m.mes].map((t) => (
                            <tr key={t.id} className="border-b border-zinc-800/40 hover:bg-zinc-800/20">
                              <td className="px-4 py-2.5 text-zinc-600 font-mono text-xs whitespace-nowrap">
                                {t.fecha
                                  ? t.fecha.slice(8) + '/' + t.fecha.slice(5, 7)
                                  : '—'}
                              </td>
                              <td className="px-4 py-2.5 text-zinc-400 truncate max-w-[200px]">{t.descripcion}</td>
                              <td className={`px-4 py-2.5 text-right font-mono font-medium whitespace-nowrap ${t.monto < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                                {t.monto < 0 ? '-' : '+'}{formatCLP(t.monto)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                      <div className="px-5 py-3 flex justify-between items-center">
                        {m.cerrado_at && (
                          <p className="text-xs text-zinc-700">
                            Cerrado: {new Date(m.cerrado_at).toLocaleDateString('es-CL')}
                          </p>
                        )}
                        <button
                          onClick={() => handleReopen(m.mes)}
                          disabled={reopening === m.mes}
                          className="text-xs text-zinc-600 hover:text-zinc-300 border border-zinc-700 hover:border-zinc-500 rounded px-3 py-1.5 transition-colors disabled:opacity-40"
                        >
                          {reopening === m.mes ? 'Reabriendo...' : '🔓 Reabrir mes'}
                        </button>
                      </div>
                    </>
                  ) : (
                    <p className="text-center text-zinc-600 py-6 text-sm">Cargando...</p>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
