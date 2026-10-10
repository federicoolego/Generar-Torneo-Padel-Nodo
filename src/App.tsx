import { useEffect, useState } from 'react'
import { LogOut } from 'lucide-react'
import { alCerrarSesion, salir, sesionActiva } from './lib/auth'
import { configurado } from './lib/supabase'
import { vaciar } from './lib/almacen'
import { Alerta, Spinner } from './components/ui'
import { nuevaCategoria, type Categoria } from './lib/torneo'
import Login from './pages/Login'
import Inicio from './pages/Inicio'
import Editor from './pages/Editor'

export const logoUrl = () => `${import.meta.env.BASE_URL}logo-nodo.webp`

export function Firma() {
  return <p className="py-4 text-center text-xs text-noche/45">Desarrollado por Federico Olego</p>
}

export default function App() {
  const [logueado, setLogueado] = useState<boolean | null>(null)
  const [abierta, setAbierta] = useState<string | null>(null)
  // torneo nuevo todavía sin guardar: se crea en la base recién con los datos obligatorios completos
  const [nuevo, setNuevo] = useState<Categoria | null>(null)
  const abrir = (id: string | null) => { setNuevo(null); setAbierta(id) }
  const crear = () => { const c = nuevaCategoria(); setNuevo(c); setAbierta(c.id) }

  useEffect(() => {
    if (!configurado) return
    sesionActiva().then(setLogueado)
    return alCerrarSesion(() => setLogueado(false))
  }, [])

  if (!configurado) {
    return (
      <div className="mx-auto max-w-lg p-6">
        <Alerta tipo="error">Falta configurar la base de datos: definí VITE_SUPABASE_URL y VITE_SUPABASE_ANON_KEY.</Alerta>
      </div>
    )
  }
  if (logueado === null) return <div className="grid min-h-screen place-items-center"><Spinner /></div>
  if (!logueado) return <Login onOk={() => setLogueado(true)} />
  return (
    <div className="min-h-screen pb-28">
      <header className="sticky top-0 z-30 bg-noche text-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <button onClick={async () => { await vaciar(); abrir(null) }} className="flex items-center gap-3 text-left">
            <img src={logoUrl()} alt="NODO Club de Pádel & Co." className="h-10 w-10 rounded-lg" />
            <span className="font-display text-xl font-bold leading-none">Generador de Torneos</span>
          </button>
          <button onClick={async () => { await vaciar(); await salir(); setLogueado(false) }} aria-label="Cerrar sesión" className="text-white/70 hover:text-white">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        {abierta ? <Editor key={abierta} id={abierta} inicial={nuevo ?? undefined} onVolver={() => abrir(null)} /> : <Inicio onAbrir={abrir} onNuevo={crear} />}
      </main>
      <Firma />
    </div>
  )
}
