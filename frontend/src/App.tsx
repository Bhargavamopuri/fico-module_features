import { useMemo, useState } from 'react'
import {
  ArrowRight,
  Banknote,
  Building2,
  CalendarDays,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileBarChart,
  Landmark,
  RefreshCw,
  TrendingUp,
} from 'lucide-react'
import {
  actionOptions,
  ficoModules,
  navigationItems,
  transactions as initialTransactions,
  type FicoModule,
  type Transaction,
} from './data/dashboardData'
import {
  ActionModal,
  DashboardHeader,
  ModuleDetail,
  Sidebar,
  Topbar,
} from './components/DashboardParts'
import FiscalPeriodPage from './components/FiscalPeriodPage'
import FinancialReportsPage from './components/FinancialReportsPage'

const summaryCards = [
  { label: 'Total Companies', value: '2', icon: Building2, tone: 'blue', target: 'Company' },
  { label: 'Active Fiscal Years', value: '2', icon: CalendarDays, tone: 'green', target: 'Fiscal Year' },
  { label: 'Open Periods', value: '5', icon: ClipboardList, tone: 'purple', target: 'Fiscal Period' },
  { label: 'Total Accounts', value: '128', icon: Landmark, tone: 'orange', target: 'Chart of Accounts' },
]

const quickActions = actionOptions

const financialMetrics = [
  { label: 'Total Income', amount: '₹ 12,50,000', change: '↑ +12%', icon: TrendingUp, tone: 'blue' },
  { label: 'Total Expenses', amount: '₹ 8,75,000', change: '↑ +8%', icon: Banknote, tone: 'green' },
  { label: 'Net Profit', amount: '₹ 3,75,000', change: '↑ +15%', icon: FileBarChart, tone: 'purple' },
]

function formatRupees(amount: number) {
  return `₹ ${new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount)}`
}

function moduleForSection(section: string): FicoModule {
  const module = ficoModules.find((item) => (
    item.name === section ||
    (section === 'GST' && item.name === 'GST / Tax') ||
    (section === 'Accounts Payable (AP)' && item.name === 'Accounts Payable') ||
    (section === 'Accounts Receivable (AR)' && item.name === 'Accounts Receivable')
  ))
  if (module) return module

  const navigation = navigationItems.find((item) => item.label === section)
  return {
    name: section,
    description: `Manage ${section.toLowerCase()} records and accounting settings.`,
    icon: navigation?.icon ?? Landmark,
    color: 'blue',
  }
}

