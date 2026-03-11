# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev    # Start dev server → http://localhost:3000
npm run build  # Production build
npx tsc --noEmit  # Type check
```

## Architecture

Monolith: Next.js App Router with SQLite via `better-sqlite3`. No ORM — raw SQL in `lib/db.ts`.

**Data flow:**
1. User pastes text → `POST /api/parse/text` → `lib/parser.ts` → preview in UI
2. User confirms → `POST /api/transactions` → `lib/db.ts` → SQLite
3. Resumen page fetches `GET /api/months` (aggregates) + `GET /api/transactions?mes=YYYY-MM`

**DB** is created automatically at `data/cuentas.db` on first run via `getDb()` in `lib/db.ts`. The singleton pattern (`let _db`) avoids reconnecting on every request.

**Parser** (`lib/parser.ts`) handles two formats from Santander Chile:
- **Format 1** (cartola online): `DD/MM/YYYY  DESCRIPTION  [-+]$X.XXX` — date at line start, sign before `$`
- **Format 2** (PDF estado de cuenta): `CITY DD/MM/YYYY DESCRIPTION $ [-]X.XXX` — city prefix, space after `$`, positive = cargo, negative = crédito

Pre-normalization inserts newlines before dates to handle concatenated PDF lines. Lines with multiple `$` (cuotas info) and numbered section headers are skipped.

**Business logic:**
- `monto` negative = cargo/débito, positive = pago/abono
- Months grouped by `YYYY-MM` derived from transaction date
- Unique constraint: `(COALESCE(fecha,''), mes, descripcion, monto)` — re-importing same cartola is safe
- "Deuda actual" in Resumen = sum of ALL open months (not just selected month), because billing cycles span calendar months
- "Cerrar período" closes all open months at once via `POST /api/months/close-all`
