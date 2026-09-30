import { useRef, useState, type ChangeEvent } from 'react'
import { Copy, Download, Plus, Trash2, Upload } from 'lucide-react'
import { cargarTodas, eliminar, exportar, guardar, importar } from '../lib/almacen'
import { nuevaCategoria, nuevoId, rangoFechas } from '../lib/torneo'
import { Alerta, Button, Titulo, Vacio } from '../components/ui'
import Instructivo from '../components/Instructivo'

export default function Inicio({ onAbrir }: { onAbrir: (id: string) => void }) {
  const [lista, setLista] = useState(cargarTodas())
  const [msg, setMsg] = useState<{ tipo: 'ok' | 'error'; txt: string } | null>(null)
  const archivo = useRef<HTMLInputElement>(null)

  function descargarRespaldo() {
    const r = exportar()
    const url = URL.createObjectURL(new Blob([r.contenido], { type: 'application/json' }))
    const a = document.createElement('a')
    a.href = url
    a.download = r.nombre
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1000)
    setMsg({ tipo: 'ok', txt: `Se descargó ${r.nombre} con ${r.cantidad} torneo(s). Guardalo en un lugar seguro (Drive, mail, WhatsApp).` })
  }

  async function cargarRespaldo(e: ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    try {
      const r = importar(await f.text())
      setLista(cargarTodas())
      setMsg({ tipo: 'ok', txt: `Respaldo cargado: ${r.nuevos} nuevo(s), ${r.actualizados} actualizado(s), ${r.sinCambios} sin cambios.` })
    } catch (err) {
      setMsg({ tipo: 'error', txt: err instanceof Error ? err.message : 'No se pudo leer el archivo.' })
    }
  }

  const nueva = () => {
    const c = nuevaCategoria()
    guardar(c)
    onAbrir(c.id)
  }

  return (
    <>
      <Titulo bajada="Cada torneo (de una categoría) se arma por separado. Todo queda guardado en este navegador." accion={<Button onClick={nueva}><Plus className="h-4 w-4" aria-hidden /> Nuevo torneo</Button>}>
        Torneos
      </Titulo>
      <Instructivo />
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <Button variante="secundario" onClick={descargarRespaldo} disabled={!lista.length}><Download className="h-4 w-4" aria-hidden /> Exportar respaldo</Button>
        <Button variante="secundario" onClick={() => archivo.current?.click()}><Upload className="h-4 w-4" aria-hidden /> Importar respaldo</Button>
        <input ref={archivo} type="file" accept="application/json,.json" className="hidden" onChange={cargarRespaldo} />
        <span className="text-xs text-noche/55">Para no perder los torneos o pasarlos a otro dispositivo.</span>
      </div>
      {msg && <div className="mb-4"><Alerta tipo={msg.tipo}>{msg.txt}</Alerta></div>}
      {lista.length === 0 ? (
        <Vacio titulo="Todavía no armaste ningún torneo" accion={<Button onClick={nueva}><Plus className="h-4 w-4" aria-hidden /> Nuevo torneo</Button>}>
          Cargás el torneo, las parejas, armás las zonas y el playoff, y generás las imágenes para WhatsApp.
        </Vacio>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {lista.map((c) => (
            <li key={c.id} className="flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-noche/10">
              <button onClick={() => onAbrir(c.id)} className="min-w-0 flex-1 text-left">
                <p className="truncate font-display text-xl font-bold">{c.torneo || 'Torneo sin nombre'}</p>
                <p className="truncate text-sm text-noche/65">{c.categoria || 'Sin categoría'}{c.fechaInicio ? ` · ${rangoFechas(c.fechaInicio, c.fechaFin)}` : ''}</p>
                <p className="mt-1 text-xs text-noche/50">
                  {c.parejas.length} parejas · {c.zonas.length ? `${c.zonas.length} zonas` : 'sin zonas'}{c.cuadro ? ' · playoff armado' : ''} ·{' '}
                  {new Date(c.actualizado).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}
                </p>
              </button>
              <button title="Duplicar (por ejemplo, para otra categoría del mismo torneo)" aria-label="Duplicar" className="p-2 text-noche/50 hover:text-cancha"
                onClick={() => { guardar({ ...c, id: nuevoId(), torneo: `${c.torneo} (copia)` }); setLista(cargarTodas()) }}>
                <Copy className="h-4 w-4" />
              </button>
              <button aria-label="Eliminar" className="p-2 text-noche/50 hover:text-red"
                onClick={() => { if (confirm(`¿Eliminar ${c.torneo || 'este torneo'}${c.categoria ? ` · ${c.categoria}` : ''}?`)) { eliminar(c.id); setLista(cargarTodas()) } }}>
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}