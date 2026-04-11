interface Props {
  modulo: string
}

export default function ProximamentePage({ modulo }: Props) {
  return (
    <div className="proximamente">
      <div className="proximamente-icon">◎</div>
      <h2 className="proximamente-titulo">{modulo}</h2>
      <p className="proximamente-texto">Este módulo estará disponible en el siguiente sprint.</p>
    </div>
  )
}
