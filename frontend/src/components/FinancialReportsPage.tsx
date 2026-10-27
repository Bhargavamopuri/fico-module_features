import { useCallback, useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  ChevronRight,
  Download,
  FileBarChart,
  Plus,
  Printer,
  Search,
  X,
} from 'lucide-react'
import './financialreports/financialreports.css'
import {
  agingBuckets,
  balanceSheetSections,
  budgetActualRows,
  fixedAssets,
  gstTransactions,
  ledgerAccounts,
  ledgerTransactions,
  payables,
  profitLossSections,
  receivables,
  reportDefinitions,
  reportPeriods,
  reportSummaryCards,
  reportYears,
  trialBalanceRows,
  type RecentReport,
  type ReportDefinition,
} from '../data/financialReports'
import { ficoApi, type ApiFinancialReport, type FinancialReportPayload } from '../api'

type ReportFilters = {
  company: string
  fiscalYear: string
  period: string
  fromDate: string
  toDate: string
}

type FinancialReportsPageProps = {
  search: string
  notify: (message: string) => void
}

const initialFilters: ReportFilters = {
  company: 'Stackly Technologies',
  fiscalYear: '2026 - 2027',
  period: 'All Periods',
  fromDate: '2026-04-01',
  toDate: '2027-03-31',
}

const rupees = (amount: number) => `₹ ${new Intl.NumberFormat('en-IN', {
  minimumFractionDigits: 0,
  maximumFractionDigits: 0,
}).format(amount)}`

const amountCell = (amount: number) => (
  <span className="report-amount">{rupees(amount)}</span>
)

const csvEscape = (value: string | number) => `"${String(value).replace(/"/g, '""')}"`

const fiscalYearDates: Record<string, [string, string]> = {
  '2025 - 2026': ['2025-04-01', '2026-03-31'],
  '2026 - 2027': ['2026-04-01', '2027-03-31'],
  '2027 - 2028': ['2027-04-01', '2028-03-31'],
}

function formattedDate(value: string) {
  if (!value) return '—'
  const [year, month, day] = value.split('-')
  return `${day}-${month}-${year}`
}

function getReport(definitionName: string) {
  return reportDefinitions.find((report) => report.name === definitionName)
}

function rowsToCsv(rows: (string | number)[][]) {
  return rows.map((row) => row.map(csvEscape).join(',')).join('\r\n')
}

