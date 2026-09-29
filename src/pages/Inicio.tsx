import { useState } from 'react'
import { Copy, Plus, Trash2 } from 'lucide-react'
import { cargarTodas, eliminar, guardar } from '../lib/almacen'
import { nuevaCategoria, nuevoId } from '../lib/torneo'
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
      <Titulo bajada="Cada categoría de un torneo se arma por separado. Todo queda guardado en este navegador." accion={<Button onClick={nueva}><Plus className="h-4 w-4" aria-hidden /> Nueva categoría</Button>}>
        Categorías
      </Titulo>
      {lista.length === 0 ? (
        <Vacio titulo="Todavía no armaste ninguna categoría" accion={<Button onClick={nueva}><Plus className="h-4 w-4" aria-hidden /> Nueva categoría</Button>}>
          Cargás el torneo, las parejas, armás las zonas y el playoff, y generás las imágenes para WhatsApp.
        </Vacio>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {lista.map((c) => (
            <li key={c.id} className="flex items-center gap-3 rounded-xl bg-white p-4 ring-1 ring-noche/10">
              <button onClick={() => onAbrir(c.id)} className="min-w-0 flex-1 text-left">
                <p className="truncate font-display text-xl font-bold">{c.categoria || 'Sin categoría'}</p>
                <p className="truncate text-sm text-noche/65">{c.torneo || 'Sin nombre de torneo'}</p>
                <p className="mt-1 text-xs text-noche/50">
                  {c.parejas.length} parejas · {c.zonas.length ? `${c.zonas.length} zonas` : 'sin zonas'}{c.cuadro ? ' · playoff armado' : ''} ·{' '}
                  {new Date(c.actualizado).toLocaleString('es-AR', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })}
                </p>
              </button>
              <button title="Duplicar (misma estructura para otra categoría)" aria-label="Duplicar" className="p-2 text-noche/50 hover:text-cancha"
                onClick={() => { guardar({ ...c, id: nuevoId(), categoria: `${c.categoria} (copia)` }); setLista(cargarTodas()) }}>
                <Copy className="h-4 w-4" />
              </button>
              <button aria-label="Eliminar" className="p-2 text-noche/50 hover:text-red"
                onClick={() => { if (confirm(`¿Eliminar ${c.categoria || 'esta categoría'}?`)) { eliminar(c.id); setLista(cargarTodas()) } }}>
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      )}
    </>
  )
}
