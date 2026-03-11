'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'

const links = [
  { href: '/', label: 'Importar' },
  { href: '/resumen', label: 'Resumen' },
  { href: '/historial', label: 'Historial' },
]

export default function Nav() {
  const pathname = usePathname()

  return (
    <header className="border-b border-zinc-800 bg-zinc-950/80 backdrop-blur sticky top-0 z-10">
      <nav className="max-w-3xl mx-auto px-4 h-14 flex items-center gap-1">
        <span className="font-bold text-zinc-100 mr-4 text-lg tracking-tight">💳 Cuentas</span>
        {links.map(({ href, label }) => {
          const active = pathname === href
          return (
            <Link
              key={href}
              href={href}
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                active
                  ? 'bg-zinc-800 text-zinc-100'
                  : 'text-zinc-400 hover:text-zinc-100 hover:bg-zinc-800/50'
              }`}
            >
              {label}
            </Link>
          )
        })}
      </nav>
    </header>
  )
}
