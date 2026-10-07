import { FORMATOS, INSTANCIAS, type Categoria, type Formato, type Instancia } from '../lib/torneo'
import { hayResultados, instanciasDelTorneo } from '../lib/resultados'
import { Select } from './ui'

type Cambiar = (f: (c: Categoria) => Categoria) => void

/** Cambia el formato de una instancia; si ya hay resultados cargados, pide confirmación */
export function cambiarFormato(cat: Categoria, cambiar: Cambiar, instancia: Instancia, formato: Formato) {
  if (cat.formatos[instancia] === formato) return
  if (hayResultados(cat, instancia) && !confirm('Ya hay resultados cargados en esta instancia. Los que no cumplan el nuevo formato van a quedar marcados para corregir. ¿Cambiar el formato?')) return
  cambiar((c) => ({ ...c, formatos: { ...c.formatos, [instancia]: formato } }))
}

/** Selector compacto de formato (se usa en el encabezado de cada instancia) */
export function SelectorFormato({ cat, cambiar, instancia, className = '' }: { cat: Categoria; cambiar: Cambiar; instancia: Instancia; className?: string }) {
  return (
    <Select value={cat.formatos[instancia]} onChange={(e) => cambiarFormato(cat, cambiar, instancia, e.target.value as Formato)}
      className={`w-auto py-1.5 text-sm ${className}`} aria-label={`Formato de ${INSTANCIAS.find((i) => i.id === instancia)?.nombre}`}>
      {FORMATOS.map((f) => <option key={f.id} value={f.id}>{f.nombre}</option>)}
    </Select>
  )
}

/** Grilla con el formato de todas las instancias (paso "Torneo") */
export function FormatosPorInstancia({ cat, cambiar }: { cat: Categoria; cambiar: Cambiar }) {
  const jugadas = new Set(instanciasDelTorneo(cat))
  const todas = jugadas.size === INSTANCIAS.length
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      {INSTANCIAS.map((i) => (
        <label key={i.id} className={`flex items-center justify-between gap-3 rounded-lg p-2.5 ring-1 ring-noche/10 ${jugadas.has(i.id) ? 'bg-white' : 'bg-vidrio opacity-60'}`}>
          <span className="text-sm font-semibold">
            {i.nombre}
            {!todas && !jugadas.has(i.id) && <span className="block text-[11px] font-normal text-noche/55">No se juega con las zonas actuales</span>}
          </span>
          <SelectorFormato cat={cat} cambiar={cambiar} instancia={i.id} className="max-w-[60%]" />
        </label>
      ))}
    </div>
  )
}
