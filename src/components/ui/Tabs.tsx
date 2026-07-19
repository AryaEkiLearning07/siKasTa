'use client'

import { useId, useRef } from 'react'
import type { KeyboardEvent, ReactNode } from 'react'
import { cn } from '@/lib/utils'

export type TabItem = {
  id: string
  label: string
  disabled?: boolean
  badge?: ReactNode
}

interface TabsProps {
  tabs: TabItem[]
  activeTab: string
  onChange: (tabId: string) => void
  className?: string
  ariaLabel?: string
  idPrefix?: string
}

export function Tabs({ tabs, activeTab, onChange, className, ariaLabel = 'Tab navigasi', idPrefix }: TabsProps) {
  const generatedId = useId()
  const baseId = idPrefix || generatedId
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({})

  function moveFocus(currentIndex: number, direction: 1 | -1) {
    const enabledTabs = tabs.filter((tab) => !tab.disabled)
    if (enabledTabs.length === 0) return

    const currentTab = tabs[currentIndex]
    const enabledIndex = enabledTabs.findIndex((tab) => tab.id === currentTab.id)
    const nextIndex = enabledIndex === -1
      ? 0
      : (enabledIndex + direction + enabledTabs.length) % enabledTabs.length
    const nextTab = enabledTabs[nextIndex]

    onChange(nextTab.id)
    tabRefs.current[nextTab.id]?.focus()
  }

  function handleKeyDown(event: KeyboardEvent<HTMLButtonElement>, index: number) {
    if (event.key === 'ArrowRight') {
      event.preventDefault()
      moveFocus(index, 1)
    }

    if (event.key === 'ArrowLeft') {
      event.preventDefault()
      moveFocus(index, -1)
    }

    if (event.key === 'Home') {
      event.preventDefault()
      const firstTab = tabs.find((tab) => !tab.disabled)
      if (firstTab) {
        onChange(firstTab.id)
        tabRefs.current[firstTab.id]?.focus()
      }
    }

    if (event.key === 'End') {
      event.preventDefault()
      const lastTab = [...tabs].reverse().find((tab) => !tab.disabled)
      if (lastTab) {
        onChange(lastTab.id)
        tabRefs.current[lastTab.id]?.focus()
      }
    }
  }

  return (
    <div
      className={cn('flex overflow-x-auto border-b border-neutral-200', className)}
      role="tablist"
      aria-label={ariaLabel}
    >
      {tabs.map((tab, index) => {
        const selected = activeTab === tab.id

        return (
          <button
            key={tab.id}
            ref={(node) => {
              tabRefs.current[tab.id] = node
            }}
            id={`${baseId}-tab-${tab.id}`}
            type="button"
            onClick={() => !tab.disabled && onChange(tab.id)}
            onKeyDown={(event) => handleKeyDown(event, index)}
            className={cn(
              'relative inline-flex min-h-10 shrink-0 items-center gap-2 px-4 py-2 text-sm font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-brand-green focus:ring-offset-2',
              selected ? 'text-brand-green' : 'text-neutral-500 hover:text-brand-ink',
              tab.disabled && 'cursor-not-allowed opacity-50 hover:text-neutral-500'
            )}
            aria-selected={selected}
            aria-controls={idPrefix ? `${baseId}-panel-${tab.id}` : undefined}
            aria-disabled={tab.disabled || undefined}
            tabIndex={selected ? 0 : -1}
            role="tab"
          >
            <span className="whitespace-nowrap">{tab.label}</span>
            {tab.badge && <span className="rounded-full bg-neutral-100 px-2 py-0.5 text-xs text-neutral-600">{tab.badge}</span>}
            {selected && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-brand-green" />
            )}
          </button>
        )
      })}
    </div>
  )
}

interface TabPanelProps {
  children: ReactNode
  isActive: boolean
  tabId?: string
  idPrefix?: string
  className?: string
}

export function TabPanel({ children, isActive, tabId, idPrefix, className }: TabPanelProps) {
  if (!isActive) return null

  return (
    <div
      id={tabId && idPrefix ? `${idPrefix}-panel-${tabId}` : undefined}
      aria-labelledby={tabId && idPrefix ? `${idPrefix}-tab-${tabId}` : undefined}
      role="tabpanel"
      className={cn('pt-4', className)}
    >
      {children}
    </div>
  )
}
