import { useEffect, useState } from 'react'
import { Download, Share2 } from 'lucide-react'
import { imagenesZonas, imagenPlayoff, nombreArchivo } from '../lib/imagenes'
import type { Categoria } from '../lib/torneo'
import { Alerta, Button, Spinner } from './ui'

interface Imagen { file: File; url: string; titulo: string }

/** Genera las imágenes de zonas y playoff y las comparte (WhatsApp) o las descarga */
export default function Compartir({ cat, avisos }: { cat: Categoria; avisos: string[] }) {
  const [imgs, setImgs] = useState<Imagen[] | null>(null)
  const [error, setError] = useState('')

  useEffect(() => {
    let vigente = true
    const urls: string[] = []
    ;(async () => {
      try {
        const out: Imagen[] = []
        if (cat.zonas.length) {
          const zs = await imagenesZonas(cat)
          zs.forEach((b, i) => {
            const t = zs.length > 1 ? `Zonas ${i + 1}` : 'Zonas'
            out.push({ file: new File([b], nombreArchivo(cat, t), { type: 'image/png' }), url: URL.createObjectURL(b), titulo: t })
          })
        }
        if (cat.cuadro) {
          const b = await imagenPlayoff(cat)
          out.push({ file: new File([b], nombreArchivo(cat, 'Playoff'), { type: 'image/png' }), url: URL.createObjectURL(b), titulo: 'Playoff' })
        }
        out.forEach((i) => urls.push(i.url))
        if (vigente) setImgs(out)
      } catch (e) {
        if (vigente) setError(e instanceof Error ? e.message : 'No se pudieron generar las imágenes')
      }
    })()
    return () => { vigente = false; urls.forEach((u) => URL.revokeObjectURL(u)) }
  }, [cat])

  const puedeCompartir = (files: File[]) => typeof navigator.canShare === 'function' && navigator.canShare({ files })

  function descargar(i: Imagen) {
    const a = document.createElement('a')
    a.href = i.url
    a.download = i.file.name
    a.click()
  }

  async function compartir(lista: Imagen[]) {
    const files = lista.map((i) => i.file)
    if (puedeCompartir(files)) {
      try {
        await navigator.share({ files, title: `${cat.torneo} · ${cat.categoria}` })
      } catch { /* el usuario canceló */ }
    } else {
      lista.forEach(descargar)
    }
  }

  if (error) return <Alerta tipo="error">{error}</Alerta>
  if (!imgs) return <Spinner texto="Generando imágenes…" />
  if (!imgs.length) return <Alerta tipo="aviso">Primero armá las zonas (y el playoff) para poder generar las imágenes.</Alerta>

  const nativo = puedeCompartir(imgs.map((i) => i.file))
  return (
    <div className="space-y-4">
      {avisos.length > 0 && <Alerta tipo="aviso">{avisos.join(' ')}</Alerta>}
      <div className="flex flex-wrap gap-2">
        <Button onClick={() => compartir(imgs)}>
          <Share2 className="h-4 w-4" aria-hidden /> {nativo ? `Compartir ${imgs.length > 1 ? 'todas' : ''} por WhatsApp` : 'Descargar todas'}
        </Button>
      </div>
      {!nativo && (
        <p className="text-xs text-noche/60">
          Este navegador no permite compartir archivos directo: se descargan y las adjuntás en WhatsApp. Desde el celular (Chrome o Safari) se abre el menú para elegir WhatsApp.
        </p>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        {imgs.map((i) => (
          <figure key={i.url} className="overflow-hidden rounded-xl bg-white ring-1 ring-noche/10">
            <img src={i.url} alt={`${i.titulo} · ${cat.categoria}`} className="w-full" />
            <figcaption className="flex items-center justify-between gap-2 p-3">
              <span className="font-semibold">{i.titulo}</span>
              <span className="flex gap-1">
                {nativo && <Button variante="fantasma" onClick={() => compartir([i])} aria-label={`Compartir ${i.titulo}`}><Share2 className="h-4 w-4" /></Button>}
                <Button variante="fantasma" onClick={() => descargar(i)} aria-label={`Descargar ${i.titulo}`}><Download className="h-4 w-4" /></Button>
              </span>
            </figcaption>
          </figure>
        ))}
      </div>
    </div>
  )
}
