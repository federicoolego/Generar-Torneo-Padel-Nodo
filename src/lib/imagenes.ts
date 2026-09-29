// Genera las imágenes (PNG) de zonas y playoff dibujando en un <canvas>
import { LETRAS, diaLargo, partidosDeZona, rangoFechas, rondasPlayoff, textoHorario, type Categoria } from './torneo'

const C = {
  noche: '#042D29',
  verde: '#0F6B57',
  verdeSuave: '#DCEEE8',
  fondo: '#F2F6F4',
  lima: '#C8DC3C',
  texto: '#042D29',
  gris: '#5B6F6A',
  blanco: '#FFFFFF',
  linea: '#C9D6D2',
}
const ANCHO = 1080
const MARGEN = 56
const DISPLAY = '"Barlow Condensed", "Arial Narrow", sans-serif'
const TEXTO = 'Barlow, Arial, sans-serif'

let logoCache: Promise<HTMLImageElement> | null = null
function logo(): Promise<HTMLImageElement> {
  logoCache ??= new Promise((ok, mal) => {
    const img = new Image()
    img.onload = () => ok(img)
    img.onerror = mal
    img.src = `${import.meta.env.BASE_URL}logo-nodo.webp`
  })
  return logoCache
}

async function fuentes() {
  try {
    await Promise.all([
      document.fonts.load(`700 64px ${DISPLAY}`),
      document.fonts.load(`600 30px ${DISPLAY}`),
      document.fonts.load(`500 26px ${TEXTO}`),
      document.fonts.load(`600 26px ${TEXTO}`),
    ])
  } catch { /* se usan las de respaldo */ }
}

function lineas(ctx: CanvasRenderingContext2D, texto: string, ancho: number): string[] {
  const palabras = texto.split(' ')
  const out: string[] = []
  let actual = ''
  for (const p of palabras) {
    const prueba = actual ? `${actual} ${p}` : p
    if (ctx.measureText(prueba).width > ancho && actual) { out.push(actual); actual = p } else actual = prueba
  }
  if (actual) out.push(actual)
  return out
}

function recortar(ctx: CanvasRenderingContext2D, texto: string, ancho: number): string {
  if (ctx.measureText(texto).width <= ancho) return texto
  let t = texto
  while (t.length > 1 && ctx.measureText(`${t}…`).width > ancho) t = t.slice(0, -1)
  return `${t}…`
}

function rect(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number, fill: string, stroke?: string) {
  ctx.beginPath()
  ctx.roundRect(x, y, w, h, r)
  ctx.fillStyle = fill
  ctx.fill()
  if (stroke) { ctx.strokeStyle = stroke; ctx.lineWidth = 2; ctx.stroke() }
}

/** Encabezado con logo, torneo, categoría, fechas y el título de la imagen. Devuelve la altura usada */
function encabezado(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cat: Categoria, titulo: string, medir = false): number {
  const logoTam = 168
  const x = MARGEN + logoTam + 36
  const anchoTexto = ANCHO - x - MARGEN
  ctx.font = `700 64px ${DISPLAY}`
  const lt = lineas(ctx, cat.torneo || 'Torneo', anchoTexto)
  const fechas = rangoFechas(cat.fechaInicio, cat.fechaFin)
  const alto = Math.max(logoTam + 2 * 44, 44 + lt.length * 64 + 56 + (fechas ? 40 : 0) + 20 + 44 + 44)
  if (medir) return alto
  ctx.fillStyle = C.noche
  ctx.fillRect(0, 0, ANCHO, alto)
  ctx.drawImage(img, MARGEN, (alto - logoTam) / 2, logoTam, logoTam)
  let y = 44 + 56
  ctx.fillStyle = C.blanco
  ctx.font = `700 64px ${DISPLAY}`
  for (const l of lt) { ctx.fillText(l, x, y); y += 64 }
  ctx.font = `600 48px ${DISPLAY}`
  ctx.fillStyle = C.lima
  ctx.fillText(recortar(ctx, cat.categoria || 'Categoría', anchoTexto), x, y + 6)
  y += 30
  if (fechas) {
    ctx.font = `500 28px ${TEXTO}`
    ctx.fillStyle = 'rgba(255,255,255,0.8)'
    ctx.fillText(recortar(ctx, fechas, anchoTexto), x, y + 32)
    y += 44
  }
  ctx.font = `700 26px ${TEXTO}`
  const w = ctx.measureText(titulo.toUpperCase()).width + 36
  rect(ctx, x, y, w, 44, 22, C.lima)
  ctx.fillStyle = C.noche
  ctx.fillText(titulo.toUpperCase(), x + 18, y + 31)
  return alto
}

