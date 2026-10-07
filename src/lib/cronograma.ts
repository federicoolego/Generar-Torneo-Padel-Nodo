// Cronograma imprimible de partidos (orden cronológico, con columna para anotar resultados)
import { diaLargo, formatoPesos, rangoFechas, type Categoria, type Horario } from './torneo'
import { resolverTorneo, textoResultado } from './resultados'

export interface FilaCronograma {
  fecha: string          // '' = sin fecha
  hora: string
  sede: string
  etapa: string          // "Zona A · 1 v 4", "Cuartos 1", "Final"
  a: string
  b: string
  orden: number          // para desempatar a igual horario
  resultado: string      // "6-4 3-6 10-8" si ya se cargó (vacío para anotar a mano)
}

const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre']
const tituloDia = (f: string) => `${diaLargo(f)} de ${MESES[Number(f.slice(5, 7)) - 1]}`

export function filasCronograma(cat: Categoria): FilaCronograma[] {
  const out: FilaCronograma[] = []
  const h = (x?: Horario) => ({ fecha: x?.fecha ?? '', hora: x?.hora ?? '', sede: x?.sede ?? '' })
  // nombres reales a medida que se conocen (ganadores de zona, clasificados, cruces) y resultados cargados
  const res = resolverTorneo(cat)
  let orden = 0
  for (const z of res.zonas) {
    for (const p of z.partidos) {
      out.push({ ...h(cat.horariosZona[p.key]), etapa: p.titulo, a: p.etiquetaA, b: p.etiquetaB, orden: orden++, resultado: p.estado === 'jugado' ? textoResultado(p.resultado) : '' })
    }
  }
  for (const r of res.playoff ?? []) {
    for (const p of r) {
      if (p.bye) continue
      out.push({ ...h(cat.horariosPlayoff[p.key]), etapa: p.titulo, a: p.etiquetaA, b: p.etiquetaB, orden: 1000 + orden++, resultado: p.estado === 'jugado' ? textoResultado(p.resultado) : '' })
    }
  }
  return out.sort((x, y) =>
    (x.fecha ? 0 : 1) - (y.fecha ? 0 : 1) || x.fecha.localeCompare(y.fecha) ||
    (x.hora ? 0 : 1) - (y.hora ? 0 : 1) || x.hora.localeCompare(y.hora) || x.orden - y.orden)
}

const esc = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

/**
 * Documento HTML listo para imprimir (A4) o abrir en Word.
 * `logo` = URL (o data URL) del logo; se omite si no hay.
 */
