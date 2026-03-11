export interface ParsedTransaction {
  fecha: string | null  // YYYY-MM-DD
  mes: string           // YYYY-MM
  descripcion: string
  monto: number         // negative = cargo, positive = pago/abono
}

function parseAmount(raw: string): number {
  // Remove dots (thousand separators in Chilean format) then parse
  return parseInt(raw.replace(/\./g, ''), 10)
}

function parseDate(dd: string, mm: string, yyyy: string): { fecha: string; mes: string } {
  return {
    fecha: `${yyyy}-${mm}-${dd}`,
    mes: `${yyyy}-${mm}`,
  }
}

// Coincidencia exacta: solo si la descripción completa es igual
const PAYMENT_EXACT = ['PAGO', 'ABONO', 'PAGO TC', 'PAGO TAR', 'PAGO TARJETA']

// Coincidencia parcial: si la descripción contiene alguna de estas frases
const PAYMENT_CONTAINS = [
  'MONTO CANCELADO',
  'MONTO PAGADO',
  'PAGO CONTADO',
  'CANCELACION DEUDA',
  'PAGO ANTERIOR',
  'PAGO FACTURA',
]

function isPaymentOfBalance(descripcion: string): boolean {
  const upper = descripcion.toUpperCase().trim()
  if (PAYMENT_EXACT.includes(upper)) return true
  return PAYMENT_CONTAINS.some((kw) => upper.includes(kw))
}

// Formato 1: DD/MM/YYYY  DESCRIPCION  [-+]$X.XXX   (cartola online, copiar/pegar)
// Formato 2: CIUDAD DD/MM/YYYY DESCRIPCION $ [-]X.XXX  (PDF estado de cuenta)
export function parseTransactionText(text: string, options?: { includePaymentsOfBalance?: boolean }): ParsedTransaction[] {
  const includePaymentsOfBalance = options?.includePaymentsOfBalance ?? false
  // Normalize: insert newline before each date so concatenated PDF lines get split
  const normalized = text.replace(/[ \t]+(\d{2}\/\d{2}\/\d{4})/g, '\n$1')
  const lines = normalized.split('\n').map((l) => l.trim()).filter(Boolean)
  const results: ParsedTransaction[] = []

  // Fecha en cualquier posición de la línea
  const dateRegex = /(\d{2})\/(\d{2})\/(\d{4})/
  // Formato 1: signo pegado al $  →  -$3.330  +$7.838
  const fmt1Regex = /([-+])\$([0-9]+(?:\.[0-9]+)*)/
  // Formato 2: $ con espacio, signo opcional después  →  $ 14.330  $ -57.990
  const fmt2Regex = /\$\s+([-]?\d[\d.]*)/

  let currentFecha: string | null = null
  let currentMes: string = currentMonthStr()

  for (const line of lines) {
    // Saltar encabezados de sección numerados ("1. COMPRAS", "3. CARGOS Y COMISIONES", etc.)
    if (/^\d+\./.test(line)) continue

    // Saltar líneas con más de un $ (detalles de cuotas)
    if ((line.match(/\$/g) ?? []).length > 1) continue

    const dateMatch = line.match(dateRegex)
    const fmt1Match = line.match(fmt1Regex)
    const fmt2Match = line.match(fmt2Regex)

    if (fmt1Match) {
      // ── Formato 1 ──────────────────────────────────────────────
      if (dateMatch) {
        const p = parseDate(dateMatch[1], dateMatch[2], dateMatch[3])
        currentFecha = p.fecha
        currentMes = p.mes
      }
      // Ignorar líneas sin fecha si aún no hay contexto de fecha (texto suelto/UI)
      if (!dateMatch && currentFecha === null) continue
      const sign = fmt1Match[1] === '+' ? 1 : -1
      const monto = sign * parseAmount(fmt1Match[2])

      let desc = line
      // Quitar prefijo de fecha si está al inicio
      const startDate = line.match(/^(\d{2})\/(\d{2})\/(\d{4})/)
      if (startDate) desc = desc.slice(startDate[0].length)
      const ai = desc.indexOf(fmt1Match[0])
      if (ai !== -1) desc = desc.slice(0, ai)
      desc = desc.replace(/\s+/g, ' ').trim() || 'Sin descripción'

      if (!includePaymentsOfBalance && isPaymentOfBalance(desc)) continue
      results.push({ fecha: currentFecha, mes: currentMes, descripcion: desc, monto })

    } else if (fmt2Match && dateMatch) {
      // ── Formato 2 ──────────────────────────────────────────────
      // En este formato el monto positivo = cargo y negativo = crédito/abono
      const p = parseDate(dateMatch[1], dateMatch[2], dateMatch[3])
      currentFecha = p.fecha
      currentMes = p.mes

      const raw = parseAmount(fmt2Match[1].replace('-', ''))
      if (raw === 0) continue
      const isCredit = fmt2Match[1].startsWith('-')
      // Invertimos: positivo en PDF → negativo en nuestro sistema (cargo)
      const monto = isCredit ? raw : -raw

      // Descripción: entre el fin de la fecha y el inicio del $
      const dateEnd = line.indexOf(dateMatch[0]) + dateMatch[0].length
      const dollarIdx = line.lastIndexOf('$')
      let desc = line.slice(dateEnd, dollarIdx).replace(/\s+/g, ' ').trim() || 'Sin descripción'

      if (!includePaymentsOfBalance && isPaymentOfBalance(desc)) continue
      results.push({ fecha: currentFecha, mes: currentMes, descripcion: desc, monto })
    }
  }

  return results
}

function currentMonthStr(): string {
  const now = new Date()
  const y = now.getFullYear()
  const m = String(now.getMonth() + 1).padStart(2, '0')
  return `${y}-${m}`
}

export function formatCLP(amount: number): string {
  return new Intl.NumberFormat('es-CL', {
    style: 'currency',
    currency: 'CLP',
    minimumFractionDigits: 0,
  }).format(Math.abs(amount))
}

export function formatMes(mes: string): string {
  const [year, month] = mes.split('-')
  const date = new Date(parseInt(year), parseInt(month) - 1, 1)
  return date.toLocaleString('es-CL', { month: 'long', year: 'numeric' })
}
