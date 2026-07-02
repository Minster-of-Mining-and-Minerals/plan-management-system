import type { ReactNode } from 'react'

export interface BreadcrumbItem {
  label: string
  href?: string
  icon?: ReactNode
}

export interface ActionButton {
  label: string
  icon?: ReactNode
  variant?: 'default' | 'secondary' | 'outline' | 'destructive' | 'ghost'
  size?: 'default' | 'sm' | 'lg'
  onClick: () => void
  disabled?: boolean
  loading?: boolean
  permissions?: string[]
}

export interface FilterField {
  key: string
  label: string
  type: 'text' | 'select' | 'multiselect' | 'date' | 'daterange'
  placeholder?: string
  options?: Array<{ label: string; value: string }>
  value?: any
  onChange: (value: any) => void
}

export interface PageLayoutProps {
  title?: string
  description?: string
  actions?: ActionButton[]
  filters?: FilterField[]
  sideActions?: ActionButton[];
  children?: ReactNode
  filterColumnsPerRow?: number
  showToggleHierarchyNode?: boolean;
  toggleHierarchyNode?: boolean;
  setToggleHierarchyNode?;
  showSearch?: boolean;
}

export interface DetailPageLayoutProps {
  title: string
  description?: string
  backTo: string
  actions?: ActionButton[]
  children: ReactNode
}