function App() {
  const [activeSection, setActiveSection] = useState('FICO')
  const [search, setSearch] = useState('')
  const [company, setCompany] = useState('Stackly Technologies')
  const [fiscalYear, setFiscalYear] = useState('2026 - 2027')
  const [fiscalPeriod, setFiscalPeriod] = useState('All Periods')
  const [summaryPeriod, setSummaryPeriod] = useState('This Year')
  const [transactions, setTransactions] = useState<Transaction[]>(initialTransactions)
  const [action, setAction] = useState<string | null>(null)
  const [toast, setToast] = useState('')

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase()
    if (!query) return transactions
    return transactions.filter((transaction) => (
      `${transaction.date} ${transaction.documentNo} ${transaction.module} ${transaction.description} ${transaction.status}`
        .toLowerCase()
        .includes(query)
    ))
  }, [search, transactions])

  const filteredModules = useMemo(() => {
    const query = search.trim().toLowerCase()
    return query
      ? ficoModules.filter((module) => `${module.name} ${module.description}`.toLowerCase().includes(query))
      : ficoModules
  }, [search])

  const notify = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 3000)
  }

  const openSection = (section: string) => {
    setActiveSection(section)
    if (section === 'Home' || section === 'FICO') {
      setActiveSection('FICO')
      return
    }
    setSearch('')
  }

  const createRecord = (values: Record<string, string>) => {
    const selectedAction = actionOptions.find((item) => item.label === action)
    if (!selectedAction) return
    const amountField = Object.keys(values).find((field) => /amount|cost/i.test(field))
    const amount = amountField ? Number(values[amountField]) || 0 : 0
    const targetModule: Record<string, string> = {
      'Create Journal Entry': 'Journal Entry',
      'Create AP Invoice': 'Accounts Payable',
      'Create AR Invoice': 'Accounts Receivable',
      'Add Fixed Asset': 'Fixed Assets',
      'Create Budget': 'Budgeting',
      'Generate Report': 'Financial Reports',
    }
    const descriptionField = Object.keys(values).find((field) => /description|name|invoice|report type/i.test(field))
    const description = (descriptionField ? values[descriptionField] : undefined)
      || Object.entries(values).find(([field, value]) => value.trim() && !/date/i.test(field))?.[1]
      || selectedAction.label
    const today = new Date()
    const newTransaction: Transaction = {
      date: `${String(today.getDate()).padStart(2, '0')}-${String(today.getMonth() + 1).padStart(2, '0')}-${today.getFullYear()}`,
      documentNo: `NEW-${String(Date.now()).slice(-6)}`,
      module: targetModule[selectedAction.label],
      description,
      amount,
      status: 'Created',
    }
    setTransactions((current) => [newTransaction, ...current])
    setAction(null)
    setActiveSection('FICO')
    setSearch('')
    notify(`${selectedAction.label} saved as a draft.`)
  }

  const refreshDashboard = () => {
    setTransactions([...initialTransactions])
    setSearch('')
    notify('Dashboard refreshed with the latest sample data.')
  }

  const showDashboard = activeSection === 'FICO'
  const currentModule = moduleForSection(activeSection)

  return (
    <div className="app-shell">
      <Sidebar activeItem={activeSection} onSelect={openSection} />
      <main className="main-area">
        <Topbar
          search={search}
          setSearch={setSearch}
          onSampleDataClick={() => notify('This dashboard is using local sample data; no backend is connected.')}
        />
        {showDashboard ? (
          <div className="dashboard-content">
            <DashboardHeader
              company={company}
              setCompany={setCompany}
              fiscalYear={fiscalYear}
              setFiscalYear={setFiscalYear}
              fiscalPeriod={fiscalPeriod}
              setFiscalPeriod={setFiscalPeriod}
              onRefresh={refreshDashboard}
            />

            <section className="summary-cards" aria-label="Accounting summary">
              {summaryCards.map(({ label, value, icon: Icon, tone, target }) => (
                <article key={label} className={`summary-card ${tone}`}>
                  <span className="summary-icon"><Icon size={21} strokeWidth={2.2} /></span>
                  <div className="summary-copy">
                    <h2>{label}</h2>
                    <strong>{value}</strong>
                  </div>
                  <button type="button" className="text-link" onClick={() => openSection(target)}>
                    View All <ArrowRight size={12} />
                  </button>
                </article>
              ))}
            </section>

            <div className="dashboard-columns">
              <div className="primary-column">
                <section className="panel transactions-panel">
                  <div className="panel-heading">
                    <div>
                      <h2>Recent Transactions</h2>
                    </div>
                    <button type="button" className="text-link" onClick={() => notify('Showing the latest transactions.')}>
                      View All <ArrowRight size={12} />
                    </button>
                  </div>
                  <div className="transaction-table-wrap">
                    <table className="transaction-table">
                      <thead>
                        <tr>
                          <th>Date</th>
                          <th>Document No.</th>
                          <th>Module</th>
                          <th>Description</th>
                          <th className="amount-cell">Amount</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredTransactions.map((transaction) => (
                          <tr key={`${transaction.documentNo}-${transaction.date}`}>
                            <td>{transaction.date}</td>
                            <td className="document-number">{transaction.documentNo}</td>
                            <td>{transaction.module}</td>
                            <td>{transaction.description}</td>
                            <td className="amount-cell">{formatRupees(transaction.amount)}</td>
                            <td><span className={`status-pill ${transaction.status.toLowerCase().replace(' ', '-')}`}>{transaction.status}</span></td>
                          </tr>
                        ))}
                        {filteredTransactions.length === 0 && (
                          <tr><td className="empty-state" colSpan={6}>No transactions match “{search}”.</td></tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </section>

                <section className="panel modules-panel">
                  <div className="panel-heading modules-heading">
                    <div>
                      <h2>FICO Modules</h2>
                      <p>Access and manage all financial operations from here.</p>
                    </div>
                    <button type="button" className="text-link" onClick={() => {
                      setSearch('')
                      notify('Showing all FICO modules.')
                    }}>
                      View All Modules <ArrowRight size={12} />
                    </button>
                  </div>
                  <div className="modules-grid">
                    {filteredModules.map((module) => {
                      const Icon = module.icon
                      const section = module.name === 'GST / Tax' ? 'GST' : module.name
                      return (
                        <button
                          type="button"
                          className="module-card"
                          key={module.name}
                          onClick={() => openSection(section)}
                        >
                          <span className={`module-icon ${module.color}`}><Icon size={17} /></span>
                          <span className="module-copy">
                            <strong>{module.name}</strong>
                            <small>{module.description}</small>
                          </span>
                          <ChevronRight className="module-chevron" size={14} />
                        </button>
                      )
                    })}
                    {filteredModules.length === 0 && <p className="module-empty">No modules match “{search}”.</p>}
                  </div>
                </section>
              </div>

              <aside className="right-column">
                <section className="panel quick-panel">
                  <div className="panel-heading"><h2>Quick Actions</h2></div>
                  <div className="quick-action-list">
                    {quickActions.map(({ label, icon: Icon, color }) => (
                      <button type="button" key={label} className="quick-action" onClick={() => setAction(label)}>
                        <span className={`quick-icon ${color}`}><Icon size={16} /></span>
                        <span>{label}</span>
                        <ChevronRight size={14} className="quick-chevron" />
                      </button>
                    ))}
                  </div>
                </section>

                <section className="panel financial-panel">
                  <div className="panel-heading">
                    <h2>Financial Summary</h2>
                    <label className="period-select">
                      <span className="visually-hidden">Financial summary period</span>
                      <select value={summaryPeriod} onChange={(event) => setSummaryPeriod(event.target.value)}>
                        <option>This Year</option>
                        <option>This Quarter</option>
                        <option>This Month</option>
                      </select>
                      <ChevronDown size={12} />
                    </label>
                  </div>
                  <div className="financial-metrics">
                    {financialMetrics.map(({ label, amount, change, icon: Icon, tone }) => (
                      <article key={label} className="metric-row">
                        <span className={`metric-icon ${tone}`}><Icon size={17} /></span>
                        <div className="metric-copy">
                          <span>{label}</span>
                          <strong>{amount}</strong>
                        </div>
                        <span className="metric-change">{change}</span>
                      </article>
                    ))}
                  </div>
                </section>
              </aside>
            </div>
          </div>
        ) : activeSection === 'Financial Reports' ? (
          <FinancialReportsPage search={search} notify={notify} />
        ) : activeSection === 'Fiscal Period' ? (
          <FiscalPeriodPage
            search={search}
            onRefresh={() => notify('Fiscal period list refreshed.')}
            notify={notify}
          />
        ) : (
          <div className="dashboard-content detail-content">
            <ModuleDetail module={currentModule} onBack={() => setActiveSection('FICO')} />
          </div>
        )}
      </main>

      {action && <ActionModal action={action} onClose={() => setAction(null)} onSubmit={createRecord} />}
      {toast && <div role="status" className="toast"><RefreshCw size={15} />{toast}</div>}
    </div>
  )
}

export default App