function downloadCsv(filename: string, rows: (string | number)[][]) {
  const url = URL.createObjectURL(new Blob([`\uFEFF${rowsToCsv(rows)}`], { type: 'text/csv;charset=utf-8;' }))
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  link.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

function fromApiReport(report: ApiFinancialReport): RecentReport {
  const generatedAt = new Date(report.generated_at)
  const generatedOn = Number.isNaN(generatedAt.getTime())
    ? report.generated_at.slice(0, 10).split('-').reverse().join('-')
    : `${String(generatedAt.getDate()).padStart(2, '0')}-${String(generatedAt.getMonth() + 1).padStart(2, '0')}-${generatedAt.getFullYear()}`
  return {
    id: report.id,
    name: report.report_name,
    type: report.report_type === 'GST / Tax Report' ? 'GST / Tax' : report.report_type,
    generatedOn,
    period: report.period === 'All Periods' ? report.fiscal_year : report.period,
    status: report.status,
  }
}

function reportPayload(name: string, type: string, filters: ReportFilters): FinancialReportPayload {
  return {
    report_name: name.trim(),
    report_type: type,
    fiscal_year: filters.fiscalYear,
    period: filters.period,
    from_date: filters.fromDate,
    to_date: filters.toDate,
  }
}

function FinancialTable({ headers, rows, footer }: {
  headers: string[]
  rows: ReactNode[][]
  footer?: ReactNode[]
}) {
  return (
    <div className="report-table-wrap">
      <table className="report-data-table">
        <thead><tr>{headers.map((header) => <th key={header}>{header}</th>)}</tr></thead>
        <tbody>
          {rows.map((row, rowIndex) => (
            <tr key={`${String(row[0])}-${rowIndex}`}>
              {row.map((cell, columnIndex) => <td key={`${rowIndex}-${columnIndex}`}>{cell}</td>)}
            </tr>
          ))}
        </tbody>
        {footer && <tfoot><tr>{footer.map((cell, index) => <td key={index}>{cell}</td>)}</tr></tfoot>}
      </table>
    </div>
  )
}

function StatementGroup({ title, groups, totalLabel, total }: {
  title: string
  groups: { title: string; rows: [string, number][] }[]
  totalLabel: string
  total: number
}) {
  return (
    <section className="statement-column">
      <h3>{title}</h3>
      {groups.map((group) => (
        <div className="statement-group" key={group.title}>
          <h4>{group.title}</h4>
          {group.rows.map(([label, amount]) => (
            <div className="statement-line" key={label}>
              <span>{label}</span><strong>{rupees(amount)}</strong>
            </div>
          ))}
          <div className="statement-subtotal">
            <span>Total {group.title}</span>
            <strong>{rupees(group.rows.reduce((sum, [, amount]) => sum + amount, 0))}</strong>
          </div>
        </div>
      ))}
      <div className="statement-total"><span>{totalLabel}</span><strong>{rupees(total)}</strong></div>
    </section>
  )
}

function ReportDetail({ report, filters, ledgerAccount, setLedgerAccount, onBack, onGenerate, notify }: {
  report: ReportDefinition
  filters: ReportFilters
  ledgerAccount: string
  setLedgerAccount: (account: string) => void
  onBack: () => void
  onGenerate: () => void
  notify: (message: string) => void
}) {
  const reportTitle = report.name
  const selectedLedgerRows = ledgerTransactions[ledgerAccount] || []
  const ledgerRows = selectedLedgerRows.map((transaction, index) => ({
    ...transaction,
    balance: selectedLedgerRows.slice(0, index + 1).reduce((balance, row) => balance + row.debit - row.credit, 0),
  }))
  const currentRevenue = profitLossSections[0].rows.reduce((sum, [, value]) => sum + value, 0)
  const currentExpenses = profitLossSections[1].rows.reduce((sum, [, value]) => sum + value, 0)
  const totalDebit = trialBalanceRows.reduce((sum, row) => sum + row.debit, 0)
  const totalCredit = trialBalanceRows.reduce((sum, row) => sum + row.credit, 0)
  const totalBudget = budgetActualRows.reduce((sum, row) => sum + row.budget, 0)
  const totalActual = budgetActualRows.reduce((sum, row) => sum + row.actual, 0)
  const taxableTotal = gstTransactions.reduce((sum, row) => sum + row.taxable, 0)
  const cgstTotal = gstTransactions.reduce((sum, row) => sum + row.cgst, 0)
  const sgstTotal = gstTransactions.reduce((sum, row) => sum + row.sgst, 0)
  const igstTotal = gstTransactions.reduce((sum, row) => sum + row.igst, 0)

  const exportReport = () => {
    const headers: (string | number)[][] = [
      ['Report', reportTitle],
      ['Company', filters.company],
      ['Fiscal Year', filters.fiscalYear],
      ['Period', filters.period],
      ['From Date', formattedDate(filters.fromDate)],
      ['To Date', formattedDate(filters.toDate)],
      [],
    ]
    let rows: (string | number)[][] = []
    switch (reportTitle) {
      case 'Profit & Loss':
        rows = [
          ['Section', 'Account', 'Amount'],
          ...profitLossSections.flatMap((section) => section.rows.map(([label, amount]) => [section.title, label, amount])),
          ['Total', 'Total Revenue', currentRevenue],
          ['Total', 'Total Expenses', currentExpenses],
          ['Total', 'Net Profit / Loss', currentRevenue - currentExpenses],
        ]
        break
      case 'Balance Sheet':
        rows = [
          ['Section', 'Account', 'Amount'],
          ...balanceSheetSections.flatMap((section) => section.groups.flatMap((group) => group.rows.map(([label, amount]) => [section.title, label, amount]))),
          ['Total', 'Total Assets', balanceSheetSections[0].groups.flatMap((group) => group.rows).reduce((sum, [, amount]) => sum + amount, 0)],
          ['Total', 'Total Liabilities + Equity', balanceSheetSections[1].groups.flatMap((group) => group.rows).reduce((sum, [, amount]) => sum + amount, 0)],
        ]
        break
      case 'Trial Balance':
        rows = [
          ['Account Code', 'Account Name', 'Debit', 'Credit'],
          ...trialBalanceRows.map((row) => [row.code, row.name, row.debit, row.credit]),
          ['Total', '', totalDebit, totalCredit],
        ]
        break
      case 'General Ledger':
        rows = [
          ['Date', 'Document No.', 'Description', 'Debit', 'Credit', 'Balance'],
          ...ledgerRows.map((row) => [row.date, row.document, row.description, row.debit, row.credit, row.balance]),
        ]
        break
      case 'Accounts Receivable':
      case 'Accounts Payable': {
        const entries = reportTitle === 'Accounts Payable' ? payables : receivables
        rows = [
          ['Party', 'Invoice No.', 'Invoice Date', 'Due Date', 'Invoice Amount', 'Paid', 'Outstanding', 'Status'],
          ...entries.map((row) => [row.customer, row.invoice, row.date, row.due, row.amount, row.paid, row.outstanding, row.status]),
        ]
        break
      }
      case 'Cash Flow Statement': {
        const cashRows: [string, string, number][] = [
          ['Operating Activities', 'Customer receipts', 1850000],
          ['Operating Activities', 'Supplier and operating payments', -980000],
          ['Operating Activities', 'Employee payments', -420000],
          ['Investing Activities', 'Purchase of equipment', -385000],
          ['Investing Activities', 'Asset disposal proceeds', 65000],
          ['Financing Activities', 'Loan proceeds', 350000],
          ['Financing Activities', 'Loan repayments', -180000],
          ['Financing Activities', 'Owner contributions', 150000],
        ]
        rows = [
          ['Activity', 'Description', 'Cash Amount'],
          ...cashRows,
          ['Summary', 'Opening Cash Balance', 1250000],
        ]
        break
      }
      case 'Fixed Asset Report':
        rows = [
          ['Asset Code', 'Asset Name', 'Purchase Date', 'Purchase Value', 'Depreciation', 'Net Book Value', 'Status'],
          ...fixedAssets.map((asset) => [asset.code, asset.name, asset.date, asset.cost, asset.depreciation, asset.book, asset.status]),
        ]
        break
      case 'Budget vs Actual':
        rows = [
          ['Account / Category', 'Budget', 'Actual', 'Variance', 'Status'],
          ...budgetActualRows.map((row) => [row.account, row.budget, row.actual, row.budget - row.actual, row.status]),
        ]
        break
      case 'GST / Tax Report':
        rows = [
          ['Date', 'Document No.', 'Party', 'Taxable Amount', 'CGST', 'SGST', 'IGST', 'Total Tax'],
          ...gstTransactions.map((row) => [row.date, row.document, row.party, row.taxable, row.cgst, row.sgst, row.igst, row.cgst + row.sgst + row.igst]),
        ]
        break
    }
    downloadCsv(`${reportTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-')}.csv`, [...headers, ...rows])
    notify(`${reportTitle} exported as CSV.`)
  }

  const statementContent = () => {
    switch (reportTitle) {
      case 'Balance Sheet': {
        const assets = balanceSheetSections[0].groups.flatMap((group) => group.rows)
        const liabilitiesEquity = balanceSheetSections[1].groups.flatMap((group) => group.rows)
        const assetTotal = assets.reduce((sum, [, value]) => sum + value, 0)
        const liabilityEquityTotal = liabilitiesEquity.reduce((sum, [, value]) => sum + value, 0)
        return (
          <div className="statement-grid">
            <StatementGroup title="Assets" groups={balanceSheetSections[0].groups} totalLabel="Total Assets" total={assetTotal} />
            <StatementGroup title="Liabilities & Equity" groups={balanceSheetSections[1].groups} totalLabel="Total Liabilities + Equity" total={liabilityEquityTotal} />
            <div className="statement-equality"><Check size={15} />Balance Sheet is balanced <strong>{rupees(assetTotal)}</strong></div>
          </div>
        )
      }
      case 'Profit & Loss': {
        const revenue = profitLossSections[0].rows.reduce((sum, [, value]) => sum + value, 0)
        const expenses = profitLossSections[1].rows.reduce((sum, [, value]) => sum + value, 0)
        return (
          <>
            <div className="statement-grid">
              {profitLossSections.map((section) => (
                <section className="statement-column" key={section.title}>
                  <h3>{section.title}</h3>
                  <div className="statement-group">
                    {section.rows.map(([label, value]) => <div className="statement-line" key={label}><span>{label}</span><strong>{rupees(value)}</strong></div>)}
                    <div className="statement-total"><span>Total {section.title}</span><strong>{rupees(section.rows.reduce((sum, [, value]) => sum + value, 0))}</strong></div>
                  </div>
                </section>
              ))}
              <div className="statement-net-profit"><span>Net Profit / Loss</span><strong>{rupees(revenue - expenses)}</strong></div>
            </div>
          </>
        )
      }
      case 'Trial Balance':
        return (
          <FinancialTable
            headers={['Account Code', 'Account Name', 'Debit', 'Credit']}
            rows={trialBalanceRows.map((row) => [row.code, row.name, amountCell(row.debit), amountCell(row.credit)])}
            footer={['', 'Total Debit / Credit', amountCell(totalDebit), amountCell(totalCredit)]}
          />
        )
      case 'General Ledger':
        return (
          <>
            <label className="ledger-account-select"><span>Account Selection</span><select value={ledgerAccount} onChange={(event) => setLedgerAccount(event.target.value)}>{ledgerAccounts.map((account) => <option key={account}>{account}</option>)}</select></label>
            <FinancialTable
              headers={['Date', 'Document No.', 'Description', 'Debit', 'Credit', 'Balance']}
              rows={ledgerRows.map((row) => [row.date, row.document, row.description, amountCell(row.debit), amountCell(row.credit), amountCell(row.balance)])}
              footer={['', '', 'Closing Balance', '', '', amountCell(ledgerRows[ledgerRows.length - 1]?.balance || 0)]}
            />
          </>
        )
      case 'Accounts Receivable':
      case 'Accounts Payable': {
        const payable = reportTitle === 'Accounts Payable'
        const entries = payable ? payables : receivables
        const outstandingTotal = entries.reduce((sum, row) => sum + row.outstanding, 0)
        return (
          <>
            <div className="aging-cards">
              {agingBuckets.map((bucket, index) => {
                const amount = entries.filter((row) => row.age === bucket).reduce((sum, row) => sum + row.outstanding, 0)
                return <div className="aging-card" key={bucket}><span>{bucket}</span><strong>{rupees(amount)}</strong><small>{index === 0 ? 'Not yet due' : 'Past due'}</small></div>
              })}
            </div>
            <FinancialTable
              headers={[payable ? 'Vendor' : 'Customer', 'Invoice No.', 'Invoice Date', 'Due Date', 'Invoice Amount', 'Paid', 'Outstanding', 'Status']}
              rows={entries.map((row) => [row.customer, row.invoice, row.date, row.due, amountCell(row.amount), amountCell(row.paid), amountCell(row.outstanding), <span className={`subledger-status ${row.status === 'Overdue' ? 'overdue' : 'current'}`}>{row.status}</span>])}
              footer={['', '', '', '', '', '', amountCell(outstandingTotal), 'Total Outstanding']}
            />
          </>
        )
      }
      case 'Cash Flow Statement': {
        const activityGroups: { title: string; rows: [string, number][] }[] = [
          { title: 'Operating Activities', rows: [['Customer receipts', 1850000], ['Supplier and operating payments', -980000], ['Employee payments', -420000]] },
          { title: 'Investing Activities', rows: [['Purchase of equipment', -385000], ['Asset disposal proceeds', 65000]] },
          { title: 'Financing Activities', rows: [['Loan proceeds', 350000], ['Loan repayments', -180000], ['Owner contributions', 150000]] },
        ]
        const nets = activityGroups.map((group) => group.rows.reduce((sum, [, value]) => sum + value, 0))
        const netChange = nets.reduce((sum, value) => sum + value, 0)
        const opening = 1250000
        return (
          <>
            <div className="cashflow-groups">
              {activityGroups.map((group, index) => (
                <section className="cashflow-card" key={group.title}>
                  <h3>{group.title}</h3>
                  {group.rows.map(([label, value]) => <div className="statement-line" key={label}><span>{label}</span><strong className={Number(value) < 0 ? 'negative-amount' : ''}>{rupees(Number(value))}</strong></div>)}
                  <div className="statement-total"><span>Net cash from {group.title.split(' ')[0].toLowerCase()}</span><strong>{rupees(nets[index])}</strong></div>
                </section>
              ))}
            </div>
            <div className="cashflow-summary">
              <div><span>Opening Cash Balance</span><strong>{rupees(opening)}</strong></div>
              <div><span>Net Change in Cash</span><strong>{rupees(netChange)}</strong></div>
              <div><span>Closing Cash Balance</span><strong>{rupees(opening + netChange)}</strong></div>
            </div>
          </>
        )
      }
      case 'Fixed Asset Report':
        return (
          <FinancialTable
            headers={['Asset Code', 'Asset Name', 'Purchase Date', 'Purchase Value', 'Depreciation', 'Net Book Value', 'Status']}
            rows={fixedAssets.map((asset) => [asset.code, asset.name, asset.date, amountCell(asset.cost), amountCell(asset.depreciation), amountCell(asset.book), <span className="subledger-status current">{asset.status}</span>])}
            footer={['', 'Total', '', amountCell(fixedAssets.reduce((sum, row) => sum + row.cost, 0)), amountCell(fixedAssets.reduce((sum, row) => sum + row.depreciation, 0)), amountCell(fixedAssets.reduce((sum, row) => sum + row.book, 0)), '']}
          />
        )
      case 'Budget vs Actual': {
        const variance = totalBudget - totalActual
        return (
          <>
            <div className="budget-summary">
              <div><span>Total Budget</span><strong>{rupees(totalBudget)}</strong></div>
              <div><span>Total Actual</span><strong>{rupees(totalActual)}</strong></div>
              <div><span>Total Variance</span><strong className={variance < 0 ? 'negative-amount' : ''}>{rupees(variance)}</strong></div>
            </div>
            <FinancialTable
              headers={['Account / Category', 'Budget', 'Actual', 'Variance', 'Status']}
              rows={budgetActualRows.map((row) => {
                const difference = row.budget - row.actual
                const statusTone = row.status.toLowerCase().replace(' ', '-')
                return [row.account, amountCell(row.budget), amountCell(row.actual), amountCell(difference), <span className={`budget-status ${statusTone}`}>{row.status}</span>]
              })}
            />
          </>
        )
      }
      case 'GST / Tax Report': {
        const taxTotal = cgstTotal + sgstTotal + igstTotal
        return (
          <>
            <div className="tax-summary">
              {[
                ['Total Taxable Amount', taxableTotal],
                ['Total CGST', cgstTotal],
                ['Total SGST', sgstTotal],
                ['Total IGST', igstTotal],
                ['Total GST', taxTotal],
              ].map(([label, value]) => <div key={String(label)}><span>{label}</span><strong>{rupees(Number(value))}</strong></div>)}
            </div>
            <FinancialTable
              headers={['Date', 'Document No.', 'Party', 'Taxable Amount', 'CGST', 'SGST', 'IGST', 'Total Tax']}
              rows={gstTransactions.map((row) => [row.date, row.document, row.party, amountCell(row.taxable), amountCell(row.cgst), amountCell(row.sgst), amountCell(row.igst), amountCell(row.cgst + row.sgst + row.igst)])}
              footer={['', '', 'Total', amountCell(taxableTotal), amountCell(cgstTotal), amountCell(sgstTotal), amountCell(igstTotal), amountCell(taxTotal)]}
            />
          </>
        )
      }
      default:
        return null
    }
  }

  return (
    <div className="dashboard-content financial-report-detail-page">
      <button type="button" className="back-link" onClick={onBack}><ArrowLeft size={14} />Back to Financial Reports</button>
      <div className="report-detail-heading">
        <div>
          <h1>{reportTitle}</h1>
          <p>{report.description}</p>
        </div>
        <div className="report-actions">
          <button type="button" className="report-action-button" onClick={onGenerate}><FileBarChart size={14} />Generate Report</button>
          <button type="button" className="report-action-button" onClick={() => window.print()}><Printer size={14} />Print</button>
          <button type="button" className="report-action-button export-report-button" onClick={exportReport}><Download size={14} />Export</button>
        </div>
      </div>
      <section className="report-context-card">
        <div className="report-context-company"><span className="report-context-icon"><Building2 size={17} /></span><div><small>Company / Organization</small><strong>{filters.company}</strong></div></div>
        <div><small>Fiscal Year</small><strong>{filters.fiscalYear}</strong></div>
        <div><small>Period</small><strong>{filters.period}</strong></div>
        <div><small>Date Range</small><strong>{formattedDate(filters.fromDate)} to {formattedDate(filters.toDate)}</strong></div>
      </section>
      <section className="panel report-statement-panel">
        <div className="panel-heading report-statement-heading"><div><h2>{reportTitle}</h2><p>{filters.company} · {filters.fiscalYear} · {filters.period}</p></div><span className="generated-badge"><Check size={12} />Sample Report</span></div>
        {statementContent()}
      </section>
    </div>
  )
}

export default function FinancialReportsPage({ search, notify }: FinancialReportsPageProps) {
  const [filters, setFilters] = useState<ReportFilters>(initialFilters)
  const [appliedFilters, setAppliedFilters] = useState<ReportFilters>(initialFilters)
  const [activeReport, setActiveReport] = useState<ReportDefinition | null>(null)
  const [ledgerAccount, setLedgerAccount] = useState('Cash')
  const [recent, setRecent] = useState<RecentReport[]>([])
  const [isLoadingRecent, setIsLoadingRecent] = useState(true)
  const [isGenerating, setIsGenerating] = useState(false)
  const [apiError, setApiError] = useState('')
  const [newReportOpen, setNewReportOpen] = useState(false)
  const [newReportName, setNewReportName] = useState('Profit & Loss')
  const [newReportType, setNewReportType] = useState('Profit & Loss')

  const loadReports = useCallback(async () => {
    setIsLoadingRecent(true)
    setApiError('')
    try {
      const result = await ficoApi.getFinancialReports()
      setRecent(result.map(fromApiReport))
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load Financial Reports.'
      setApiError(message)
    } finally {
      setIsLoadingRecent(false)
    }
  }, [])

  useEffect(() => {
    void loadReports()
  }, [loadReports])

  const visibleReports = useMemo(() => {
    const query = search.trim().toLowerCase()
    return query
      ? reportDefinitions.filter((report) => `${report.name} ${report.description} ${report.category}`.toLowerCase().includes(query))
      : reportDefinitions
  }, [search])

  const setFilter = <K extends keyof ReportFilters>(key: K, value: ReportFilters[K]) => {
    setFilters((current) => {
      if (key === 'fiscalYear') {
        const [fromDate, toDate] = fiscalYearDates[String(value)] || fiscalYearDates['2026 - 2027']
        return { ...current, fiscalYear: value, fromDate, toDate }
      }
      if (key === 'period' && value !== 'All Periods') {
        const monthNames: Record<string, string> = {
          'April 2026': '04', 'May 2026': '05', 'June 2026': '06', 'July 2026': '07',
          'August 2026': '08', 'September 2026': '09', 'October 2026': '10',
          'November 2026': '11', 'December 2026': '12', 'January 2027': '01',
          'February 2027': '02', 'March 2027': '03',
        }
        const month = monthNames[String(value)]
        const year = String(value).endsWith('2026') ? '2026' : '2027'
        const start = `${year}-${month}-01`
        const endDay = new Date(Number(year), Number(month), 0).getDate()
        return { ...current, period: value, fromDate: start, toDate: `${year}-${month}-${String(endDay).padStart(2, '0')}` }
      }
      if (key === 'period' && value === 'All Periods') {
        const [fromDate, toDate] = fiscalYearDates[current.fiscalYear] || fiscalYearDates['2026 - 2027']
        return { ...current, period: value, fromDate, toDate }
      }
      return { ...current, [key]: value }
    })
  }

  const generateReport = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (filters.fromDate && filters.toDate && filters.fromDate > filters.toDate) {
      notify('From Date must be on or before To Date.')
      return
    }
    setAppliedFilters({ ...filters })
    notify(`Report filters applied for ${filters.company}.`)
  }

  const openReport = (report: ReportDefinition) => {
    setActiveReport(report)
    setLedgerAccount('Cash')
  }

  const createReport = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const report = getReport(newReportType)
    if (!report) return
    if (filters.fromDate && filters.toDate && filters.fromDate > filters.toDate) {
      notify('From Date must be on or before To Date.')
      return
    }
    if (!newReportName.trim()) {
      notify('Enter a report name.')
      return
    }
    const selectedFilters = { ...filters }
    setIsGenerating(true)
    setApiError('')
    try {
      const saved = await ficoApi.generateFinancialReport(
        reportPayload(newReportName, report.name, selectedFilters),
      )
      setRecent((current) => [fromApiReport(saved), ...current])
      setAppliedFilters(selectedFilters)
      setNewReportOpen(false)
      openReport(report)
      notify(`${report.name} generated successfully.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to generate the Financial Report.'
      setApiError(message)
      notify(message)
    } finally {
      setIsGenerating(false)
    }
  }

  const exportRecentReports = () => {
    downloadCsv('recent-financial-reports.csv', [
      ['Report Name', 'Type', 'Generated On', 'Period', 'Status'],
      ...recent.map((report) => [report.name, report.type, report.generatedOn, report.period, report.status]),
    ])
    notify('Recent reports exported to CSV.')
  }

  const regenerateReport = async () => {
    if (!activeReport) return
    setIsGenerating(true)
    setApiError('')
    try {
      const saved = await ficoApi.generateFinancialReport(
        reportPayload(activeReport.name, activeReport.name, appliedFilters),
      )
      setRecent((current) => [fromApiReport(saved), ...current])
      notify(`${activeReport.name} generated for ${appliedFilters.period === 'All Periods' ? appliedFilters.fiscalYear : appliedFilters.period}.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to generate the Financial Report.'
      setApiError(message)
      notify(message)
    } finally {
      setIsGenerating(false)
    }
  }

  if (activeReport) {
    return (
      <>
        <ReportDetail
          report={activeReport}
          filters={appliedFilters}
          ledgerAccount={ledgerAccount}
          setLedgerAccount={setLedgerAccount}
          onBack={() => setActiveReport(null)}
          onGenerate={regenerateReport}
          notify={notify}
        />
      </>
    )
  }

  return (
    <div className="dashboard-content financial-reports-page">
      <section className="dashboard-heading financial-reports-heading">
        <div className="heading-copy">
          <h1>Financial Reports</h1>
          <p>View and generate financial reports</p>
        </div>
        <button type="button" className="create-period-button new-report-button" onClick={() => setNewReportOpen(true)}><Plus size={15} />New Financial Report</button>
      </section>

      {apiError && <div className="api-error-banner" role="alert">{apiError}</div>}

      <section className="summary-cards report-summary-cards" aria-label="Financial report summary">
        {reportSummaryCards.map(({ label, amount, link, tone, icon: Icon }) => (
          <article key={label} className={`summary-card ${tone}`}>
            <span className="summary-icon"><Icon size={21} strokeWidth={2.1} /></span>
            <div className="summary-copy"><h2>{label}</h2><strong>{rupees(amount)}</strong></div>
            <button className="text-link" type="button" onClick={() => {
              const definition = getReport(label === 'Total Assets' ? 'Balance Sheet' : 'Profit & Loss')
              if (definition) openReport(definition)
            }}>{link}<ArrowRight size={12} /></button>
          </article>
        ))}
      </section>

      <section className="panel report-filter-panel">
        <div className="panel-heading"><div><h2>Report Filters</h2><p>Select an entity and reporting date range.</p></div></div>
        <form className="report-filter-form" onSubmit={generateReport}>
          <label className="report-filter-control"><span>Company / Organization</span><select value={filters.company} onChange={(event) => setFilter('company', event.target.value)}><option>Stackly Technologies</option><option>Stackly Global Services</option></select></label>
          <label className="report-filter-control"><span>Fiscal Year</span><select value={filters.fiscalYear} onChange={(event) => setFilter('fiscalYear', event.target.value)}>{reportYears.map((year) => <option key={year}>{year}</option>)}</select></label>
          <label className="report-filter-control"><span>Fiscal Period</span><select value={filters.period} onChange={(event) => setFilter('period', event.target.value)}>{reportPeriods.map((period) => <option key={period}>{period}</option>)}</select></label>
          <label className="report-filter-control"><span>From Date</span><input type="date" value={filters.fromDate} onChange={(event) => setFilter('fromDate', event.target.value)} /></label>
          <label className="report-filter-control"><span>To Date</span><input type="date" value={filters.toDate} onChange={(event) => setFilter('toDate', event.target.value)} /></label>
          <button type="submit" className="refresh-button"><FileBarChart size={14} />Generate Report</button>
        </form>
      </section>

      <section className="report-library-section">
        <div className="report-section-heading"><div><h2>Financial Statements &amp; Subledger Reports</h2><p>Choose a report to view a sample financial statement.</p></div><span>{visibleReports.length} reports</span></div>
        <div className="report-library-grid">
          {visibleReports.map((report) => {
            const Icon = report.icon
            return (
              <button type="button" className="report-library-card" key={report.name} onClick={() => openReport(report)}>
                <span className={`report-library-icon ${report.tone}`}><Icon size={19} /></span>
                <span className="report-library-copy"><strong>{report.name}</strong><small>{report.description}</small><em>{report.category}</em></span>
                <span className="report-library-arrow"><ChevronRight size={15} /></span>
              </button>
            )
          })}
          {visibleReports.length === 0 && <div className="report-search-empty"><Search size={16} />No reports match “{search}”.</div>}
        </div>
      </section>

      <section className="panel recent-reports-panel">
        <div className="panel-heading"><div><h2>Recent Reports</h2><p>Your recently generated financial statements and reports.</p></div><button type="button" className="export-button" onClick={exportRecentReports}><Download size={14} />Export</button></div>
        <div className="report-table-wrap">
          <table className="recent-reports-table">
            <thead><tr><th>Report Name</th><th>Type</th><th>Generated On</th><th>Period</th><th>Status</th><th>Actions</th></tr></thead>
            <tbody>
              {isLoadingRecent ? (
                <tr><td colSpan={6} className="report-empty-row">Loading recent reports...</td></tr>
              ) : recent.map((report) => (
                <tr key={report.id}>
                  <td><button type="button" className="recent-report-link" onClick={() => {
                    const definition = getReport(report.name) || getReport(report.type) || (report.type === 'GST / Tax' ? getReport('GST / Tax Report') : undefined)
                    if (definition) openReport(definition)
                  }}>{report.name}</button></td>
                  <td>{report.type}</td>
                  <td>{report.generatedOn}</td>
                  <td>{report.period}</td>
                  <td><span className="recent-report-status"><Check size={11} />{report.status}</span></td>
                  <td><button type="button" className="recent-open-button" aria-label={`Open ${report.name}`} onClick={() => {
                    const definition = getReport(report.name) || getReport(report.type) || (report.type === 'GST / Tax' ? getReport('GST / Tax Report') : undefined)
                    if (definition) openReport(definition)
                  }}><ArrowRight size={14} /></button></td>
                </tr>
              ))}
              {!isLoadingRecent && recent.length === 0 && <tr><td colSpan={6} className="report-empty-row">No reports generated yet.</td></tr>}
            </tbody>
          </table>
        </div>
      </section>

      {newReportOpen && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setNewReportOpen(false)
        }}>
          <section className="fiscal-modal new-report-modal" role="dialog" aria-modal="true" aria-labelledby="new-report-title">
            <div className="fiscal-modal-header">
              <div className="modal-icon blue"><FileBarChart size={19} /></div>
              <div><h2 id="new-report-title">New Financial Report</h2><p>Choose a report and set the reporting date range.</p></div>
              <button type="button" className="close-modal" aria-label="Close dialog" onClick={() => setNewReportOpen(false)}><X size={18} /></button>
            </div>
            <form onSubmit={createReport}>
              <div className="period-form-grid">
                <label className="period-form-field period-description-field"><span>Report Name</span><input value={newReportName} onChange={(event) => setNewReportName(event.target.value)} required /></label>
                <label className="period-form-field period-description-field"><span>Report Type</span><select value={newReportType} onChange={(event) => {
                  setNewReportType(event.target.value)
                  setNewReportName(event.target.value)
                }}>{reportDefinitions.map((report) => <option key={report.name}>{report.name}</option>)}</select></label>
                <label className="period-form-field"><span>Fiscal Year</span><select value={filters.fiscalYear} onChange={(event) => setFilter('fiscalYear', event.target.value)}>{reportYears.map((year) => <option key={year}>{year}</option>)}</select></label>
                <label className="period-form-field"><span>Fiscal Period</span><select value={filters.period} onChange={(event) => setFilter('period', event.target.value)}>{reportPeriods.map((period) => <option key={period}>{period}</option>)}</select></label>
                <label className="period-form-field"><span>From Date</span><input type="date" value={filters.fromDate} onChange={(event) => setFilter('fromDate', event.target.value)} /></label>
                <label className="period-form-field"><span>To Date</span><input type="date" value={filters.toDate} onChange={(event) => setFilter('toDate', event.target.value)} /></label>
              </div>
              <div className="modal-footer"><button type="button" className="cancel-button" onClick={() => setNewReportOpen(false)} disabled={isGenerating}>Cancel</button><button type="submit" className="primary-button" disabled={isGenerating}><FileBarChart size={14} />{isGenerating ? 'Generating...' : 'Generate Report'}</button></div>
            </form>
          </section>
        </div>
      )}
    </div>
  )
}
