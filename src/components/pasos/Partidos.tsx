import { useEffect, useMemo, useState } from 'react'
import { FileText, Printer } from 'lucide-react'
import type { Categoria } from '../../lib/torneo'
import { docWord, filasCronograma, htmlCronograma, logoPng } from '../../lib/cronograma'
import { logoUrl } from '../../App'
import { Alerta, Button, Card } from '../ui'

// Colores del documento (los de la marca del complejo)
const COLORES = { oscuro: '#042D29', acento: '#C8DC3C', suave: '#F2F6F4' }

type Props = { cat: Categoria }

/** Cronograma de partidos para imprimir, con columna "Resultado" para anotar */
export default function PasoPartidos({ cat }: Props) {
  const [logo, setLogo] = useState<string | null>(null)
  useEffect(() => { logoPng(logoUrl()).then(setLogo) }, [])
  const filas = useMemo(() => filasCronograma(cat), [cat])
  const html = useMemo(() => htmlCronograma(cat, logo, COLORES), [cat, logo])
  const sinHorario = filas.filter((f) => !f.fecha || !f.hora).length
  const nombreArchivo = `Partidos - ${[cat.torneo, cat.categoria].filter(Boolean).join(' - ').replace(/[\\/:*?"<>|]+/g, '')}`

  function imprimir() {
    const w = window.open('', '_blank')
    if (!w) return alert('El navegador bloqueó la ventana. Permití las ventanas emergentes para este sitio.')
    w.document.open()
    w.document.write(html)
    w.document.close()
    w.onload = () => setTimeout(() => w.print(), 300)
  }

  function word() {
    const url = URL.createObjectURL(docWord(htmlCronograma(cat, null, COLORES)))
    const a = document.createElement('a')
    a.href = url
    a.download = `${nombreArchivo}.doc`
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-noche/75">
          Todos los partidos (zonas y playoff) en orden cronológico, separados por día, con una columna <strong>Resultado</strong> para
          anotar durante el torneo. Se imprime en hoja A4; desde la ventana de impresión también se puede guardar como PDF.
        </p>
        <div className="flex flex-wrap gap-2">
          <Button onClick={imprimir} disabled={!filas.length}><Printer className="h-4 w-4" aria-hidden /> Imprimir / PDF</Button>
          <Button variante="secundario" onClick={word} disabled={!filas.length}><FileText className="h-4 w-4" aria-hidden /> Descargar para Word</Button>
        </div>
      </Card>
      {sinHorario > 0 && <Alerta tipo="aviso">{sinHorario} partido(s) no tienen día u horario: aparecen al final, en “Sin día asignado”.</Alerta>}
      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-noche/10">
        <iframe title="Vista previa del cronograma" srcDoc={html} className="h-[70vh] w-full" />
      </div>
    </div>
  )
}