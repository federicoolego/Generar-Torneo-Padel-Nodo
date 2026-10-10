import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { AlertTriangle, ArrowLeft, ArrowRight, Check, CloudUpload, Loader2, Share2 } from 'lucide-react'
import { cargar, escucharGuardado, estadoGuardado, guardar, vaciar, type EstadoGuardado } from '../lib/almacen'
import {
  MAX_PAREJAS, MIN_PAREJAS, datosCompletos, erroresCuadro, firmaZonas, horarioCompleto, partidosDeZona, rangoFechas, rondasPlayoff, type Categoria,
} from '../lib/torneo'
import { resolverTorneo } from '../lib/resultados'
import { Alerta, Button, Modal, Spinner } from '../components/ui'
import Compartir from '../components/Compartir'
import { PasoDatos, PasoParejas } from '../components/pasos/Datos'
import PasoZonas from '../components/pasos/Zonas'
import PasoPlayoff from '../components/pasos/Playoff'
import PasoPartidos from '../components/pasos/Partidos'

// Imágenes va última y separada a la derecha
const PASOS = ['Torneo', 'Parejas', 'Zonas', 'Playoff', 'Partidos', 'Imágenes'] as const

/** `inicial`: torneo nuevo, todavía no guardado. Se crea en la base recién cuando se completan los datos obligatorios */
export default function Editor({ id, inicial, onVolver }: { id: string; inicial?: Categoria; onVolver: () => void }) {
  const [cat, setCat] = useState<Categoria | null>(inicial ?? null)
  // false mientras el torneo nuevo no tenga nombre y fechas: no se manda nada a la base
  const persistido = useRef(!inicial)
  const [errorCarga, setErrorCarga] = useState('')
  const [paso, setPaso] = useState(0)
  const [compartir, setCompartir] = useState(false)
  const guardado = useEstadoGuardado()

  useEffect(() => {
    if (inicial) return
    cargar(id)
      .then((c) => (c ? setCat(c) : setErrorCarga('No se encontró el torneo (puede que lo hayan eliminado).')))
      .catch((e) => setErrorCarga(e instanceof Error ? e.message : 'No se pudo cargar el torneo.'))
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  // aviso al cerrar la pestaña con cambios sin subir
  useEffect(() => {
    const f = (e: BeforeUnloadEvent) => { if (estadoGuardado().estado !== 'guardado') { e.preventDefault(); e.returnValue = '' } }
    window.addEventListener('beforeunload', f)
    return () => window.removeEventListener('beforeunload', f)
  }, [])

  const cambiar = useCallback((f: (c: Categoria) => Categoria) => {
    setCat((c) => {
      if (!c) return c
      const n = f(c)
      // si cambia la forma de las zonas (cantidad o tamaños), el cuadro de playoff ya no sirve
      const n2 = firmaZonas(n.zonas) !== firmaZonas(c.zonas) ? { ...n, cuadro: null } : n
      const final = { ...n2, actualizado: Date.now() }
      if (persistido.current || datosCompletos(final)) {
        persistido.current = true
        guardar(final)
      }
      return final
    })
  }, [])

  /** Sube lo pendiente y vuelve a leer el torneo (para ver lo que cargaron otros) */
  const recargar = useCallback(async () => {
    if (!persistido.current) return
    await vaciar()
    const c = await cargar(id)
    if (c) setCat(c)
  }, [id])

  const volver = async () => { await vaciar(); onVolver() }

  // estado de cada paso
  const estado = useMemo(() => {
    if (!cat) return { ok: PASOS.map(() => false), listo: [false, false, false], avisos: [] as string[] }
    const ubicadas = new Set(cat.zonas.flat())
    const zonasOk = cat.zonas.length > 0 && cat.zonas.every((z) => z.length === 3 || z.length === 4) &&
      cat.parejas.every((p) => ubicadas.has(p.id)) && cat.zonas.flat().length === ubicadas.size
    const partidosZ = zonasOk ? cat.zonas.flatMap((z, zi) => partidosDeZona(z, zi, () => '')) : []
    const sinHorarioZ = partidosZ.filter((p) => !horarioCompleto(cat.horariosZona[p.key])).length
    const cuadroOk = zonasOk && !!cat.cuadro && erroresCuadro(cat.cuadro, cat.zonas).length === 0
    const primera = cuadroOk ? rondasPlayoff(cat.cuadro!)[0].filter((p) => !p.bye) : []
    const sinHorarioP = primera.filter((p) => !horarioCompleto(cat.horariosPlayoff[p.key])).length
    const terminado = cuadroOk && !!resolverTorneo(cat).campeon
    return {
      ok: [
        datosCompletos(cat),
        cat.parejas.length >= MIN_PAREJAS && cat.parejas.length <= MAX_PAREJAS,
        zonasOk && sinHorarioZ === 0,
        cuadroOk && sinHorarioP === 0,
        terminado,
        zonasOk,
      ],
      // lo mínimo para avanzar: torneo, parejas y zonas armadas (los horarios se pueden completar después)
      listo: [
        datosCompletos(cat),
        cat.parejas.length >= MIN_PAREJAS && cat.parejas.length <= MAX_PAREJAS,
        zonasOk,
      ],
      avisos: [
        ...(sinHorarioZ ? [`Faltan día y horario en ${sinHorarioZ} partido(s) de zona.`] : []),
        ...(zonasOk && !cuadroOk ? ['Todavía no armaste el playoff: solo se genera la imagen de zonas.'] : []),
        ...(sinHorarioP ? [`Faltan día y horario en ${sinHorarioP} partido(s) de la primera ronda del playoff.`] : []),
      ],
    }
  }, [cat])

  if (errorCarga) {
    return (
      <div className="space-y-4">
        <Alerta tipo="error">{errorCarga}</Alerta>
        <Button variante="secundario" onClick={onVolver}><ArrowLeft className="h-4 w-4" aria-hidden /> Torneos</Button>
      </div>
    )
  }
  if (!cat) return <Spinner texto="Cargando torneo…" />

  // se puede ir a un paso si los anteriores obligatorios (1 a 3) están completos
  const habilitado = (i: number) => (i <= 2 ? estado.listo.slice(0, i) : estado.listo).every(Boolean)

  return (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <button onClick={volver} className="inline-flex items-center gap-1 text-sm font-semibold text-cancha"><ArrowLeft className="h-4 w-4" aria-hidden /> Torneos</button>
        {persistido.current ? <IndicadorGuardado {...guardado} /> : <span className="text-xs text-noche/55">Sin guardar · se crea al completar nombre y fechas</span>}
      </div>
      <h1 className="font-display text-4xl font-bold leading-none">{cat.torneo || 'Nuevo torneo'}</h1>
      <p className="mb-5 mt-1 text-sm text-noche/60">
        {[rangoFechas(cat.fechaInicio, cat.fechaFin), `${cat.parejas.length} parejas`].filter(Boolean).join(' · ')}
      </p>

      <nav className="mb-6 flex gap-1 overflow-x-auto rounded-xl bg-white p-1 ring-1 ring-noche/10" aria-label="Pasos">
        {PASOS.map((t, i) => (
          <button key={t} onClick={() => habilitado(i) && setPaso(i)} disabled={!habilitado(i)} aria-current={paso === i ? 'step' : undefined}
            className={`flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-semibold disabled:opacity-35 ${i === PASOS.length - 1 ? 'ml-auto' : ''} ${paso === i ? 'bg-noche text-white' : 'text-noche/70 hover:bg-vidrio'}`}>
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
      {paso === 3 && <PasoPlayoff cat={cat} cambiar={cambiar} />}
      {paso === 4 && <PasoPartidos cat={cat} cambiar={cambiar} onRecargar={recargar} />}
      {paso === 5 && <Compartir cat={cat} avisos={estado.avisos} />}

      <div className="mt-8 flex justify-between gap-3">
        <Button variante="secundario" onClick={() => setPaso(paso - 1)} disabled={paso === 0}><ArrowLeft className="h-4 w-4" aria-hidden /> Anterior</Button>
        {paso < PASOS.length - 1 && (
          <Button onClick={() => setPaso(paso + 1)} disabled={!habilitado(paso + 1)}>Siguiente <ArrowRight className="h-4 w-4" aria-hidden /></Button>
        )}
      </div>

      {/* Botón flotante: generar y compartir las imágenes */}
      <button
        onClick={() => setCompartir(true)}
        disabled={!estado.listo[2]}
        title={estado.listo[2] ? 'Generar y compartir imágenes' : 'Armá las zonas para generar las imágenes'}
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

function useEstadoGuardado() {
  const [e, setE] = useState(estadoGuardado)
  useEffect(() => escucharGuardado((estado, error) => setE({ estado, error })), [])
  return e
}

function IndicadorGuardado({ estado, error }: { estado: EstadoGuardado; error: string }) {
  if (estado === 'error') {
    return <span className="inline-flex items-center gap-1 text-xs font-semibold text-red" title={error}><AlertTriangle className="h-3.5 w-3.5" aria-hidden /> No se pudo guardar · reintentando</span>
  }
  if (estado === 'guardado') return <span className="inline-flex items-center gap-1 text-xs text-noche/50"><Check className="h-3.5 w-3.5" aria-hidden /> Guardado</span>
  return (
    <span className="inline-flex items-center gap-1 text-xs text-noche/60">
      {estado === 'guardando' ? <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden /> : <CloudUpload className="h-3.5 w-3.5" aria-hidden />} Guardando…
    </span>
  )
}
