import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'

export default function Layout() {
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
