// Lógica de zonas y playoff (misma que la app de torneos, pero en memoria)

/** `cancha` quedó de versiones anteriores: ya no se carga ni se muestra */
export interface Horario { fecha: string; hora: string; cancha?: string }
export interface Pareja {
  id: string
  /** "Juan Perez / Ricardo Lopez" (es lo que se muestra en zonas e imágenes) */
  nombre: string
  jugador1?: string
  jugador2?: string
  /** problemas de horario de la pareja (vacío si no tiene) */
  horario?: string
}
/** Un lado de primera ronda del playoff: posición `pos` de la zona número `zona` (0 = A) */
export interface Slot { zona: number; pos: number }

/** Un torneo (de una categoría): datos, parejas, zonas y playoff */
export interface Categoria {
  id: string
  torneo: string
  /** YYYY-MM-DD */
  fechaInicio: string
  fechaFin: string
  categoria: string
  /** texto libre: formato de partidos, reglas, etc. */
  observacion: string
  parejas: Pareja[]
  /** ids de parejas por zona, en orden de posición (en zonas de 4: 1 vs 4 y 2 vs 3) */
  zonas: string[][]
  /** clave `${zona}-${partido}` */
  horariosZona: Record<string, Horario>
  /** primera ronda del playoff: [ladoA, ladoB] por partido (null = libre, el otro pasa directo) */
  cuadro: (Slot | null)[][] | null
  /** clave `${ronda}-${orden}` */
  horariosPlayoff: Record<string, Horario>
  actualizado: number
}

export const LETRAS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
/** Completa campos que no existían en torneos guardados con versiones anteriores */
export const normalizar = (c: Categoria): Categoria =>
  ({ ...c, fechaInicio: c.fechaInicio ?? '', fechaFin: c.fechaFin ?? '', observacion: c.observacion ?? '' })

export const MIN_PAREJAS = 6
export const MAX_PAREJAS = 24

export const nuevoId = () => (crypto.randomUUID ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now())

export function nuevaCategoria(): Categoria {
  return { id: nuevoId(), torneo: '', fechaInicio: '', fechaFin: '', categoria: '', observacion: '', parejas: [], zonas: [], horariosZona: {}, cuadro: null, horariosPlayoff: {}, actualizado: Date.now() }
}

export const CATEGORIAS_SUGERIDAS = [
  ...['3ra', '4ta', '5ta', '6ta', '7ma'].map((c) => `${c} Caballeros`),
  ...['4ta', '5ta', '6ta', '7ma'].map((c) => `${c} Damas`),
  ...[8, 9, 10, 11, 12, 13, 14].flatMap((s) => [`Suma ${s} Caballeros`, `Suma ${s} Damas`, `Suma ${s} Mixto`]),
]

/** "JUaN  perez" → "Juan Perez" (también "maría-josé" → "María-José") */
export function nombrePropio(t: string): string {
  return t
    .trim()
    .replace(/\s+/g, ' ')
    .toLocaleLowerCase('es')
    .replace(/(^|[\s-])(\p{L})/gu, (_, sep: string, l: string) => sep + l.toLocaleUpperCase('es'))
}

/** Clave para comparar jugadores sin importar mayúsculas, tildes ni espacios */
const claveJugador = (t: string) => t.normalize('NFD').replace(/\p{Diacritic}/gu, '').toLowerCase().replace(/\s+/g, ' ').trim()

/** Misma pareja = mismos dos jugadores, en cualquier orden */
export const clavePareja = (j1: string, j2: string) => [claveJugador(j1), claveJugador(j2)].sort().join('|')

/** Jugadores de una pareja (las guardadas antes solo tenían `nombre`) */
export function jugadoresDe(p: Pareja): [string, string] {
  if (p.jugador1 !== undefined && p.jugador2 !== undefined) return [p.jugador1, p.jugador2]
  const [a = '', ...b] = p.nombre.split(' / ')
  return [a, b.join(' / ')]
}

/** "A / B; C / D" o una por línea */
export function parsearParejas(texto: string): string[] {
  return texto.split(/[\n;]+/).map((x) => x.replace(/\s+/g, ' ').replace(/\s*\/\s*/g, ' / ').trim()).filter(Boolean)
}

// ------------------------------------------------------------------ zonas

/** Reparto por defecto: floor(n/3) zonas; las primeras quedan de 4 y el resto de 3 */
export function sugerirZonas(ids: string[], aleatorio: boolean): string[][] {
  const lista = [...ids]
  if (aleatorio) {
    for (let i = lista.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1))
      ;[lista[i], lista[j]] = [lista[j], lista[i]]
    }
  }
  const cant = Math.floor(lista.length / 3)
  if (cant < 1) return []
  const de4 = lista.length - 3 * cant
  const out: string[][] = []
  let k = 0
  for (let z = 0; z < cant; z++) {
    const tam = z < de4 ? 4 : 3
    out.push(lista.slice(k, k + tam))
    k += tam
  }
  return out
}

