import { useState } from 'react'
import { ChevronDown, HardDrive, Info } from 'lucide-react'

const CLAVE = 'generador:instructivo-cerrado'

/** Cómo se usa la app y qué tener en cuenta (se puede plegar; recuerda si lo cerraron) */
export default function Instructivo() {
  const [abierto, setAbierto] = useState(() => {
    try { return localStorage.getItem(CLAVE) !== '1' } catch { return true }
  })
  const alternar = () => {
    const nuevo = !abierto
    setAbierto(nuevo)
    try { nuevo ? localStorage.removeItem(CLAVE) : localStorage.setItem(CLAVE, '1') } catch { /* nada */ }
  }

  return (
    <section className="mb-5 overflow-hidden rounded-xl bg-white ring-1 ring-noche/10">
      <button onClick={alternar} aria-expanded={abierto} className="flex w-full items-center justify-between gap-3 px-4 py-3 text-left">
        <span className="flex items-center gap-2 font-display text-lg font-bold"><Info className="h-5 w-5" aria-hidden /> ¿Cómo se usa?</span>
        <ChevronDown className={`h-5 w-5 transition ${abierto ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {abierto && (
        <div className="grid gap-5 border-t border-noche/10 px-4 py-4 text-sm text-noche/80 md:grid-cols-2">
          <div>
            <p className="mb-2 font-semibold text-noche">Armar un torneo, paso a paso</p>
            <ol className="list-decimal space-y-1.5 pl-5">
              <li><strong>Torneo:</strong> nombre, fechas, categoría y, si querés, el valor de la inscripción y una observación (formato de partidos, reglas).</li>
              <li><strong>Parejas:</strong> se inscriben de a una (mínimo 6, máximo 24). Si tienen problemas de horario, anotalos: te van a aparecer resaltados al armar las zonas.</li>
              <li><strong>Zonas:</strong> sorteo automático y después acomodás a mano lo que necesites.</li>
              <li><strong>Horarios:</strong> día y hora de cada partido de zona (con “Completar automático” se reparten solos).</li>
              <li><strong>Playoff:</strong> el cuadro se arma solo con los clasificados (1° Zona A vs 2° Zona B…) y le ponés día y hora a la primera ronda.</li>
              <li><strong>Imágenes:</strong> zonas y playoff listas para compartir por WhatsApp (también con el botón verde de abajo a la derecha).</li>
              <li><strong>Partidos:</strong> el cronograma en PDF, en orden, con una columna para anotar los resultados.</li>
            </ol>
            <p className="mt-2 text-xs text-noche/60">Cada categoría es un torneo aparte. Para otra categoría del mismo torneo, usá “Duplicar” y cambiá la categoría y las parejas.</p>
          </div>
          <div className="space-y-3">
            <div className="rounded-lg bg-amber-50 p-3 ring-1 ring-amber-200">
              <p className="mb-1.5 flex items-center gap-2 font-semibold text-amber-900"><HardDrive className="h-4 w-4" aria-hidden /> Importante: dónde se guardan los torneos</p>
              <ul className="list-disc space-y-1 pl-5 text-amber-950/90">
                <li><strong>No hay base de datos:</strong> todo queda guardado <strong>solo en este navegador</strong>, en este dispositivo.</li>
                <li>Si abrís la app en otro celular, otra compu u otro navegador, <strong>no vas a ver los torneos</strong>.</li>
                <li>Se pierden si borrás los <em>datos de navegación / cookies</em> del navegador, si usás una ventana de incógnito o, en iPhone, si pasan varios días sin abrir la app.</li>
                <li>Refrescar la página, cerrar el navegador o apagar el equipo <strong>no</strong> los borra.</li>
              </ul>
            </div>
            <div className="rounded-lg bg-vidrio p-3">
              <p className="mb-1 font-semibold text-noche">Para no perder nada</p>
              <p>Usá <strong>Exportar respaldo</strong>: baja un archivo con todos tus torneos. Guardalo en Drive, en tu mail o mandátelo por WhatsApp. Con <strong>Importar respaldo</strong> los recuperás en cualquier dispositivo.</p>
              <p className="mt-2">Una vez terminado el torneo, las imágenes y el PDF ya generados son tu registro: podés eliminar el torneo de la app sin problema.</p>
            </div>
          </div>
        </div>
      )}
    </section>
  )
}