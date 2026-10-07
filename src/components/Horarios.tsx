import { useEffect, useState } from 'react'
import { Lock, Wand2 } from 'lucide-react'
import { enPasado, hoyLocal, sumarMinutos, textoHorario, type Horario } from '../lib/torneo'
import { Alerta, Button, Input, Modal, Select } from './ui'

/** Error al cambiar el día u hora de un partido: tiene que quedar en el futuro */
export function errorHorario(antes: Horario, nuevo: Horario): string {
  const cambio = nuevo.fecha !== (antes.fecha ?? '') || nuevo.hora !== (antes.hora ?? '')
  if (!cambio || !nuevo.fecha) return ''
  if (enPasado(nuevo.fecha, nuevo.hora || undefined)) {
    return nuevo.hora ? 'El día y la hora tienen que ser futuros.' : 'El día no puede ser anterior a hoy.'
  }
  return ''
}

/**
 * Día y hora de un partido. Al cambiar día u hora, tiene que quedar en el futuro
 * (lo que se escribe queda en borrador hasta que es válido). `jugado`: tiene resultado, no se reprograma.
 */
export function EditorHorario({ valor, onChange, requerido = false, jugado = false }: {
  valor?: Horario; onChange: (h: Horario) => void; requerido?: boolean; jugado?: boolean
}) {
  const guardado: Horario = { fecha: valor?.fecha ?? '', hora: valor?.hora ?? '' }
  const [d, setD] = useState(guardado)
  const firma = `${guardado.fecha}|${guardado.hora}`
  useEffect(() => setD({ fecha: valor?.fecha ?? '', hora: valor?.hora ?? '' }), [firma]) // eslint-disable-line react-hooks/exhaustive-deps

  if (jugado) {
    return <p className="flex items-center gap-1.5 text-xs text-noche/55"><Lock className="h-3.5 w-3.5" aria-hidden /> Jugado · {textoHorario(valor)}</p>
  }
  const error = errorHorario(guardado, d)
  const cambiar = (n: Horario) => { setD(n); if (!errorHorario(guardado, n)) onChange(n) }
  const falta = requerido && (!d.fecha || !d.hora)
  return (
    <div className="space-y-1">
      <div className="grid grid-cols-[1.4fr_1fr] gap-2 sm:max-w-sm">
        <Input type="date" value={d.fecha} min={hoyLocal()} onChange={(e) => cambiar({ ...d, fecha: e.target.value })} aria-label="Día"
          className={`py-1.5 ${error ? 'ring-red' : falta && !d.fecha ? 'ring-amber-400' : ''}`} />
        <Input type="time" value={d.hora} onChange={(e) => cambiar({ ...d, hora: e.target.value })} aria-label="Hora"
          className={`py-1.5 ${error ? 'ring-red' : falta && !d.hora ? 'ring-amber-400' : ''}`} />
      </div>
      {error && <p className="text-xs text-red">{error} No se guardó: sigue {textoHorario(valor)}.</p>}
    </div>
  )
}

/**
 * Completa horarios en orden: los partidos se reparten en turnos de N partidos a la vez,
 * cada turno dura M minutos. No toca los partidos ya jugados y el primer turno tiene que ser futuro.
 */
export function CompletarHorarios({ grupos, actuales, onAplicar, etiqueta = 'Completar automático', fechaInicial, jugados }: {
  /** partidos agrupados por ronda: cada grupo arranca en un turno nuevo (una ronda después de la otra) */
  grupos: string[][]
  actuales: Record<string, Horario>
  onAplicar: (nuevos: Record<string, Horario>) => void
  etiqueta?: string
  /** día con el que arranca (por defecto, el inicio del torneo) */
  fechaInicial?: string
  /** claves de partidos con resultado: no se modifican */
  jugados?: Set<string>
}) {
  const [abierto, setAbierto] = useState(false)
  const hoy = hoyLocal()
  const [fecha, setFecha] = useState(fechaInicial && fechaInicial >= hoy ? fechaInicial : hoy)
  const [hora, setHora] = useState('18:00')
  const [min, setMin] = useState(75)
  const [canchas, setCanchas] = useState(3)
  const [soloVacios, setSoloVacios] = useState(true)
  const pendientes = grupos.map((g) => g.filter((c) => !jugados?.has(c)))
  const pasado = enPasado(fecha, hora)

  function aplicar() {
    if (pasado) return
    const out: Record<string, Horario> = { ...actuales }
    let turno = 0
    for (const g of pendientes) {
      let k = 0
      for (const c of g) {
        if (soloVacios && actuales[c]?.fecha && actuales[c]?.hora) continue
        const t = sumarMinutos(fecha, hora, (turno + Math.floor(k / canchas)) * min)
        out[c] = { fecha: t.fecha, hora: t.hora }
        k++
      }
      turno += Math.ceil(k / canchas)
    }
    onAplicar(out)
    setAbierto(false)
  }

  return (
    <>
      <Button variante="secundario" onClick={() => setAbierto(true)} disabled={!pendientes.flat().length}><Wand2 className="h-4 w-4" aria-hidden /> {etiqueta}</Button>
      <Modal abierto={abierto} titulo="Completar horarios" onCerrar={() => setAbierto(false)}>
        <div className="space-y-3 text-sm">
          <p className="text-noche/70">Los partidos se asignan en orden, en turnos: tantos partidos a la vez como elijas, y cada ronda arranca cuando termina la anterior. Los partidos ya jugados no se tocan. Después podés corregir cualquiera a mano.</p>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">Primer día<Input type="date" value={fecha} min={hoy} onChange={(e) => setFecha(e.target.value)} className="mt-1" /></label>
            <label className="block">Hora de inicio<Input type="time" value={hora} onChange={(e) => setHora(e.target.value)} className="mt-1" /></label>
            <label className="block">Minutos por turno<Input type="number" min={20} max={180} value={min} onChange={(e) => setMin(Number(e.target.value) || 75)} className="mt-1" /></label>
            <label className="block">Partidos a la vez
              <Select value={canchas} onChange={(e) => setCanchas(Number(e.target.value))} className="mt-1">
                {[1, 2, 3].map((n) => <option key={n} value={n}>{n}</option>)}
              </Select>
            </label>
          </div>
          <label className="flex items-center gap-2"><input type="checkbox" checked={soloVacios} onChange={(e) => setSoloVacios(e.target.checked)} /> Completar solo los que no tienen horario</label>
          {pasado && <Alerta tipo="aviso">El primer turno tiene que ser futuro.</Alerta>}
          <div className="flex justify-end gap-2 pt-2">
            <Button variante="secundario" onClick={() => setAbierto(false)}>Cancelar</Button>
            <Button onClick={aplicar} disabled={pasado}>Aplicar</Button>
          </div>
        </div>
      </Modal>
    </>
  )
}
