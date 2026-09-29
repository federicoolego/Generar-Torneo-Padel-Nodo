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