/** Franjas de texto centrado debajo del encabezado (resumen de horarios, observación). Devuelve la altura */
function bandas(ctx: CanvasRenderingContext2D, y0: number, textos: { texto: string; fuerte?: boolean }[], medir = false): number {
  let y = y0
  for (const t of textos) {
    if (!t.texto.trim()) continue
    ctx.font = `${t.fuerte ? 600 : 500} 25px ${TEXTO}`
    const ls = t.texto.split('\n').flatMap((p) => lineas(ctx, p, ANCHO - 2 * MARGEN - 40))
    const alto = ls.length * 34 + 28
    if (!medir) {
      ctx.fillStyle = t.fuerte ? C.verdeSuave : C.blanco
      ctx.fillRect(0, y, ANCHO, alto)
      ctx.fillStyle = C.texto
      ctx.textAlign = 'center'
      ls.forEach((l, k) => ctx.fillText(l, ANCHO / 2, y + 14 + 25 + k * 34))
      ctx.textAlign = 'left'
      ctx.fillStyle = C.linea
      ctx.fillRect(0, y + alto - 2, ANCHO, 2)
    }
    y += alto
  }
  return y - y0
}

function pie(ctx: CanvasRenderingContext2D, y: number) {
  ctx.fillStyle = C.gris
  ctx.font = `500 22px ${TEXTO}`
  ctx.textAlign = 'center'
  ctx.fillText('NODO Club de Pádel & Co.', ANCHO / 2, y)
  ctx.textAlign = 'left'
}

function aBlob(canvas: HTMLCanvasElement): Promise<Blob> {
  return new Promise((ok, mal) => canvas.toBlob((b) => (b ? ok(b) : mal(new Error('No se pudo generar la imagen'))), 'image/png'))
}

// ------------------------------------------------------------------ zonas

interface Tarjeta { alto: number; dibujar: (ctx: CanvasRenderingContext2D, x: number, y: number) => void }

