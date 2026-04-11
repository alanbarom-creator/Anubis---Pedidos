interface KPICardProps {
  titulo: string
  valor: number
  moneda?: string
  variante?: 'default' | 'positive' | 'negative' | 'warning'
  descripcion?: string
}

const fmt = (n: number) =>
  new Intl.NumberFormat('es-MX', { style: 'currency', currency: 'MXN', maximumFractionDigits: 0 }).format(n)

export default function KPICard({
  titulo,
  valor,
  variante = 'default',
  descripcion,
}: KPICardProps) {
  const auto = variante === 'default' && valor >= 0 ? 'positive' : variante === 'default' ? 'negative' : variante

  return (
    <div className={`kpi-card kpi-card--${auto}`}>
      <span className="kpi-titulo">{titulo}</span>
      <span className="kpi-valor">{fmt(valor)}</span>
      {descripcion && <span className="kpi-desc">{descripcion}</span>}
    </div>
  )
}
