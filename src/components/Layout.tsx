import { Outlet } from 'react-router-dom'
import { useAuth } from '../lib/auth'
import Login from './Login'
import Sidebar from './Sidebar'

export default function Layout() {
  const { session, isMember, loading, signOut } = useAuth()

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-sm text-muted">Chargement…</div>
  }

  if (!session) return <Login />

  if (!isMember) {
    return (
      <div className="flex min-h-screen items-center justify-center px-5">
        <div className="flex max-w-md flex-col gap-4 rounded-2xl border border-line bg-surface p-8">
          <h1 className="m-0 font-display text-xl font-bold">Accès non autorisé</h1>
          <p className="m-0 text-sm leading-relaxed text-text-2">
            Le compte <strong className="text-text">{session.user.email}</strong> n'est pas encore dans la liste des
            membres. Demande à un admin de l'ajouter.
          </p>
          <button
            type="button"
            onClick={signOut}
            className="min-h-11 cursor-pointer rounded-lg border border-line-strong bg-transparent text-sm text-text"
          >
            Se déconnecter
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col md:flex-row">
      <Sidebar />
      <main className="min-w-0 flex-1 px-5 py-6 md:px-10 md:py-8">
        <div className="mx-auto flex max-w-7xl flex-col gap-7">
          <Outlet />
        </div>
      </main>
    </div>
  )
}