export interface PartidoZona { key: string; zona: number; numero: number; titulo: string; codigo: string; a: string; b: string }

/** Partidos de una zona. Zona de 3: todos contra todos. Zona de 4: 1v4, 2v3, ganadores y perdedores */
export function partidosDeZona(zona: string[], zi: number, nombre: (id: string) => string): PartidoZona[] {
  const n = (i: number) => nombre(zona[i])
  const p = (numero: number, titulo: string, codigo: string, a: string, b: string): PartidoZona =>
    ({ key: `${zi}-${numero}`, zona: zi, numero, titulo, codigo, a, b })
  if (zona.length === 3) {
    return [p(1, 'Partido 1', '1 v 2', n(0), n(1)), p(2, 'Partido 2', '1 v 3', n(0), n(2)), p(3, 'Partido 3', '2 v 3', n(1), n(2))]
  }
  if (zona.length === 4) {
    return [
      p(1, 'Partido 1', '1 v 4', n(0), n(3)),
      p(2, 'Partido 2', '2 v 3', n(1), n(2)),
      p(3, 'Ganadores', 'G v G', 'Ganador P1', 'Ganador P2'),
      p(4, 'Perdedores', 'P v P', 'Perdedor P1', 'Perdedor P2'),
    ]
  }
  return []
}

export const firmaZonas = (zonas: string[][]) => zonas.map((z) => z.length).join(',')

// ------------------------------------------------------------------ playoff

export interface Clasificado { key: string; zona: number; pos: number; label: string }

export const etiquetaSlot = (s: Slot) => `${s.pos}° Zona ${LETRAS[s.zona]}`

/** Clasifican 1° y 2° en zonas de 3; 1°, 2° y 3° en zonas de 4. Orden de siembra: 1°s, 2°s, 3°s */
export function clasificados(zonas: string[][]): Clasificado[] {
  const out: Clasificado[] = []
  for (const pos of [1, 2, 3]) {
    zonas.forEach((z, zi) => {
      const cupo = z.length === 4 ? 3 : 2
      if (pos <= cupo) out.push({ key: `${zi}:${pos}`, zona: zi, pos, label: etiquetaSlot({ zona: zi, pos }) })
    })
  }
  return out
}

export function tamCuadro(q: number) {
  let b = 2
  while (b < q) b *= 2
  return b
}

const FASES: Record<number, string> = { 2: 'Final', 4: 'Semifinal', 8: 'Cuartos', 16: 'Octavos', 32: '16avos' }
export const nombreFase = (tamRonda: number) => FASES[tamRonda] ?? `Ronda de ${tamRonda}`

/** Cuadro automático: siembra estándar y sin cruces de la misma zona en primera ronda */
export function cuadroAutomatico(zonas: string[][]): (Slot | null)[][] {
  const cl = clasificados(zonas)
  const q = cl.length
  const b = tamCuadro(q)
  let seeds = [1]
  while (seeds.length < b) {
    const n = seeds.length
    seeds = seeds.flatMap((s) => [s, 2 * n + 1 - s])
  }
  const slots: (Slot | null)[] = seeds.map((s) => (s <= q ? { zona: cl[s - 1].zona, pos: cl[s - 1].pos } : null))
  for (let j = 0; j < b / 2; j++) {
    const a = slots[2 * j], c = slots[2 * j + 1]
    if (a && c && a.zona === c.zona) {
      for (let k = 0; k < b / 2; k++) {
        const x = slots[2 * k + 1], y = slots[2 * k]
        if (k !== j && x && x.zona !== a.zona && (!y || y.zona !== c.zona)) {
          slots[2 * j + 1] = x
          slots[2 * k + 1] = c
          break
        }
      }
    }
  }
  const out: (Slot | null)[][] = []
  for (let j = 0; j < b / 2; j++) out.push([slots[2 * j], slots[2 * j + 1]])
  return out
}

