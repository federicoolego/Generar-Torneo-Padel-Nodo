// Genera las imágenes (PNG) de zonas y playoff dibujando en un <canvas>
import { LETRAS, partidosDeZona, rondasPlayoff, textoHorario, type Categoria } from './torneo'

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

/** Encabezado con logo, torneo, categoría y el título de la imagen. Devuelve la altura usada */
function encabezado(ctx: CanvasRenderingContext2D, img: HTMLImageElement, cat: Categoria, titulo: string, medir = false): number {
  const logoTam = 168
  const x = MARGEN + logoTam + 36
  const anchoTexto = ANCHO - x - MARGEN
  ctx.font = `700 64px ${DISPLAY}`
  const lt = lineas(ctx, cat.torneo || 'Torneo', anchoTexto)
  const alto = Math.max(logoTam + 2 * 44, 44 + lt.length * 64 + 16 + 50 + 20 + 44 + 44)
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
  ctx.font = `700 26px ${TEXTO}`
  const w = ctx.measureText(titulo.toUpperCase()).width + 36
  rect(ctx, x, y, w, 44, 22, C.lima)
  ctx.fillStyle = C.noche
  ctx.fillText(titulo.toUpperCase(), x + 18, y + 31)
  return alto
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

function tarjetaZona(ctx: CanvasRenderingContext2D, cat: Categoria, zi: number, ancho: number): Tarjeta {
  const nombre = (id: string) => cat.parejas.find((p) => p.id === id)?.nombre ?? '—'
  const zona = cat.zonas[zi]
  const partidos = partidosDeZona(zona, zi, nombre)
  const pad = 26
  const interior = ancho - 2 * pad
  // medir
  ctx.font = `600 26px ${TEXTO}`
  const parejasL = zona.map((id) => lineas(ctx, nombre(id), interior - 44))
  ctx.font = `500 23px ${TEXTO}`
  const partidosL = partidos.map((p) => lineas(ctx, `${p.a}  vs  ${p.b}`, interior))
  ctx.font = `700 21px ${TEXTO}`
  const horariosL = partidos.map((p) => lineas(ctx, `${p.titulo.toUpperCase()} · ${textoHorario(cat.horariosZona[p.key])}`, interior))
  let alto = 70 + 20
  parejasL.forEach((l) => { alto += l.length * 32 + 8 })
  alto += 18 + 34
  partidosL.forEach((l, k) => { alto += horariosL[k].length * 28 + 2 + l.length * 30 + 14 })
  alto += 10
  return {
    alto,
    dibujar: (c, x, y) => {
      rect(c, x, y, ancho, alto, 20, C.blanco)
      c.save(); c.beginPath(); c.roundRect(x, y, ancho, 70, [20, 20, 0, 0]); c.fillStyle = C.verde; c.fill(); c.restore()
      c.fillStyle = C.blanco
      c.font = `700 40px ${DISPLAY}`
      c.fillText(`ZONA ${LETRAS[zi]}`, x + pad, y + 48)
      let yy = y + 70 + 20
      parejasL.forEach((ls, k) => {
        c.fillStyle = C.lima
        c.beginPath(); c.arc(x + pad + 15, yy + 12, 16, 0, Math.PI * 2); c.fill()
        c.fillStyle = C.noche
        c.font = `700 20px ${TEXTO}`
        c.textAlign = 'center'; c.fillText(String(k + 1), x + pad + 15, yy + 19); c.textAlign = 'left'
        c.font = `600 26px ${TEXTO}`
        ls.forEach((l, i) => { c.fillText(l, x + pad + 44, yy + 22 + i * 32) })
        yy += ls.length * 32 + 8
      })
      yy += 6
      c.strokeStyle = C.linea; c.lineWidth = 2
      c.beginPath(); c.moveTo(x + pad, yy); c.lineTo(x + ancho - pad, yy); c.stroke()
      yy += 12
      c.fillStyle = C.gris; c.font = `700 20px ${TEXTO}`
      c.fillText('PARTIDOS', x + pad, yy + 20)
      yy += 34
      partidos.forEach((_, k) => {
        c.fillStyle = C.verde; c.font = `700 21px ${TEXTO}`
        horariosL[k].forEach((l) => { c.fillText(l, x + pad, yy + 22); yy += 28 })
        yy += 2
        c.fillStyle = C.texto; c.font = `500 23px ${TEXTO}`
        partidosL[k].forEach((l) => { c.fillText(l, x + pad, yy + 22); yy += 30 })
        yy += 14
      })
    },
  }
}

export async function imagenesZonas(cat: Categoria): Promise<Blob[]> {
  await fuentes()
  const img = await logo()
  const medir = document.createElement('canvas').getContext('2d')!
  const gap = 28
  const anchoCol = (ANCHO - 2 * MARGEN - gap) / 2
  const tarjetas = cat.zonas.map((_, zi) => tarjetaZona(medir, cat, zi, anchoCol))
  const altoEnc = encabezado(medir, img, cat, 'Zonas', true)
  const MAX_CONTENIDO = 1900   // alto máximo de zonas por imagen (después se arma otra)

  // repartir en páginas y, dentro de cada una, en 2 columnas (a la más corta)
  const paginas: { col: number; y: number; t: Tarjeta }[][] = []
  let actual: { col: number; y: number; t: Tarjeta }[] = []
  let alturas = [0, 0]
  for (const t of tarjetas) {
    const col = alturas[0] <= alturas[1] ? 0 : 1
    if (alturas[col] + t.alto > MAX_CONTENIDO && actual.length) {
      paginas.push(actual); actual = []; alturas = [0, 0]
    }
    const c2 = alturas[0] <= alturas[1] ? 0 : 1
    actual.push({ col: c2, y: alturas[c2], t })
    alturas[c2] += t.alto + gap
  }
  if (actual.length) paginas.push(actual)

  const blobs: Blob[] = []
  for (let i = 0; i < paginas.length; i++) {
    const pag = paginas[i]
    const altoCont = Math.max(...[0, 1].map((c) => Math.max(0, ...pag.filter((x) => x.col === c).map((x) => x.y + x.t.alto))))
    const canvas = document.createElement('canvas')
    canvas.width = ANCHO
    canvas.height = altoEnc + 48 + altoCont + 90
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = C.fondo
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    encabezado(ctx, img, cat, paginas.length > 1 ? `Zonas ${i + 1}/${paginas.length}` : 'Zonas')
    for (const x of pag) x.t.dibujar(ctx, MARGEN + x.col * (anchoCol + gap), altoEnc + 48 + x.y)
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
  const topBracket = altoEnc + 48 + 50

  const canvas = document.createElement('canvas')
  canvas.width = ANCHO
  canvas.height = topBracket + altoBracket + 100
  const ctx = canvas.getContext('2d')!
  ctx.fillStyle = C.fondo
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  encabezado(ctx, img, cat, 'Playoff')

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
        ctx.fillText(recortar(ctx, t, anchoCaja - 20), x + 10, ty + 8)
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
