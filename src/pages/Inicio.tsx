import { useState } from 'react'
import { Copy, Plus, Trash2 } from 'lucide-react'
import { cargarTodas, eliminar, guardar } from '../lib/almacen'
import { nuevaCategoria, nuevoId, rangoFechas } from '../lib/torneo'
import { Button, Titulo, Vacio } from '../components/ui'

export default function Inicio({ onAbrir }: { onAbrir: (id: string) => void }) {
  const [lista, setLista] = useState(cargarTodas())

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