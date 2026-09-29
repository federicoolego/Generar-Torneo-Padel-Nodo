import { useEffect, useMemo, useState } from 'react'
import { Download, FileText, Printer, Share2 } from 'lucide-react'
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
  // el PDF se arma de antemano: compartir tiene que ejecutarse enseguida después del toque
  // (la librería de PDF se carga recién al entrar a este paso)
  const [pdf, setPdf] = useState<File | null>(null)
  useEffect(() => {
    let vigente = true
    setPdf(null)
    if (!filas.length) return
    import('../../lib/cronogramaPdf')
      .then(({ pdfCronograma }) => { if (vigente) setPdf(new File([pdfCronograma(cat, logo, COLORES)], `${nombreArchivo}.pdf`, { type: 'application/pdf' })) })
      .catch(() => { /* sin PDF: quedan imprimir y Word */ })
    return () => { vigente = false }
  }, [cat, logo, filas.length, nombreArchivo])
  const puedeCompartir = !!pdf && typeof navigator.canShare === 'function' && navigator.canShare({ files: [pdf] })

  function descargarPdf() {
    if (!pdf) return
    const url = URL.createObjectURL(pdf)
    const a = document.createElement('a')
    a.href = url
    a.download = pdf.name
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
  }

  async function compartirPdf() {
    if (!pdf) return
    if (!puedeCompartir) return descargarPdf()
    try { await navigator.share({ files: [pdf], title: `Partidos · ${cat.torneo} · ${cat.categoria}` }) } catch { /* canceló */ }
  }

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
          anotar durante el torneo. El PDF (A4) se comparte por WhatsApp desde el celular o se descarga; también se puede imprimir directo o bajar para Word.
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={compartirPdf} disabled={!pdf}
            className="inline-flex items-center gap-2 rounded-lg bg-[#1FA855] px-4 py-2 text-sm font-semibold text-white hover:bg-[#18914A] disabled:opacity-50">
            <Share2 className="h-4 w-4" aria-hidden /> {puedeCompartir ? 'Compartir PDF por WhatsApp' : 'Descargar PDF'}
          </button>
          {puedeCompartir && <Button variante="secundario" onClick={descargarPdf}><Download className="h-4 w-4" aria-hidden /> Descargar PDF</Button>}
          <Button variante="secundario" onClick={imprimir} disabled={!filas.length}><Printer className="h-4 w-4" aria-hidden /> Imprimir</Button>
          <Button variante="secundario" onClick={word} disabled={!filas.length}><FileText className="h-4 w-4" aria-hidden /> Word</Button>
        </div>
      </Card>
      {sinHorario > 0 && <Alerta tipo="aviso">{sinHorario} partido(s) no tienen día u horario: aparecen al final, en “Sin día asignado”.</Alerta>}
      <div className="overflow-hidden rounded-xl bg-white ring-1 ring-noche/10">
        <iframe title="Vista previa del cronograma" srcDoc={html} className="h-[70vh] w-full" />
      </div>
    </div>
  )
}