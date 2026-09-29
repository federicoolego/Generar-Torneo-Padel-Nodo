import { LETRAS, partidosDeZona, type Categoria, type Horario } from '../../lib/torneo'
import { Card } from '../ui'
import { CompletarHorarios, EditorHorario } from '../Horarios'

type Props = { cat: Categoria; cambiar: (f: (c: Categoria) => Categoria) => void }

export default function PasoHorariosZona({ cat, cambiar }: Props) {
  const nombre = (id: string) => cat.parejas.find((p) => p.id === id)?.nombre ?? '—'
  const porZona = cat.zonas.map((z, zi) => partidosDeZona(z, zi, nombre))
  // orden para completar automático: primera fecha de todas las zonas, después la segunda…
  const grupos = [1, 2, 3, 4].map((n) => porZona.flatMap((ps) => ps.filter((p) => p.numero === n).map((p) => p.key))).filter((g) => g.length)
  const set = (key: string, h: Horario) => cambiar((c) => ({ ...c, horariosZona: { ...c.horariosZona, [key]: h } }))

  return (
    <div className="space-y-4">
      <Card className="flex flex-wrap items-center justify-between gap-3">
        <p className="max-w-xl text-sm text-noche/75">Asigná día y hora a cada partido. Con “Completar automático” se reparten en turnos y después ajustás a mano.</p>
        <CompletarHorarios grupos={grupos} fechaInicial={cat.fechaInicio} actuales={cat.horariosZona} onAplicar={(h) => cambiar((c) => ({ ...c, horariosZona: h }))} />
      </Card>
      <div className="grid gap-4 lg:grid-cols-2">
        {porZona.map((ps, zi) => (
          <section key={zi} className="overflow-hidden rounded-xl bg-white ring-1 ring-noche/10">
            <h3 className="bg-noche px-4 py-2 font-display text-lg font-bold text-white">Zona {LETRAS[zi]}</h3>
            <ul className="divide-y divide-noche/5">
              {ps.map((p) => (
                <li key={p.key} className="space-y-2 p-3">
                  <p className="text-sm"><span className="font-semibold text-cancha">{p.titulo}:</span> {p.a} <span className="text-noche/45">vs</span> {p.b}</p>
                  <EditorHorario valor={cat.horariosZona[p.key]} onChange={(h) => set(p.key, h)} requerido />
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  )
}