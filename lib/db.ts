import Database from 'better-sqlite3'
import fs from 'fs'
import path from 'path'

const DATA_DIR = path.join(process.cwd(), 'data')
const DB_PATH = path.join(DATA_DIR, 'cuentas.db')

let _db: Database.Database | null = null

export function getDb(): Database.Database {
  if (_db) return _db

  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true })
  }

  _db = new Database(DB_PATH)
  _db.pragma('journal_mode = WAL')
  migrate(_db)
  return _db
}

function migrate(db: Database.Database) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id        INTEGER PRIMARY KEY AUTOINCREMENT,
      fecha     TEXT,
      mes       TEXT NOT NULL,
      descripcion TEXT NOT NULL,
      monto     INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );

    CREATE INDEX IF NOT EXISTS idx_transactions_mes ON transactions(mes);

    CREATE UNIQUE INDEX IF NOT EXISTS idx_transactions_unique
      ON transactions(COALESCE(fecha, ''), mes, descripcion, monto);

    CREATE TABLE IF NOT EXISTS months (
      mes         TEXT PRIMARY KEY,
      cerrado     INTEGER NOT NULL DEFAULT 0,
      saldo_final INTEGER,
      cerrado_at  TEXT
    );
  `)
}

export interface Transaction {
  id: number
  fecha: string | null
  mes: string
  descripcion: string
  monto: number
  created_at: string
}

export interface Month {
  mes: string
  cerrado: number
  saldo_final: number | null
  cerrado_at: string | null
}

// Transactions
export function getTransactions(mes: string): Transaction[] {
  const db = getDb()
  return db
    .prepare('SELECT * FROM transactions WHERE mes = ? ORDER BY fecha DESC, id DESC')
    .all(mes) as Transaction[]
}

export function insertTransactions(
  rows: { fecha: string | null; mes: string; descripcion: string; monto: number }[]
): { inserted: number; ignored: number } {
  const db = getDb()
  const stmt = db.prepare(
    'INSERT OR IGNORE INTO transactions (fecha, mes, descripcion, monto) VALUES (?, ?, ?, ?)'
  )
  const ensureMonth = db.prepare('INSERT OR IGNORE INTO months (mes) VALUES (?)')

  let inserted = 0
  const insertMany = db.transaction((items: typeof rows) => {
    for (const r of items) {
      const result = stmt.run(r.fecha, r.mes, r.descripcion, r.monto)
      if (result.changes > 0) {
        inserted++
        ensureMonth.run(r.mes)
      }
    }
  })
  insertMany(rows)
  return { inserted, ignored: rows.length - inserted }
}

export function deleteTransaction(id: number) {
  const db = getDb()
  db.prepare('DELETE FROM transactions WHERE id = ?').run(id)
}

// Months
export function getMonths(): (Month & {
  total_cargos: number
  total_pagos: number
  saldo: number
  count: number
})[] {
  const db = getDb()
  return db
    .prepare(`
      SELECT
        m.mes,
        m.cerrado,
        m.saldo_final,
        m.cerrado_at,
        COALESCE(SUM(CASE WHEN t.monto < 0 THEN t.monto ELSE 0 END), 0) AS total_cargos,
        COALESCE(SUM(CASE WHEN t.monto > 0 THEN t.monto ELSE 0 END), 0) AS total_pagos,
        COALESCE(SUM(t.monto), 0) AS saldo,
        COUNT(t.id) AS count
      FROM months m
      LEFT JOIN transactions t ON t.mes = m.mes
      GROUP BY m.mes
      ORDER BY m.mes DESC
    `)
    .all() as ReturnType<typeof getMonths>
}

export function getSummary(mes: string) {
  const db = getDb()
  const row = db
    .prepare(`
      SELECT
        COALESCE(SUM(CASE WHEN monto < 0 THEN monto ELSE 0 END), 0) AS total_cargos,
        COALESCE(SUM(CASE WHEN monto > 0 THEN monto ELSE 0 END), 0) AS total_pagos,
        COALESCE(SUM(monto), 0) AS saldo,
        COUNT(*) AS count
      FROM transactions WHERE mes = ?
    `)
    .get(mes) as { total_cargos: number; total_pagos: number; saldo: number; count: number }
  return row
}

export function closeMonth(mes: string) {
  const db = getDb()
  const summary = getSummary(mes)
  db.prepare(`
    UPDATE months SET cerrado = 1, saldo_final = ?, cerrado_at = datetime('now')
    WHERE mes = ?
  `).run(summary.saldo, mes)
}

export function reopenMonth(mes: string) {
  const db = getDb()
  db.prepare('UPDATE months SET cerrado = 0, saldo_final = NULL, cerrado_at = NULL WHERE mes = ?').run(mes)
}