/** Zona como tabla: N° · Pareja · Partido · Horario (una fila por pareja y por partido) */
function tarjetaZona(ctx: CanvasRenderingContext2D, cat: Categoria, zi: number, ancho: number): Tarjeta {
  const nombre = (id: string) => cat.parejas.find((p) => p.id === id)?.nombre ?? ''
  const zona = cat.zonas[zi]
  const partidos = partidosDeZona(zona, zi, nombre)
  const fechas = [...new Set(partidos.map((p) => cat.horariosZona[p.key]?.fecha).filter(Boolean))] as string[]
  const unDia = fechas.length === 1 && partidos.every((p) => cat.horariosZona[p.key]?.fecha === fechas[0])
  const titulo = `ZONA ${LETRAS[zi]}${unDia ? ` · ${diaLargo(fechas[0]).toUpperCase()}` : ''}`
  const hora = (k: number) => {
    const h = cat.horariosZona[partidos[k]?.key]
    if (!h?.hora) return '—'
    return unDia || !h.fecha ? h.hora : `${textoHorario({ fecha: h.fecha, hora: '' }).slice(0, 3)} ${h.hora}`
  }
  const cNum = 48, cPart = 84, cHora = unDia ? 98 : 124
  const cPar = ancho - cNum - cPart - cHora
  const filas = Math.max(zona.length, partidos.length)
  ctx.font = `600 23px ${TEXTO}`
  const nombresL = Array.from({ length: filas }, (_, k) => (zona[k] ? lineas(ctx, nombre(zona[k]), cPar - 24) : []))
  const altos = nombresL.map((l) => Math.max(60, l.length * 28 + 22))
  const altoCab = 64, altoCols = 40
  const alto = altoCab + altoCols + altos.reduce((a, b) => a + b, 0)
  return {
    alto,
    dibujar: (c, x, y) => {
      c.save()
      c.beginPath(); c.roundRect(x, y, ancho, alto, 16); c.clip()
      c.fillStyle = C.blanco; c.fillRect(x, y, ancho, alto)
      // título
      c.fillStyle = C.noche; c.fillRect(x, y, ancho, altoCab)
      c.fillStyle = C.blanco; c.font = `700 36px ${DISPLAY}`; c.textAlign = 'center'
      c.fillText(titulo, x + ancho / 2, y + 45)
      // encabezado de columnas
      const yc = y + altoCab
      c.fillStyle = C.verde; c.fillRect(x, yc, ancho, altoCols)
      c.fillStyle = C.blanco; c.font = `700 16px ${TEXTO}`
      c.fillText('N°', x + cNum / 2, yc + 27)
      c.fillText('PAREJA', x + cNum + cPar / 2, yc + 27)
      c.fillText('PARTIDO', x + cNum + cPar + cPart / 2, yc + 27)
      c.fillText('HORARIO', x + cNum + cPar + cPart + cHora / 2, yc + 27)
      // filas
      let yy = yc + altoCols
      for (let k = 0; k < filas; k++) {
        const h = altos[k]
        const mid = yy + h / 2
        if (k % 2 === 1) { c.fillStyle = '#F7FAF9'; c.fillRect(x, yy, cNum + cPar + cPart, h) }
        c.fillStyle = C.texto
        c.font = `700 24px ${TEXTO}`; c.textAlign = 'center'
        if (zona[k]) c.fillText(String(k + 1), x + cNum / 2, mid + 8)
        c.textAlign = 'left'; c.font = `600 23px ${TEXTO}`
        const ls = nombresL[k]
        ls.forEach((l, i) => c.fillText(l, x + cNum + 12, mid - ((ls.length - 1) * 28) / 2 + 8 + i * 28))
        c.textAlign = 'center'
        if (partidos[k]) {
          c.font = `600 22px ${TEXTO}`; c.fillStyle = C.gris
          c.fillText(partidos[k].codigo, x + cNum + cPar + cPart / 2, mid + 8)
          // horario destacado
          c.fillStyle = C.verde
          c.fillRect(x + cNum + cPar + cPart, yy, cHora, h)
          c.fillStyle = C.blanco; c.font = `700 ${unDia ? 26 : 22}px ${TEXTO}`
          c.fillText(hora(k), x + cNum + cPar + cPart + cHora / 2, mid + 9)
        }
        c.textAlign = 'left'
        c.fillStyle = C.linea; c.fillRect(x, yy + h - 1, ancho, 1)
        yy += h
      }
      // líneas verticales
      c.fillStyle = C.linea
      for (const cx of [cNum, cNum + cPar, cNum + cPar + cPart]) c.fillRect(x + cx, yc + altoCols, 1, alto - altoCab - altoCols)
      c.restore()
      c.strokeStyle = C.noche; c.lineWidth = 2
      c.beginPath(); c.roundRect(x, y, ancho, alto, 16); c.stroke()
    },
  }
}

/** "Viernes 25 desde las 17:15 · Sábado 26 desde las 12:30 · Clasifican 2 por zona de 3 y 3 por zona de 4" */
function resumenZonas(cat: Categoria): string {
  const porDia = new Map<string, string>()
  cat.zonas.forEach((z, zi) => partidosDeZona(z, zi, () => '').forEach((p) => {
    const h = cat.horariosZona[p.key]
    if (h?.fecha && h.hora && (!porDia.has(h.fecha) || h.hora < porDia.get(h.fecha)!)) porDia.set(h.fecha, h.hora)
  }))
  const dias = [...porDia.entries()].sort(([a], [b]) => a.localeCompare(b)).map(([f, h]) => `${diaLargo(f)} desde las ${h}`)
  const tam = new Set(cat.zonas.map((z) => z.length))
  const clas = [tam.has(3) ? '2 por zona de 3' : '', tam.has(4) ? '3 por zona de 4' : ''].filter(Boolean).join(' y ')
  return [...dias, clas ? `Clasifican ${clas}` : ''].filter(Boolean).join(' · ')
}

