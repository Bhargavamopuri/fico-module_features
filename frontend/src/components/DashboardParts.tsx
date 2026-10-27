import { useEffect, useState } from 'react'
import {
  Bell,
  ChevronDown,
  ChevronRight,
  Database,
  Hexagon,
  RefreshCw,
  Search,
  X,
} from 'lucide-react'
import {
  actionOptions,
  companies,
  fiscalPeriods,
  fiscalYears,
  navigationItems,
  type FicoModule,
  type NavigationItem,
} from '../data/dashboardData'

type SidebarProps = {
  activeItem: string
  onSelect: (label: string) => void
}

export function Sidebar({ activeItem, onSelect }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <span className="brand-logo"><Hexagon size={22} strokeWidth={2.6} /></span>
        <span className="brand-name">STACKLY <small>OneERP</small></span>
      </div>
      <nav className="sidebar-nav" aria-label="Main navigation">
        {navigationItems.map(({ label, icon: Icon }: NavigationItem) => (
          <button
            type="button"
            key={label}
            className={`nav-link ${activeItem === label ? 'selected' : ''}`}
            onClick={() => onSelect(label)}
            aria-current={activeItem === label ? 'page' : undefined}
          >
            <Icon size={16} strokeWidth={1.9} />
            <span>{label}</span>
            {label === 'FICO' && <ChevronDown className="nav-chevron" size={14} />}
          </button>
        ))}
      </nav>
    </aside>
  )
}

type TopbarProps = {
  search: string
  setSearch: (value: string) => void
  onSampleDataClick: () => void
}

export function Topbar({ search, setSearch, onSampleDataClick }: TopbarProps) {
  const [menu, setMenu] = useState<'notifications' | 'profile' | null>(null)
  const [notificationsRead, setNotificationsRead] = useState(false)

  return (
    <header className="topbar">
      <label className="search-box">
        <Search size={15} aria-hidden="true" />
        <input
          aria-label="Search this page"
          placeholder="Search this page..."
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {search && (
          <button className="clear-search" type="button" aria-label="Clear search" onClick={() => setSearch('')}>
            <X size={14} />
          </button>
        )}
      </label>

      <div className="topbar-actions">
        <button type="button" className="sample-pill" onClick={onSampleDataClick}>
          <Database size={12} />
          Sample data
        </button>
        <div className="popover-wrap">
          <button
            type="button"
            className="notification-button"
            aria-label="Notifications"
            aria-expanded={menu === 'notifications'}
            onClick={() => setMenu(menu === 'notifications' ? null : 'notifications')}
          >
            <Bell size={17} />
            {!notificationsRead && <span className="notification-count">3</span>}
          </button>
          {menu === 'notifications' && (
            <div className="popover notification-popover">
              <div className="popover-heading">Notifications <span>3 new</span></div>
              <p>April period close is in progress.</p>
              <p>Two invoices are awaiting approval.</p>
              <p>Monthly report is ready to view.</p>
              <button type="button" className="popover-action" onClick={() => setNotificationsRead(true)}>Mark all as read</button>
            </div>
          )}
        </div>
        <div className="popover-wrap">
          <button
            type="button"
            className="profile-button"
            aria-expanded={menu === 'profile'}
            onClick={() => setMenu(menu === 'profile' ? null : 'profile')}
          >
            <span className="avatar">JD</span>
            <span className="profile-copy"><strong>John Doe</strong><small>Approver</small></span>
            <ChevronDown size={13} />
          </button>
          {menu === 'profile' && (
            <div className="popover profile-popover">
              <strong>John Doe</strong>
              <span>Finance Approver</span>
              <button type="button" className="popover-action" onClick={() => setMenu(null)}>Close profile menu</button>
            </div>
          )}
        </div>
      </div>
    </header>
  )
}

type DashboardHeaderProps = {
  company: string
  setCompany: (value: string) => void
  fiscalYear: string
  setFiscalYear: (value: string) => void
  fiscalPeriod: string
  setFiscalPeriod: (value: string) => void
  onRefresh: () => void
}