export function htmlCronograma(cat: Categoria, logo: string | null, colores: { oscuro: string; acento: string; suave: string; fondoLogo?: string }): string {
  const filas = filasCronograma(cat)
  const conSede = filas.some((f) => f.sede)
  const dias = [...new Set(filas.map((f) => f.fecha))]
  const tablas = dias.map((d) => {
    const del = filas.filter((f) => f.fecha === d)
    return `
    <h2>${d ? esc(tituloDia(d)) : 'Sin día asignado'} <span class="cant">${del.length} partido${del.length === 1 ? '' : 's'}</span></h2>
    <table>
      <colgroup><col class="c-hora">${conSede ? '<col class="c-sede">' : ''}<col class="c-etapa"><col class="c-par"><col class="c-vs"><col class="c-par"><col class="c-res"></colgroup>
      <thead><tr><th>Hora</th>${conSede ? '<th>Complejo</th>' : ''}<th>Partido</th><th>Pareja</th><th></th><th>Pareja</th><th>Resultado</th></tr></thead>
      <tbody>
        ${del.map((f) => `<tr>
          <td class="hora">${esc(f.hora || '—')}</td>${conSede ? `<td>${esc(f.sede || '—')}</td>` : ''}
          <td class="etapa">${esc(f.etapa)}</td><td>${esc(f.a)}</td><td class="vs">vs</td><td>${esc(f.b)}</td><td class="res">${esc(f.resultado)}</td>
        </tr>`).join('')}
      </tbody>
    </table>`
  }).join('')

  const datos = [
    rangoFechas(cat.fechaInicio, cat.fechaFin) && `<strong>${esc(rangoFechas(cat.fechaInicio, cat.fechaFin))}</strong>`,
    cat.inscripcion && `Inscripción ${esc(formatoPesos(cat.inscripcion))} por jugador`,
    cat.premio && `Premio: ${esc(cat.premio)}`,
  ].filter(Boolean).join(' · ')

  return `<!doctype html>
<html lang="es"><head><meta charset="utf-8">
<title>Partidos · ${esc(cat.torneo)}</title>
<style>
  @page { size: A4 portrait; margin: 12mm; }
  * { box-sizing: border-box; }
  body { font-family: Arial, Helvetica, sans-serif; color: #111; font-size: 11pt; margin: 0; padding: 16px; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  header { display: flex; align-items: center; gap: 14px; border-bottom: 3px solid ${colores.oscuro}; padding-bottom: 10px; margin-bottom: 6px; }
  header img { width: 64px; height: 64px; object-fit: contain; border-radius: 8px; background: ${colores.fondoLogo ?? colores.oscuro}; border: 1px solid #ddd; }
  h1 { font-size: 20pt; margin: 0; color: ${colores.oscuro}; }
  .datos { margin: 2px 0 0; font-size: 11pt; color: #333; }
  .obs { margin: 6px 0 0; font-size: 10pt; color: #444; font-style: italic; }
  h2 { font-size: 13pt; margin: 18px 0 6px; color: ${colores.oscuro}; border-left: 6px solid ${colores.acento}; padding-left: 8px; }
  h2 .cant { font-size: 9pt; font-weight: normal; color: #666; margin-left: 6px; }
  table { width: 100%; border-collapse: collapse; page-break-inside: auto; }
  tr { page-break-inside: avoid; }
  th { background: ${colores.oscuro}; color: #fff; font-size: 9pt; text-transform: uppercase; letter-spacing: .03em; padding: 6px 6px; text-align: left; }
  td { border: 1px solid #999; padding: 8px 6px; vertical-align: middle; font-size: 10.5pt; }
  tbody tr:nth-child(even) td { background: ${colores.suave}; }
  td.hora { font-weight: bold; font-size: 12pt; white-space: nowrap; text-align: center; }
  td.etapa { font-weight: bold; white-space: nowrap; font-size: 9.5pt; }
  td.vs { text-align: center; color: #777; font-size: 9pt; }
  td.res { background: #fff !important; font-weight: bold; text-align: center; }
  col.c-hora { width: 9%; } col.c-sede { width: 12%; } col.c-etapa { width: 13%; } col.c-vs { width: 4%; } col.c-res { width: 20%; }
  footer { margin-top: 14px; font-size: 8.5pt; color: #777; }
  .marca { margin-top: 10px; text-align: center; font-size: 8pt; color: #aaa; }
  .acciones { margin: 0 0 12px; }
  .acciones button { font-size: 12pt; padding: 8px 14px; margin-right: 8px; cursor: pointer; }
  @media print { .acciones { display: none; } body { padding: 0; } }
</style></head>
<body>
  <div class="acciones"><button onclick="window.print()">Imprimir / Guardar PDF</button></div>
  <header>
    ${logo ? `<img src="${logo}" alt="">` : ''}
    <div>
      <h1>${esc(cat.torneo || 'Torneo')}</h1>
      <p class="datos">${datos}</p>
      ${cat.observacion ? `<p class="obs">${esc(cat.observacion)}</p>` : ''}
    </div>
  </header>
  ${filas.length ? tablas : '<p>Todavía no hay partidos: armá las zonas.</p>'}
  <footer>Cronograma de partidos · orden cronológico · generado el ${new Date().toLocaleString('es-AR', { hour12: false })}</footer>
  <p class="marca">Desarrollado por Federico Olego</p>
</body></html>`
}

/** Versión para Word: el mismo documento, sin botones, con el formato que Word interpreta */
export function docWord(html: string): Blob {
  // Word ignora buena parte del CSS: bordes, fondos y anchos van en cada celda
  const oscuro = /th \{ background: (#[0-9A-Fa-f]{6})/.exec(html)?.[1] ?? '#000000'
  const borde = 'border:1px solid #999999;padding:6pt;font-size:10.5pt;'
  const limpio = html
    .replace(/<div class="acciones">[\s\S]*?<\/div>/, '')
    .replace('<html lang="es">', '<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" lang="es">')
    .replace(/<colgroup>[\s\S]*?<\/colgroup>/g, '')
    .replace(/<table>/g, '<table border="1" cellspacing="0" cellpadding="6" width="100%" style="border-collapse:collapse;width:100%">')
    .replace(/<th>([^<]*)<\/th>/g, (_, t: string) => {
      const ancho = ({ Hora: '9%', Complejo: '12%', Partido: '15%', '': '5%', Resultado: '22%' } as Record<string, string>)[t] ?? ''
      return `<th${ancho ? ` width="${ancho}"` : ''} style="background:${oscuro};color:#ffffff;white-space:nowrap;${borde}">${t.toUpperCase()}</th>`
    })
    .replace(/<td class="hora">/g, `<td nowrap style="${borde}font-weight:bold;font-size:12pt;text-align:center;white-space:nowrap">`)
    .replace(/<td class="etapa">/g, `<td nowrap style="${borde}font-weight:bold;font-size:9.5pt;white-space:nowrap">`)
    .replace(/<td class="vs">/g, `<td nowrap style="${borde}text-align:center;color:#777777">`)
    .replace(/<td class="res">/g, `<td style="${borde}">`)
    .replace(/<td>/g, `<td style="${borde}">`)
  return new Blob(['\ufeff', limpio], { type: 'application/msword' })
}

/** Logo como data URL PNG (para que se vea en la ventana de impresión) */
export async function logoPng(url: string): Promise<string | null> {
  try {
    const img = new Image()
    img.src = url
    await img.decode()
    const c = document.createElement('canvas')
    c.width = img.naturalWidth
    c.height = img.naturalHeight
    c.getContext('2d')!.drawImage(img, 0, 0)
    return c.toDataURL('image/png')
  } catch {
    return null
  }
}