export async function imagenesZonas(cat: Categoria): Promise<Blob[]> {
  await fuentes()
  const img = await logo()
  const medir = document.createElement('canvas').getContext('2d')!
  const gap = 28
  const anchoCol = (ANCHO - 2 * MARGEN - gap) / 2
  const tarjetas = cat.zonas.map((_, zi) => tarjetaZona(medir, cat, zi, anchoCol))
  const altoEnc = encabezado(medir, img, cat, 'Zonas', true)
  const textos = [{ texto: resumenZonas(cat), fuerte: true }, { texto: cat.observacion }]
  const altoBandas = bandas(medir, 0, textos, true)
  const MAX_CONTENIDO = 1700   // alto máximo de zonas por imagen (después se arma otra)

  // repartir en páginas; en cada una, las zonas van de a pares (A-B, C-D…) como en la planilla
  const paginas: { col: number; y: number; t: Tarjeta }[][] = []
  let actual: { col: number; y: number; t: Tarjeta }[] = []
  let y = 0
  for (let i = 0; i < tarjetas.length; i += 2) {
    const fila = tarjetas.slice(i, i + 2)
    const altoFila = Math.max(...fila.map((t) => t.alto))
    if (y + altoFila > MAX_CONTENIDO && actual.length) { paginas.push(actual); actual = []; y = 0 }
    fila.forEach((t, k) => actual.push({ col: k, y, t }))
    y += altoFila + gap
  }
  if (actual.length) paginas.push(actual)

  const blobs: Blob[] = []
  for (let i = 0; i < paginas.length; i++) {
    const pag = paginas[i]
    const altoCont = Math.max(...pag.map((x) => x.y + x.t.alto))
    const canvas = document.createElement('canvas')
    canvas.width = ANCHO
    canvas.height = altoEnc + altoBandas + 40 + altoCont + 90
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = C.fondo
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    encabezado(ctx, img, cat, paginas.length > 1 ? `Zonas ${i + 1}/${paginas.length}` : 'Zonas')
    bandas(ctx, altoEnc, textos)
    for (const x of pag) x.t.dibujar(ctx, MARGEN + x.col * (anchoCol + gap), altoEnc + altoBandas + 40 + x.y)
    pie(ctx, canvas.height - 36)
    blobs.push(await aBlob(canvas))
  }
  return blobs
}

// ------------------------------------------------------------------ playoff

