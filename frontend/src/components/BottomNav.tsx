import React from 'react'
import { CalendarDays, FolderKanban, Goal, ListOrdered, Settings } from 'lucide-react'
import { cn } from '../lib/utils'

type Page = 'matchdays' | 'table' | 'analysis' | 'scenarios' | 'settings'

interface BottomNavProps {
  activePage: Page
  onNavigate: (page: Page) => void
}

const tabs: { id: Page; label: string; icon: React.ReactNode }[] = [
  {
    id: 'matchdays',
    label: 'Spieltage',
    icon: <CalendarDays className="size-5" />,
  },
  {
    id: 'table',
    label: 'Tabelle',
    icon: <ListOrdered className="size-5" />,
  },
  {
    id: 'analysis',
    label: 'Analyse',
    icon: <Goal className="size-5" />,
  },
  {
    id: 'scenarios',
    label: 'Szenarien',
    icon: <FolderKanban className="size-5" />,
  },
  {
    id: 'settings',
    label: 'Einstellungen',
    icon: <Settings className="size-5" />,
  },
]

export default function BottomNav({ activePage, onNavigate }: BottomNavProps) {
  return (
    <nav className="fixed inset-x-0 bottom-0 z-50 border-t border-white/10 bg-[rgba(22,33,62,0.95)] pb-[var(--safe-bottom)] backdrop-blur-xl">
      <div className="mx-auto grid h-[var(--nav-h)] w-full max-w-6xl grid-cols-5">
      {tabs.map(tab => (
        <button
          key={tab.id}
          className={cn(
            'flex min-h-11 flex-col items-center justify-center gap-1 px-1 text-[10px] text-[var(--text2)] transition-colors sm:text-[11px]',
            activePage === tab.id && 'text-[var(--accent)]'
          )}
          onClick={() => onNavigate(tab.id)}
        >
          {tab.icon}
          <span className="max-w-full truncate">{tab.label}</span>
        </button>
      ))}
      </div>
    </nav>
  )
}
