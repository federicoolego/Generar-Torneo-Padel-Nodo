import { useState } from 'react'
import { Pencil, Plus, Trash2 } from 'lucide-react'
import { CATEGORIAS_SUGERIDAS, MAX_PAREJAS, MIN_PAREJAS, nuevoId, parsearParejas, type Categoria } from '../../lib/torneo'
import { Alerta, Button, Card, Field, Input, Textarea } from '../ui'

type Props = { cat: Categoria; cambiar: (f: (c: Categoria) => Categoria) => void }

export function PasoDatos({ cat, cambiar }: Props) {
  const fechasMal = !!cat.fechaInicio && !!cat.fechaFin && cat.fechaFin < cat.fechaInicio
  return (
    <Card className="space-y-4">
      <Field label="Nombre del torneo *">
        <Input value={cat.torneo} onChange={(e) => cambiar((c) => ({ ...c, torneo: e.target.value }))} placeholder="Ej: Torneo Primavera 2026" />
      </Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Fecha de inicio *">
          <Input type="date" value={cat.fechaInicio} onChange={(e) => cambiar((c) => ({ ...c, fechaInicio: e.target.value, fechaFin: c.fechaFin || e.target.value }))} />
        </Field>
        <Field label="Fecha de fin *" error={fechasMal ? 'No puede ser anterior a la fecha de inicio' : undefined}>
          <Input type="date" value={cat.fechaFin} min={cat.fechaInicio || undefined} onChange={(e) => cambiar((c) => ({ ...c, fechaFin: e.target.value }))} />
        </Field>
      </div>
      <Field label="Categoría *" hint="Elegí de la lista o escribí la que quieras.">
        <Input value={cat.categoria} onChange={(e) => cambiar((c) => ({ ...c, categoria: e.target.value }))} list="categorias" placeholder="Ej: 7ma Damas, Suma 12 Mixto" />
        <datalist id="categorias">{CATEGORIAS_SUGERIDAS.map((x) => <option key={x} value={x} />)}</datalist>
      </Field>
      <Field label="Observación" hint="Opcional. Aparece en las imágenes.">
        <Textarea rows={3} value={cat.observacion} onChange={(e) => cambiar((c) => ({ ...c, observacion: e.target.value }))}
          placeholder="Ej: Americano a 9 games. Semifinales y final al mejor de 3 sets, el 3er set es un tiebreak." />
      </Field>
      <p className="text-xs text-noche/55">* Obligatorio</p>
    </Card>
  )
}

export function PasoParejas({ cat, cambiar }: Props) {
  const [texto, setTexto] = useState('')
  const [edit, setEdit] = useState<{ id: string; nombre: string } | null>(null)
  const nuevas = parsearParejas(texto)
  const lugar = Math.max(0, MAX_PAREJAS - cat.parejas.length)
  const aAgregar = nuevas.slice(0, lugar)

  const agregar = () => {
    if (!aAgregar.length) return
    cambiar((c) => ({ ...c, parejas: [...c.parejas, ...aAgregar.map((nombre) => ({ id: nuevoId(), nombre }))] }))
    setTexto('')
  }
  const quitar = (id: string) =>
    cambiar((c) => ({ ...c, parejas: c.parejas.filter((p) => p.id !== id), zonas: c.zonas.map((z) => z.filter((x) => x !== id)) }))
  const renombrar = () => {
    if (!edit || !edit.nombre.trim()) return
    cambiar((c) => ({ ...c, parejas: c.parejas.map((p) => (p.id === edit.id ? { ...p, nombre: edit.nombre.trim() } : p)) }))
    setEdit(null)
  }

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_1.2fr]">
      <Card className="space-y-3">
        <Field label="Agregar parejas" hint="Una por línea, o separadas por punto y coma. Ej: Juan Pérez / Luis Gómez; Juan Galeano / Marcos Francés">
          <Textarea rows={8} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={'Juan Pérez / Luis Gómez\nJuan Galeano / Marcos Francés'} />
        </Field>
        {nuevas.length > lugar && (
          <Alerta tipo="aviso">
            El máximo es {MAX_PAREJAS} parejas: {lugar ? `se van a agregar solo las primeras ${lugar}.` : 'ya está completo.'}
          </Alerta>
        )}
        <Button onClick={agregar} disabled={!aAgregar.length}><Plus className="h-4 w-4" aria-hidden /> Agregar {aAgregar.length || ''} {aAgregar.length === 1 ? 'pareja' : 'parejas'}</Button>
      </Card>
      <Card>
        <h2 className="font-display text-2xl font-bold">Inscriptas <span className="num text-noche/50">({cat.parejas.length}/{MAX_PAREJAS})</span></h2>
        {cat.parejas.length < MIN_PAREJAS && (
          <div className="mt-2"><Alerta tipo="aviso">Se necesitan al menos {MIN_PAREJAS} parejas para continuar (faltan {MIN_PAREJAS - cat.parejas.length}).</Alerta></div>
        )}
        {cat.parejas.length === 0 ? <p className="mt-2 text-sm text-noche/55">Todavía no cargaste parejas.</p> : (
          <ol className="mt-2 divide-y divide-noche/5">
            {cat.parejas.map((p, k) => (
              <li key={p.id} className="flex items-center gap-2 py-2 text-sm">
                <span className="num w-6 text-noche/40">{k + 1}</span>
                {edit?.id === p.id ? (
                  <Input value={edit.nombre} onChange={(e) => setEdit({ ...edit, nombre: e.target.value })} autoFocus className="py-1"
                    onKeyDown={(e) => { if (e.key === 'Enter') renombrar(); if (e.key === 'Escape') setEdit(null) }} onBlur={renombrar} />
                ) : (
                  <span className="flex-1 font-medium">{p.nombre}</span>
                )}
                <button onClick={() => setEdit({ id: p.id, nombre: p.nombre })} aria-label={`Editar ${p.nombre}`} className="p-1 text-noche/45 hover:text-cancha"><Pencil className="h-3.5 w-3.5" /></button>
                <button onClick={() => quitar(p.id)} aria-label={`Quitar ${p.nombre}`} className="p-1 text-noche/45 hover:text-red"><Trash2 className="h-3.5 w-3.5" /></button>
              </li>
            ))}
          </ol>
        )}
      </Card>
    </div>
  )
}