export function erroresCuadro(cruces: (Slot | null | undefined)[][], zonas: string[][]): string[] {
  const cl = clasificados(zonas)
  const b = tamCuadro(cl.length)
  const err: string[] = []
  if (cruces.length !== b / 2) return [`El cuadro tiene que tener ${b / 2} partidos.`]
  // un lado sin elegir se guarda como { zona: -1, pos: -1 } (en JSON no existe undefined)
  const planos = cruces.flat().map((v) => (v && v.zona < 0 ? undefined : v))
  if (planos.some((v) => v === undefined)) err.push('Completá todos los lados.')
  const usados = new Map<string, number>()
  planos.forEach((v) => { if (v) usados.set(`${v.zona}:${v.pos}`, (usados.get(`${v.zona}:${v.pos}`) ?? 0) + 1) })
  const faltan = cl.filter((c) => !usados.has(c.key))
  if (faltan.length) err.push(`Falta ubicar: ${faltan.map((c) => c.label).join(', ')}.`)
  if ([...usados.values()].some((n) => n > 1)) err.push('Hay clasificados repetidos.')
  const libres = planos.filter((v) => v === null).length
  if (!planos.some((v) => v === undefined) && libres !== b - cl.length) err.push(`Tiene que haber exactamente ${b - cl.length} lado(s) libre(s).`)
  if (cruces.some(([a, c]) => a === null && c === null)) err.push('Un partido no puede tener los dos lados libres.')
  return err
}

export interface PartidoPlayoff {
  key: string
  ronda: number        // 1 = primera ronda
  orden: number        // 1..n dentro de la ronda
  fase: string         // Cuartos, Semifinal, Final…
  titulo: string       // "Cuartos 2", "Final"
  a: string
  b: string
  /** primera ronda con un lado libre: no se juega, el otro pasa directo */
  bye: boolean
}

/** Todas las rondas del cuadro, con lo que se sabe de cada lado ("1° Zona A", "Ganador Cuartos 2") */
export function rondasPlayoff(cuadro: (Slot | null)[][]): PartidoPlayoff[][] {
  const b = cuadro.length * 2
  const rondas: PartidoPlayoff[][] = []
  let tam = b
  let r = 1
  let previa: PartidoPlayoff[] = []
  while (tam >= 2) {
    const fase = nombreFase(tam)
    const lista: PartidoPlayoff[] = []
    for (let j = 1; j <= tam / 2; j++) {
      const titulo = tam === 2 ? fase : `${fase} ${j}`
      let a: string, bb: string, bye = false
      if (r === 1) {
        const [sa, sb] = cuadro[j - 1]
        a = sa ? etiquetaSlot(sa) : 'Libre'
        bb = sb ? etiquetaSlot(sb) : 'Libre'
        bye = !sa || !sb
      } else {
        const lado = (f: PartidoPlayoff) => (f.bye ? (f.a === 'Libre' ? f.b : f.a) : `Ganador ${f.titulo}`)
        a = lado(previa[2 * j - 2])
        bb = lado(previa[2 * j - 1])
      }
      lista.push({ key: `${r}-${j}`, ronda: r, orden: j, fase, titulo, a, b: bb, bye })
    }
    rondas.push(lista)
    previa = lista
    tam /= 2
    r++
  }
  return rondas
}

// ------------------------------------------------------------------ fechas

const DIAS = ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb']
const DIAS_LARGOS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado']
const aFecha = (f: string) => new Date(`${f}T12:00:00`)
/** "Vie 26/09" */
export const diaCorto = (f: string) => {
  const d = aFecha(f)
  return `${DIAS[d.getDay()]} ${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}`
}
/** "Viernes 26" */
export const diaLargo = (f: string) => { const d = aFecha(f); return `${DIAS_LARGOS[d.getDay()]} ${d.getDate()}` }
/** "Vie 25/09 al Sáb 26/09" (o un solo día) */
export const rangoFechas = (ini: string, fin: string) =>
  !ini ? '' : !fin || fin === ini ? diaCorto(ini) : `${diaCorto(ini)} al ${diaCorto(fin)}`

/** "Vie 26/09 · 19:00 hs" */
export function textoHorario(h: Horario | undefined, corto = false): string {
  if (!h || (!h.fecha && !h.hora)) return corto ? 'A confirmar' : 'Día y horario a confirmar'
  const partes: string[] = []
  if (h.fecha) partes.push(diaCorto(h.fecha))
  if (h.hora) partes.push(corto ? h.hora : `${h.hora} hs`)
  return partes.join(' · ')
}
export const horarioCompleto = (h: Horario | undefined) => !!h?.fecha && !!h?.hora

/** Suma minutos a una fecha/hora local "YYYY-MM-DD" + "HH:MM" */
export function sumarMinutos(fecha: string, hora: string, min: number): { fecha: string; hora: string } {
  const d = new Date(`${fecha}T${hora}:00`)
  d.setMinutes(d.getMinutes() + min)
  const p = (n: number) => String(n).padStart(2, '0')
  return { fecha: `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`, hora: `${p(d.getHours())}:${p(d.getMinutes())}` }
}