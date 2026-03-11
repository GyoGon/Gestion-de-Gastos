# Gestión de Gastos — Tarjeta de Crédito Santander 💳

Control de gastos de tarjeta de crédito. Pega tu cartola o estado de cuenta, ve cuánto debes en el período actual y guarda el historial por mes.

Los formatos de texto soportados están modelados según los documentos que entrega Santander Chile: la cartola online (copiada desde el sitio del banco) y el PDF del estado de cuenta mensual.

## Stack

- **Next.js 15** — frontend + API en un solo proceso
- **SQLite** (`better-sqlite3`) — base de datos local, sin configuración
- **Tailwind CSS** — estilos

## Instalación

```bash
git clone <repo>
cd cuentas
npm install
npm run dev
```

Abre [http://localhost:3000](http://localhost:3000).

## Uso

### Importar
Pega el texto de tu cartola o estado de cuenta. Soporta dos formatos:

**Formato 1** — cartola online (copiar/pegar desde el sitio del banco):
```
10/03/2026        ACUENTA ISLA DE    -$3.330
07/03/2026        MERCADOPAGO *MUNDOPAC    -$19.992
05/03/2026        BOOKING.COM        +$7.838
```

**Formato 2** — PDF estado de cuenta:
```
TALAGANTE 26/01/2026 OPTICAS GYM SPA $ 40.000
Las Condes 02/02/2026 MERCADOPAGO *CGE $ 46.700
30/01/2026 MONTO CANCELADO $ -751.762
```

Las transacciones duplicadas se ignoran automáticamente — puedes pegar la misma cartola varias veces sin problema.

### Resumen
Ve la deuda acumulada de todos los períodos abiertos. Puedes navegar el detalle por mes y eliminar transacciones individuales.

### Historial
Meses cerrados con su saldo final. Puedes reabrir un mes si necesitas corregir algo.

## Datos

La base de datos se crea automáticamente en `data/cuentas.db` al primer arranque. No requiere ninguna configuración.
