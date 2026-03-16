import { Outlet } from 'react-router-dom'

import { Sidebar } from './Sidebar.js'
import { Breadcrumbs } from './Breadcrumbs.js'
import { CommandPalette } from '../shared/CommandPalette.js'

export function AppShell() {
  return (
    <div className="flex h-screen overflow-hidden">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="px-8 py-6">
          <Breadcrumbs />
          <Outlet />
        </div>
      </main>
      <CommandPalette />
    </div>
  )
}
