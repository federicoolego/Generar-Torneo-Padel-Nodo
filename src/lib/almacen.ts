import { normalizar, type Categoria } from './torneo'

// Todo queda guardado en el navegador (no hay base de datos)
const CLAVE = 'nodo-generador:categorias:v1'

export function cargarTodas(): Categoria[] {
  try {
    return (JSON.parse(localStorage.getItem(CLAVE) ?? '[]') as Categoria[]).map(normalizar).sort((a, b) => b.actualizado - a.actualizado)
  } catch {
    return []
  }
}

export function guardarTodas(lista: Categoria[]) {
  try { localStorage.setItem(CLAVE, JSON.stringify(lista)) } catch { /* sin espacio o sin permiso */ }
}

export function guardar(c: Categoria) {
  const lista = cargarTodas().filter((x) => x.id !== c.id)
  guardarTodas([{ ...c, actualizado: Date.now() }, ...lista])
}

export function eliminar(id: string) {
  guardarTodas(cargarTodas().filter((x) => x.id !== id))
}

// ------------------------------------------------------------------ respaldo (exportar / importar)

/** Identifica de qué app es un respaldo: "nodo", "clasico", "defensores" */
export const APP = CLAVE.split('-')[0]

interface Respaldo { app: string; version: 1; exportado: string; torneos: Categoria[] }

/** Archivo JSON con todos los torneos guardados en este navegador */
export function exportar(): { nombre: string; contenido: string; cantidad: number } {
  const torneos = cargarTodas()
  const hoy = new Date()
  const p = (n: number) => String(n).padStart(2, '0')
  const fecha = `${hoy.getFullYear()}-${p(hoy.getMonth() + 1)}-${p(hoy.getDate())}`
  const r: Respaldo = { app: APP, version: 1, exportado: hoy.toISOString(), torneos }
  return { nombre: `torneos-${APP}-${fecha}.json`, contenido: JSON.stringify(r, null, 2), cantidad: torneos.length }
}

/**
 * Carga un respaldo. Los torneos que no están se agregan; los que ya están (mismo torneo)
 * se reemplazan solo si el del archivo es más nuevo. Nunca borra nada.
 */
export function importar(texto: string): { nuevos: number; actualizados: number; sinCambios: number } {
  let r: Partial<Respaldo>
  try { r = JSON.parse(texto) } catch { throw new Error('El archivo no es un respaldo válido.') }
  if (!r || !Array.isArray(r.torneos)) throw new Error('El archivo no es un respaldo válido.')
  if (r.app && r.app !== APP) throw new Error(`Ese respaldo es de otro complejo (${r.app}). Importalo en su propia app.`)
  const validos = r.torneos.filter((t): t is Categoria => !!t && typeof t.id === 'string' && Array.isArray(t.parejas) && Array.isArray(t.zonas))
  const actuales = new Map(cargarTodas().map((t) => [t.id, t]))
  let nuevos = 0, actualizados = 0, sinCambios = 0
  for (const t of validos.map(normalizar)) {
    const ya = actuales.get(t.id)
    if (!ya) { actuales.set(t.id, t); nuevos++ }
    else if ((t.actualizado ?? 0) > (ya.actualizado ?? 0)) { actuales.set(t.id, t); actualizados++ }
    else sinCambios++
  }
  guardarTodas([...actuales.values()])
  return { nuevos, actualizados, sinCambios }
}