export async function imagenPlayoff(cat: Categoria): Promise<Blob> {
  if (!cat.cuadro) throw new Error('Todavía no hay cuadro de playoff')
  await fuentes()
  const img = await logo()
  const rondas = rondasPlayoff(cat.cuadro)
  // la primera ronda solo se dibuja si tiene algún partido real (si son todos "libre", arranca en la siguiente)
  const visibles = rondas[0].every((p) => p.bye) ? rondas.slice(1) : rondas
  const R = visibles.length
  const gapX = 34
  const anchoCaja = (ANCHO - 2 * MARGEN - gapX * (R - 1)) / R
  const altoCaja = 124
  const n0 = visibles[0].length
  const slot = Math.max(altoCaja + 26, n0 <= 2 ? 300 : 0)
  const altoBracket = n0 * slot
  const medir = document.createElement('canvas').getContext('2d')!
  const altoEnc = encabezado(medir, img, cat, 'Playoff', true)
  const textos = [{ texto: cat.observacion }]
  const altoBandas = bandas(medir, 0, textos, true)
  const topBracket = altoEnc + altoBandas + 48 + 50

  const canvas = document.createElement('canvas')
  canvas.width = ANCHO
  canvas.height = topBracket + altoBracket + 100
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = C.fondo
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  encabezado(ctx, img, cat, 'Playoff')
  bandas(ctx, altoEnc, textos)

  const tamLetra = anchoCaja < 200 ? 19 : anchoCaja < 260 ? 21 : 24
  const centros: number[][] = []
  visibles.forEach((ronda, r) => {
    const x = MARGEN + r * (anchoCaja + gapX)
    const paso = altoBracket / ronda.length
    ctx.fillStyle = C.verde
    ctx.font = `700 ${Math.min(34, tamLetra + 10)}px ${DISPLAY}`
    ctx.textAlign = 'center'
    ctx.fillText(ronda[0].fase.toUpperCase(), x + anchoCaja / 2, topBracket - 22)
    ctx.textAlign = 'left'
    centros[r] = []
    ronda.forEach((p, j) => {
      const cy = topBracket + paso * j + paso / 2
      centros[r][j] = cy
      if (p.bye) return
      const y = cy - altoCaja / 2
      const final = p.fase === 'Final'
      rect(ctx, x, y, anchoCaja, altoCaja, 14, C.blanco, final ? C.lima : undefined)
      // horario
      ctx.save(); ctx.beginPath(); ctx.roundRect(x, y, anchoCaja, 34, [14, 14, 0, 0]); ctx.fillStyle = final ? C.lima : C.verdeSuave; ctx.fill(); ctx.restore()
      ctx.fillStyle = C.noche
      ctx.font = `700 ${tamLetra - 4}px ${TEXTO}`
      ctx.fillText(recortar(ctx, textoHorario(cat.horariosPlayoff[p.key], true), anchoCaja - 20), x + 10, y + 24)
      // lados
      ctx.font = `600 ${tamLetra}px ${TEXTO}`
      ;[p.a, p.b].forEach((t, k) => {
        const ty = y + 34 + 22 + k * 42
        ctx.fillStyle = t.startsWith('Ganador') ? C.gris : C.texto
        // achica la letra antes de cortar el texto ("Ganador Semifinal 1" en la columna de la final)
        let tl = tamLetra
        ctx.font = `600 ${tl}px ${TEXTO}`
        while (tl > 15 && ctx.measureText(t).width > anchoCaja - 20) { tl--; ctx.font = `600 ${tl}px ${TEXTO}` }
        ctx.fillText(recortar(ctx, t, anchoCaja - 20), x + 10, ty + 8)
        ctx.font = `600 ${tamLetra}px ${TEXTO}`
      })
      ctx.strokeStyle = C.linea; ctx.lineWidth = 1.5
      ctx.beginPath(); ctx.moveTo(x + 10, y + 34 + 45); ctx.lineTo(x + anchoCaja - 10, y + 34 + 45); ctx.stroke()
      // conector con la ronda anterior
      if (r > 0) {
        const px = x - gapX
        const a = centros[r - 1][2 * j], b = centros[r - 1][2 * j + 1]
        const ant = visibles[r - 1]
        ctx.strokeStyle = C.verde; ctx.lineWidth = 3
        ctx.beginPath()
        if (!ant[2 * j].bye) { ctx.moveTo(px, a); ctx.lineTo(px + gapX / 2, a); ctx.lineTo(px + gapX / 2, cy) }
        if (!ant[2 * j + 1].bye) { ctx.moveTo(px, b); ctx.lineTo(px + gapX / 2, b); ctx.lineTo(px + gapX / 2, cy) }
        ctx.moveTo(px + gapX / 2, cy); ctx.lineTo(x, cy)
        ctx.stroke()
      }
    })
  })
  pie(ctx, canvas.height - 36)
  return aBlob(canvas)
}

export const nombreArchivo = (cat: Categoria, tipo: string) =>
  `${[cat.torneo, cat.categoria, tipo].filter(Boolean).join(' - ').replace(/[\\/:*?"<>|]+/g, '').trim() || 'torneo'}.png`