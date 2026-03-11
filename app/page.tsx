'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { formatCLP } from '@/lib/parser'

interface PreviewRow {
  fecha: string | null
  mes: string
  descripcion: string
  monto: number
}

export default function ImportPage() {
  const router = useRouter()
  const [text, setText] = useState('')
  const [preview, setPreview] = useState<PreviewRow[] | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [saving, setSaving] = useState(false)
  const [saveResult, setSaveResult] = useState<{ inserted: number; ignored: number } | null>(null)
  const [includePayments, setIncludePayments] = useState(true)

  async function handleParseText() {
    if (!text.trim()) return
    setLoading(true)
    setError('')
    setPreview(null)
    try {
      const res = await fetch('/api/parse/text', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, includePaymentsOfBalance: includePayments }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setPreview(data)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  function removeRow(i: number) {
    setPreview((prev) => prev ? prev.filter((_, idx) => idx !== i) : prev)
  }

  async function handleSave() {
    if (!preview || preview.length === 0) return
    setSaving(true)
    setError('')
    try {
      const res = await fetch('/api/transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(preview),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error)
      setSaveResult({ inserted: data.inserted, ignored: data.ignored })
      setPreview(null)
      setText('')
      setTimeout(() => {
        setSaveResult(null)
        router.push('/resumen')
      }, 2500)
    } catch (e) {
      setError(String(e))
    } finally {
      setSaving(false)
    }
  }

  const totalPreview = preview ? preview.reduce((s, r) => s + r.monto, 0) : 0

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-zinc-100">Importar transacciones</h1>
        <p className="text-sm text-zinc-500 mt-1">
          Pega el texto de tu cartola y presiona Parsear.
        </p>
      </div>

      {/* Text input */}
      <div className="space-y-2">
        <textarea
          value={text}
          onChange={(e) => { setText(e.target.value); setPreview(null); setSaveResult(null) }}
          placeholder={`Pega aquí tu cartola, por ejemplo:\n10/03/2026        ACUENTA ISLA DE    -$3.330\n07/03/2026        MERCADOPAGO *MUNDOPAC    -$19.992\n05/03/2026        BOOKING.COM        +$7.838`}
          rows={8}
          className="w-full bg-zinc-900 border border-zinc-700 rounded-lg p-3 text-sm font-mono text-zinc-200 placeholder-zinc-600 resize-none focus:outline-none focus:border-zinc-500 focus:ring-1 focus:ring-zinc-500"
        />
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={includePayments}
              onChange={(e) => setIncludePayments(e.target.checked)}
              className="w-4 h-4 rounded bg-zinc-800 border-zinc-600 accent-blue-500"
            />
            <span className="text-sm text-zinc-400">Incluir pagos de factura anterior</span>
          </label>
          <button
            onClick={handleParseText}
            disabled={!text.trim() || loading}
            className="px-6 py-2.5 bg-zinc-800 hover:bg-zinc-700 disabled:opacity-40 disabled:cursor-not-allowed rounded-lg text-sm font-medium transition-colors"
          >
            {loading ? 'Parseando...' : 'Parsear'}
          </button>
        </div>
      </div>

      {error && (
        <div className="bg-red-950/50 border border-red-800 text-red-400 rounded-lg p-3 text-sm">
          {error}
        </div>
      )}

      {saveResult && (
        <div className="bg-emerald-950/50 border border-emerald-800 text-emerald-400 rounded-lg p-3 text-sm text-center font-medium space-y-0.5">
          <p>✓ {saveResult.inserted} transacciones guardadas</p>
          {saveResult.ignored > 0 && (
            <p className="text-zinc-500 text-xs font-normal">{saveResult.ignored} ya existían y fueron ignoradas</p>
          )}
        </div>
      )}

      {/* Preview */}
      {preview && preview.length > 0 && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-zinc-100">
              Vista previa — {preview.length} transacciones
            </h2>
            <div className="text-sm">
              <span className="text-zinc-500">Resultado: </span>
              <span className={totalPreview < 0 ? 'text-red-400 font-semibold' : 'text-emerald-400 font-semibold'}>
                {totalPreview < 0 ? '-' : '+'}{formatCLP(totalPreview)}
              </span>
            </div>
          </div>

          <div className="bg-zinc-900 rounded-xl border border-zinc-800 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-zinc-800 text-zinc-500 text-xs uppercase tracking-wide">
                  <th className="text-left px-4 py-3 font-medium">Fecha</th>
                  <th className="text-left px-4 py-3 font-medium">Descripción</th>
                  <th className="text-right px-4 py-3 font-medium">Monto</th>
                  <th className="px-3 py-3"></th>
                </tr>
              </thead>
              <tbody>
                {preview.map((row, i) => (
                  <tr key={i} className="border-b border-zinc-800/50 hover:bg-zinc-800/30 transition-colors">
                    <td className="px-4 py-2.5 text-zinc-500 whitespace-nowrap font-mono text-xs">
                      {row.fecha ? row.fecha.slice(5).split('-').reverse().join('/') + '/' + row.fecha.slice(0, 4) : '—'}
                    </td>
                    <td className="px-4 py-2.5 text-zinc-300 max-w-[200px] truncate">{row.descripcion}</td>
                    <td className={`px-4 py-2.5 text-right font-mono font-medium whitespace-nowrap ${row.monto < 0 ? 'text-red-400' : 'text-emerald-400'}`}>
                      {row.monto < 0 ? '-' : '+'}{formatCLP(row.monto)}
                    </td>
                    <td className="px-3 py-2.5">
                      <button
                        onClick={() => removeRow(i)}
                        className="text-zinc-600 hover:text-red-400 transition-colors text-xs"
                        title="Eliminar"
                      >
                        ✕
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="w-full py-3 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed rounded-lg font-semibold transition-colors"
          >
            {saving ? 'Guardando...' : `Guardar ${preview.length} transacciones`}
          </button>
        </div>
      )}

      {preview && preview.length === 0 && (
        <p className="text-center text-zinc-500 text-sm">No se encontraron transacciones en el texto.</p>
      )}
    </div>
  )
}
