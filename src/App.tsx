import { useState } from 'react'
import { LogOut } from 'lucide-react'
import { sesionActiva, salir } from './lib/auth'
import Login from './pages/Login'
import Inicio from './pages/Inicio'
import Editor from './pages/Editor'

export const logoUrl = () => `${import.meta.env.BASE_URL}logo-nodo.webp`

export default function App() {
  const [logueado, setLogueado] = useState(sesionActiva())
  const [abierta, setAbierta] = useState<string | null>(null)

  if (!logueado) return <Login onOk={() => setLogueado(true)} />
  return (
    <div className="min-h-screen pb-28">
      <header className="sticky top-0 z-30 bg-noche text-white" style={{ paddingTop: 'env(safe-area-inset-top)' }}>
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-3 px-4 py-3">
          <button onClick={() => setAbierta(null)} className="flex items-center gap-3 text-left">
            <img src={logoUrl()} alt="NODO Club de Pádel & Co." className="h-10 w-10 rounded-lg" />
            <span className="font-display text-xl font-bold leading-none">Generador de Torneos</span>
          </button>
          <button onClick={() => { salir(); setLogueado(false) }} aria-label="Cerrar sesión" className="text-white/70 hover:text-white">
            <LogOut className="h-5 w-5" />
          </button>
        </div>
      </header>
      <main className="mx-auto max-w-5xl px-4 py-6">
        {abierta ? <Editor key={abierta} id={abierta} onVolver={() => setAbierta(null)} /> : <Inicio onAbrir={setAbierta} />}
      </main>
    </div>
  )
}
