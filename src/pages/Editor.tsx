import { useCallback, useMemo, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Share2 } from 'lucide-react'
import { cargarTodas, guardar } from '../lib/almacen'
import {
  MAX_PAREJAS, MIN_PAREJAS, erroresCuadro, firmaZonas, horarioCompleto, nuevaCategoria, partidosDeZona, rangoFechas, rondasPlayoff, type Categoria,
} from '../lib/torneo'
import { Button, Modal } from '../components/ui'
import Compartir from '../components/Compartir'
import { PasoDatos, PasoParejas } from '../components/pasos/Datos'
import PasoZonas from '../components/pasos/Zonas'
import PasoHorariosZona from '../components/pasos/HorariosZona'
import PasoPlayoff from '../components/pasos/Playoff'
import PasoPartidos from '../components/pasos/Partidos'

const PASOS = ['Torneo', 'Parejas', 'Zonas', 'Horarios', 'Playoff', 'Imágenes', 'Partidos'] as const

export default function Editor({ id, onVolver }: { id: string; onVolver: () => void }) {
  const [cat, setCat] = useState<Categoria>(() => cargarTodas().find((c) => c.id === id) ?? { ...nuevaCategoria(), id })
  const [paso, setPaso] = useState(0)
  const [compartir, setCompartir] = useState(false)

  const cambiar = useCallback((f: (c: Categoria) => Categoria) => {
    setCat((c) => {
      const n = f(c)
      // si cambia la forma de las zonas (cantidad o tamaños), el cuadro de playoff ya no sirve
      const n2 = firmaZonas(n.zonas) !== firmaZonas(c.zonas) ? { ...n, cuadro: null } : n
      const final = { ...n2, actualizado: Date.now() }
      guardar(final)
      return final
    })
  }, [])

  // estado de cada paso
  const estado = useMemo(() => {
    const ubicadas = new Set(cat.zonas.flat())
    const zonasOk = cat.zonas.length > 0 && cat.zonas.every((z) => z.length === 3 || z.length === 4) &&
      cat.parejas.every((p) => ubicadas.has(p.id)) && cat.zonas.flat().length === ubicadas.size
    const partidosZ = zonasOk ? cat.zonas.flatMap((z, zi) => partidosDeZona(z, zi, () => '')) : []
    const sinHorarioZ = partidosZ.filter((p) => !horarioCompleto(cat.horariosZona[p.key])).length
    const cuadroOk = zonasOk && !!cat.cuadro && erroresCuadro(cat.cuadro, cat.zonas).length === 0
    const primera = cuadroOk ? rondasPlayoff(cat.cuadro!)[0].filter((p) => !p.bye) : []
    const sinHorarioP = primera.filter((p) => !horarioCompleto(cat.horariosPlayoff[p.key])).length
    return {
      ok: [
        !!cat.torneo.trim() && !!cat.categoria.trim() && !!cat.fechaInicio && !!cat.fechaFin && cat.fechaFin >= cat.fechaInicio,
        cat.parejas.length >= MIN_PAREJAS && cat.parejas.length <= MAX_PAREJAS,
        zonasOk,
        zonasOk && sinHorarioZ === 0,
        cuadroOk && sinHorarioP === 0,
        zonasOk,
        zonasOk,
      ],
      avisos: [
        ...(sinHorarioZ ? [`Faltan día y horario en ${sinHorarioZ} partido(s) de zona.`] : []),
        ...(zonasOk && !cuadroOk ? ['Todavía no armaste el playoff: solo se genera la imagen de zonas.'] : []),
        ...(sinHorarioP ? [`Faltan día y horario en ${sinHorarioP} partido(s) de la primera ronda del playoff.`] : []),
      ],
    }
  }, [cat])

  // se puede ir a un paso si los anteriores obligatorios (1 a 3) están completos
  const habilitado = (i: number) => i <= 2 ? estado.ok.slice(0, i).every(Boolean) : estado.ok.slice(0, 3).every(Boolean)

  return (
    <>
      <button onClick={onVolver} className="mb-3 inline-flex items-center gap-1 text-sm font-semibold text-cancha"><ArrowLeft className="h-4 w-4" aria-hidden /> Torneos</button>
      <h1 className="font-display text-4xl font-bold leading-none">{cat.torneo || 'Nuevo torneo'}</h1>
      <p className="mb-5 mt-1 text-sm text-noche/60">
        {[cat.categoria || 'Sin categoría', rangoFechas(cat.fechaInicio, cat.fechaFin), `${cat.parejas.length} parejas`].filter(Boolean).join(' · ')}
      </p>

      <nav className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-white p-1 ring-1 ring-noche/10" aria-label="Pasos">
        {PASOS.map((t, i) => (
          <button key={t} onClick={() => habilitado(i) && setPaso(i)} disabled={!habilitado(i)} aria-current={paso === i ? 'step' : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-35 ${paso === i ? 'bg-noche text-white' : 'text-noche/70 hover:bg-vidrio'}`}>
            <span className={`grid h-5 w-5 place-items-center rounded-full text-[11px] ${estado.ok[i] ? 'bg-pelota text-noche' : paso === i ? 'bg-white/20' : 'bg-noche/10'}`}>
              {estado.ok[i] ? <Check className="h-3 w-3" /> : i + 1}
            </span>
            {t}
          </button>
        ))}
      </nav>

      {paso === 0 && <PasoDatos cat={cat} cambiar={cambiar} />}
      {paso === 1 && <PasoParejas cat={cat} cambiar={cambiar} />}
      {paso === 2 && <PasoZonas cat={cat} cambiar={cambiar} />}
      {paso === 3 && <PasoHorariosZona cat={cat} cambiar={cambiar} />}
      {paso === 4 && <PasoPlayoff cat={cat} cambiar={cambiar} />}
      {paso === 5 && <Compartir cat={cat} avisos={estado.avisos} />}
      {paso === 6 && <PasoPartidos cat={cat} />}

      <div className="mt-8 flex justify-between gap-3">
        <Button variante="secundario" onClick={() => setPaso(paso - 1)} disabled={paso === 0}><ArrowLeft className="h-4 w-4" aria-hidden /> Anterior</Button>
        {paso < PASOS.length - 1 && (
          <Button onClick={() => setPaso(paso + 1)} disabled={!habilitado(paso + 1)}>Siguiente <ArrowRight className="h-4 w-4" aria-hidden /></Button>
        )}
      </div>

      {/* Botón flotante: generar y compartir las imágenes */}
      <button
        onClick={() => setCompartir(true)}
        disabled={!estado.ok[2]}
        title={estado.ok[2] ? 'Generar y compartir imágenes' : 'Armá las zonas para generar las imágenes'}
        aria-label="Generar y compartir imágenes"
        className="fixed bottom-6 right-6 z-40 grid h-16 w-16 place-items-center rounded-full bg-[#1FA855] text-white shadow-xl ring-4 ring-white transition hover:scale-105 disabled:bg-noche/30 disabled:hover:scale-100"
        style={{ bottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}
      >
        <Share2 className="h-7 w-7" />
      </button>
      <Modal abierto={compartir} titulo="Compartir por WhatsApp" onCerrar={() => setCompartir(false)} ancho="max-w-3xl">
        {compartir && <Compartir cat={cat} avisos={estado.avisos} />}
      </Modal>
    </>
  )
}