export function DashboardHeader({
  company,
  setCompany,
  fiscalYear,
  setFiscalYear,
  fiscalPeriod,
  setFiscalPeriod,
  onRefresh,
}: DashboardHeaderProps) {
  return (
    <section className="dashboard-heading">
      <div className="heading-copy">
        <h1>FICO - Financial Accounting</h1>
        <p>Manage your company&apos;s financial transactions and reports</p>
      </div>
      <div className="filter-panel" aria-label="Dashboard filters">
        <label className="filter-control">
          <span>Company / Organization</span>
          <select value={company} onChange={(event) => setCompany(event.target.value)}>
            {companies.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="filter-control">
          <span>Fiscal Year</span>
          <select value={fiscalYear} onChange={(event) => setFiscalYear(event.target.value)}>
            {fiscalYears.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <label className="filter-control">
          <span>Fiscal Period</span>
          <select value={fiscalPeriod} onChange={(event) => setFiscalPeriod(event.target.value)}>
            {fiscalPeriods.map((value) => <option key={value}>{value}</option>)}
          </select>
        </label>
        <button type="button" className="refresh-button" onClick={onRefresh}>
          <RefreshCw size={14} />
          <span>Refresh</span>
        </button>
      </div>
    </section>
  )
}

type ActionModalProps = {
  action: string
  onClose: () => void
  onSubmit: (values: Record<string, string>) => void
}

export function ActionModal({ action, onClose, onSubmit }: ActionModalProps) {
  const [values, setValues] = useState<Record<string, string>>({})
  const config = actionOptions.find((item) => item.label === action)
  const Icon = config?.icon

  useEffect(() => {
    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleEscape)
    return () => window.removeEventListener('keydown', handleEscape)
  }, [onClose])

  if (!config || !Icon) return null

  const fieldType = (field: string) => {
    if (/date/i.test(field)) return 'date'
    if (/amount|cost/i.test(field)) return 'number'
    return 'text'
  }

  return (
    <div className="modal-backdrop" onMouseDown={(event) => {
      if (event.target === event.currentTarget) onClose()
    }}>
      <section className="action-modal" role="dialog" aria-modal="true" aria-labelledby="modal-title">
        <div className="modal-header">
          <div className={`modal-icon ${config.color}`}><Icon size={19} /></div>
          <div>
            <h2 id="modal-title">{action}</h2>
            <p>Enter the details below to create a new record.</p>
          </div>
          <button className="close-modal" type="button" aria-label="Close dialog" onClick={onClose}><X size={18} /></button>
        </div>
        <form onSubmit={(event) => {
          event.preventDefault()
          onSubmit(values)
        }}>
          <div className="modal-fields">
            {config.fields.map((field, index) => (
              <label key={field} className="modal-field">
                <span>{field}</span>
                <input
                  autoFocus={index === 0}
                  type={fieldType(field)}
                  min={fieldType(field) === 'number' ? '0' : undefined}
                  step={fieldType(field) === 'number' ? '0.01' : undefined}
                  required
                  value={values[field] || ''}
                  onChange={(event) => setValues((current) => ({ ...current, [field]: event.target.value }))}
                />
              </label>
            ))}
          </div>
          <div className="modal-footer">
            <button type="button" className="cancel-button" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-button">Create record <ChevronRight size={15} /></button>
          </div>
        </form>
      </section>
    </div>
  )
}

type ModuleDetailProps = {
  module: FicoModule
  onBack: () => void
}

export function ModuleDetail({ module, onBack }: ModuleDetailProps) {
  const Icon = module.icon
  return (
    <section className="module-detail">
      <button type="button" className="back-link" onClick={onBack}>← Back to FICO Dashboard</button>
      <div className="detail-card">
        <div className={`module-icon ${module.color}`}><Icon size={22} /></div>
        <h1>{module.name}</h1>
        <p>{module.description}</p>
        <div className="detail-empty">
          <Icon size={25} />
          <strong>{module.name} workspace</strong>
          <span>This section is ready for your accounting records and workflows.</span>
        </div>
      </div>
    </section>
  )
}
