import { useCallback, useEffect, useMemo, useState, type FormEvent } from 'react'
import {
  AlertCircle,
  CalendarDays,
  Check,
  ChevronLeft,
  ChevronRight,
  ChevronsUpDown,
  ClipboardList,
  Clock3,
  Download,
  Edit3,
  Eye,
  Info,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  X,
} from 'lucide-react'
import {
  fiscalPeriodYears,
  formatPeriodDate,
  periodStatuses,
  periodTypes,
  type FiscalPeriod,
  type FiscalPeriodStatus,
  type FiscalPeriodType,
} from '../data/fiscalPeriods'
import { ficoApi, type ApiFiscalPeriod, type FiscalPeriodPayload } from '../api'

type FiscalPeriodPageProps = {
  search: string
  onRefresh: () => void
  notify: (message: string) => void
}

type PeriodForm = Omit<FiscalPeriod, 'id' | 'apiId'>
type ModalMode = 'create' | 'edit' | 'view'
type SortField = 'code' | 'name' | 'fiscalYear' | 'startDate' | 'endDate' | 'periodType' | 'status'

const emptyForm: PeriodForm = {
  code: '',
  name: '',
  fiscalYear: '2026 - 2027',
  startDate: '',
  endDate: '',
  periodType: 'Monthly',
  status: 'Open',
  description: '',
}

const summaryCardConfig = [
  { label: 'Total Periods', icon: CalendarDays, tone: 'blue' },
  { label: 'Open Periods', icon: ClipboardList, tone: 'green' },
  { label: 'Closed Periods', icon: Check, tone: 'purple' },
  { label: 'Upcoming Periods', icon: Clock3, tone: 'orange' },
] as const

function dateBounds(fiscalYear: string) {
  const [startYear, endYear] = fiscalYear.split(' - ')
  return { min: `${startYear}-04-01`, max: `${endYear}-03-31` }
}

function csvValue(value: string) {
  return `"${value.replace(/"/g, '""')}"`
}

function createPeriodCode(periods: FiscalPeriod[], fiscalYear: string) {
  const startYear = fiscalYear.slice(0, 4)
  const usedNumbers = new Set(periods.flatMap((period) => {
    const match = period.code.match(new RegExp(`^FP-${startYear}-(\\d+)$`))
    return match ? [Number(match[1])] : []
  }))
  const nextNumber = Array.from({ length: 12 }, (_, index) => index + 1)
    .find((number) => !usedNumbers.has(number))
  return nextNumber ? `FP-${startYear}-${String(nextNumber).padStart(2, '0')}` : ''
}

function fromApiPeriod(period: ApiFiscalPeriod): FiscalPeriod {
  const startYear = period.fiscal_year.slice(0, 4)
  return {
    id: String(period.id),
    apiId: period.id,
    code: `FP-${startYear}-${String(period.period_number).padStart(2, '0')}`,
    name: period.period_name,
    fiscalYear: period.fiscal_year,
    startDate: period.start_date,
    endDate: period.end_date,
    periodType: period.period_type,
    status: period.status,
    description: period.description || '',
  }
}

function toApiPeriod(period: PeriodForm): FiscalPeriodPayload {
  const match = period.code.match(/^FP-\d{4}-(\d+)$/)
  if (!match) throw new Error('The generated period code is invalid. Close the form and try again.')
  return {
    fiscal_year: period.fiscalYear,
    period_name: period.name.trim(),
    period_number: Number(match[1]),
    start_date: period.startDate,
    end_date: period.endDate,
    period_type: period.periodType,
    status: period.status,
    description: period.description.trim() || null,
  }
}

function validatePeriod(form: PeriodForm) {
  const errors: Partial<Record<keyof PeriodForm, string>> = {}
  if (!form.code) errors.code = 'All 12 period numbers are already in use for this fiscal year.'
  if (!form.name.trim()) errors.name = 'Period name is required.'
  if (!form.fiscalYear) errors.fiscalYear = 'Select a fiscal year.'
  if (!form.periodType) errors.periodType = 'Select a period type.'
  if (!form.startDate) errors.startDate = 'Start date is required.'
  if (!form.endDate) errors.endDate = 'End date is required.'
  if (form.startDate && form.endDate && form.endDate <= form.startDate) {
    errors.endDate = 'End date must be after the start date.'
  }
  if (form.fiscalYear && form.startDate && form.endDate) {
    const bounds = dateBounds(form.fiscalYear)
    if (form.startDate < bounds.min || form.startDate > bounds.max) {
      errors.startDate = `Start date must be within fiscal year ${form.fiscalYear}.`
    }
    if (form.endDate < bounds.min || form.endDate > bounds.max) {
      errors.endDate = `End date must be within fiscal year ${form.fiscalYear}.`
    }
  }
  return errors
}

export default function FiscalPeriodPage({ search, onRefresh, notify }: FiscalPeriodPageProps) {
  const [periods, setPeriods] = useState<FiscalPeriod[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [apiError, setApiError] = useState('')
  const [company, setCompany] = useState('Stackly Technologies')
  const [headerYear, setHeaderYear] = useState('2026 - 2027')
  const [tableSearch, setTableSearch] = useState('')
  const [yearFilter, setYearFilter] = useState('All Fiscal Years')
  const [statusFilter, setStatusFilter] = useState('All Statuses')
  const [typeFilter, setTypeFilter] = useState('All Types')
  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [sortField, setSortField] = useState<SortField>('startDate')
  const [sortAscending, setSortAscending] = useState(true)
  const [modalMode, setModalMode] = useState<ModalMode | null>(null)
  const [selectedPeriod, setSelectedPeriod] = useState<FiscalPeriod | null>(null)
  const [form, setForm] = useState<PeriodForm>(emptyForm)
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof PeriodForm, string>>>({})
  const [deleteTarget, setDeleteTarget] = useState<FiscalPeriod | null>(null)
  const [moreMenuId, setMoreMenuId] = useState<string | null>(null)
  const [moreMenuPosition, setMoreMenuPosition] = useState({ left: 0, top: 0 })

  const loadPeriods = useCallback(async () => {
    setIsLoading(true)
    setApiError('')
    try {
      const result = await ficoApi.getFiscalPeriods()
      setPeriods(result.map(fromApiPeriod))
      return true
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to load Fiscal Periods.'
      setApiError(message)
      return false
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadPeriods()
  }, [loadPeriods])

  const summaryCounts = useMemo(() => ({
    'Total Periods': periods.length,
    'Open Periods': periods.filter((period) => period.status === 'Open').length,
    'Closed Periods': periods.filter((period) => period.status === 'Closed').length,
    'Upcoming Periods': periods.filter((period) => period.status === 'Upcoming').length,
  }), [periods])

  const visiblePeriods = useMemo(() => {
    const query = `${tableSearch} ${search}`.trim().toLowerCase()
    return periods
      .filter((period) => {
        const matchesText = !query || `${period.code} ${period.name}`.toLowerCase().includes(query)
        const matchesYear = yearFilter === 'All Fiscal Years' || period.fiscalYear === yearFilter
        const matchesStatus = statusFilter === 'All Statuses' || period.status === statusFilter
        const matchesType = typeFilter === 'All Types' || period.periodType === typeFilter
        return matchesText && matchesYear && matchesStatus && matchesType
      })
      .sort((a, b) => {
        const result = a[sortField].localeCompare(b[sortField], undefined, { numeric: true })
        return sortAscending ? result : -result
      })
  }, [periods, search, sortAscending, sortField, statusFilter, tableSearch, typeFilter, yearFilter])

  const pageCount = Math.max(1, Math.ceil(visiblePeriods.length / pageSize))
  const currentPage = Math.min(page, pageCount)
  const pagePeriods = visiblePeriods.slice((currentPage - 1) * pageSize, currentPage * pageSize)

  const resetFilters = () => {
    setTableSearch('')
    setYearFilter('All Fiscal Years')
    setStatusFilter('All Statuses')
    setTypeFilter('All Types')
    setPage(1)
  }

  const openCreateModal = () => {
    setSelectedPeriod(null)
    setForm({ ...emptyForm, code: createPeriodCode(periods, headerYear), fiscalYear: headerYear })
    setFormErrors({})
    setModalMode('create')
  }

  const openEditModal = (period: FiscalPeriod) => {
    setSelectedPeriod(period)
    setForm({ ...period })
    setFormErrors({})
    setModalMode('edit')
    setMoreMenuId(null)
  }

  const openViewModal = (period: FiscalPeriod) => {
    setSelectedPeriod(period)
    setModalMode('view')
    setMoreMenuId(null)
  }

  const updateForm = <K extends keyof PeriodForm>(field: K, value: PeriodForm[K]) => {
    setForm((current) => ({ ...current, [field]: value }))
    setFormErrors((current) => ({ ...current, [field]: undefined }))
  }

  const savePeriod = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    const errors = validatePeriod(form)
    setFormErrors(errors)
    if (Object.keys(errors).length > 0) return

    setIsSaving(true)
    setApiError('')
    try {
      if (modalMode === 'edit' && !selectedPeriod?.apiId) {
        throw new Error('This Fiscal Period is missing its database ID. Refresh the list and try again.')
      }
      const payload = toApiPeriod(form)
      const result = modalMode === 'edit' && selectedPeriod?.apiId
        ? await ficoApi.updateFiscalPeriod(selectedPeriod.apiId, payload)
        : await ficoApi.createFiscalPeriod(payload)
      const savedPeriod = fromApiPeriod(result)
      setPeriods((current) => modalMode === 'edit'
        ? current.map((period) => period.apiId === savedPeriod.apiId ? savedPeriod : period)
        : [savedPeriod, ...current])
      if (modalMode !== 'edit') setPage(1)
      notify(`${form.name.trim()} was ${modalMode === 'edit' ? 'updated' : 'created'} successfully.`)
      setModalMode(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to save the Fiscal Period.'
      setApiError(message)
      notify(message)
    } finally {
      setIsSaving(false)
    }
  }

  const changeStatus = async (period: FiscalPeriod, status: FiscalPeriodStatus) => {
    setMoreMenuId(null)
    if (!period.apiId) {
      const message = 'This Fiscal Period is missing its database ID. Refresh the list and try again.'
      setApiError(message)
      notify(message)
      return
    }
    try {
      const updated = await ficoApi.updateFiscalPeriod(period.apiId, toApiPeriod({ ...period, status }))
      setPeriods((current) => current.map((item) => item.apiId === period.apiId ? fromApiPeriod(updated) : item))
      notify(`${period.name} is now ${status.toLowerCase()}.`)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to update the Fiscal Period status.'
      setApiError(message)
      notify(message)
    }
  }

  const confirmDelete = async () => {
    if (!deleteTarget) return
    if (!deleteTarget.apiId) {
      const message = 'This Fiscal Period is missing its database ID. Refresh the list and try again.'
      setApiError(message)
      notify(message)
      return
    }
    try {
      await ficoApi.deleteFiscalPeriod(deleteTarget.apiId)
      setPeriods((current) => current.filter((period) => period.apiId !== deleteTarget.apiId))
      notify(`${deleteTarget.name} was deleted.`)
      setDeleteTarget(null)
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unable to delete the Fiscal Period.'
      setApiError(message)
      notify(message)
    }
  }

  const exportCsv = () => {
    const headers = ['Period Code', 'Period Name', 'Fiscal Year', 'Start Date', 'End Date', 'Period Type', 'Status', 'Description']
    const rows = visiblePeriods.map((period) => [
      period.code,
      period.name,
      period.fiscalYear,
      formatPeriodDate(period.startDate),
      formatPeriodDate(period.endDate),
      period.periodType,
      period.status,
      period.description,
    ])
    const csv = [headers, ...rows].map((row) => row.map((value) => csvValue(String(value))).join(',')).join('\r\n')
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8;' }))
    const link = document.createElement('a')
    link.href = url
    link.download = 'fiscal-periods.csv'
    document.body.appendChild(link)
    link.click()
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 1000)
    notify('Fiscal period list exported to CSV.')
  }

  const sortBy = (field: SortField) => {
    if (field === sortField) setSortAscending((current) => !current)
    else {
      setSortField(field)
      setSortAscending(true)
    }
  }

  const onPeriodRefresh = () => {
    resetFilters()
    void loadPeriods().then((loaded) => {
      if (loaded) onRefresh()
    })
  }

  const fieldError = (field: keyof PeriodForm) => (
    formErrors[field] ? <small className="period-field-error"><AlertCircle size={12} />{formErrors[field]}</small> : null
  )

  return (
    <div className="dashboard-content fiscal-page">
      <section className="dashboard-heading fiscal-heading">
        <div className="heading-copy">
          <h1>Fiscal Period Management</h1>
          <p>Manage accounting periods, period status, and financial transaction availability.</p>
        </div>
        <div className="filter-panel fiscal-header-filters" aria-label="Fiscal period context">
          <label className="filter-control company-filter">
            <span>Company / Organization</span>
            <select value={company} onChange={(event) => setCompany(event.target.value)}>
              <option>Stackly Technologies</option>
              <option>Stackly Global Services</option>
            </select>
          </label>
          <label className="filter-control">
            <span>Fiscal Year</span>
            <select value={headerYear} onChange={(event) => {
              setHeaderYear(event.target.value)
              setYearFilter(event.target.value)
              setPage(1)
            }}>
              {fiscalPeriodYears.map((year) => <option key={year}>{year}</option>)}
            </select>
          </label>
          <button type="button" className="refresh-button" onClick={onPeriodRefresh}>
            <RefreshCw size={14} /><span>Refresh</span>
          </button>
          <button type="button" className="create-period-button" onClick={openCreateModal} disabled={isLoading}>
            <Plus size={15} /><span>Create Fiscal Period</span>
          </button>
        </div>
      </section>

      {apiError && <div className="api-error-banner" role="alert"><AlertCircle size={16} />{apiError}</div>}

      <section className="summary-cards fiscal-summary-cards" aria-label="Fiscal period summary">
        {summaryCardConfig.map(({ label, icon: Icon, tone }) => (
          <article key={label} className={`summary-card ${tone}`}>
            <span className="summary-icon"><Icon size={21} strokeWidth={2.2} /></span>
            <div className="summary-copy">
              <h2>{label}</h2>
              <strong>{summaryCounts[label]}</strong>
            </div>
          </article>
        ))}
      </section>

      <section className="panel fiscal-list-panel">
        <div className="fiscal-list-heading">
          <div className="panel-heading fiscal-panel-title">
            <div>
              <h2>Fiscal Period List</h2>
              <p>Review and manage accounting periods for your organization.</p>
            </div>
            <div className="fiscal-heading-actions">
              <button type="button" className="export-button" onClick={exportCsv}><Download size={14} />Export</button>
            </div>
          </div>
        </div>

        <div className="fiscal-filters">
          <label className="fiscal-search">
            <Search size={15} />
            <input
              aria-label="Search period name or code"
              placeholder="Search period name or code..."
              value={tableSearch}
              onChange={(event) => {
                setTableSearch(event.target.value)
                setPage(1)
              }}
            />
          </label>
          <label className="fiscal-filter-control">
            <span className="visually-hidden">Filter by fiscal year</span>
            <select value={yearFilter} onChange={(event) => {
              setYearFilter(event.target.value)
              setPage(1)
            }}>
              <option>All Fiscal Years</option>
              {fiscalPeriodYears.map((year) => <option key={year}>{year}</option>)}
            </select>
          </label>
          <label className="fiscal-filter-control">
            <span className="visually-hidden">Filter by status</span>
            <select value={statusFilter} onChange={(event) => {
              setStatusFilter(event.target.value)
              setPage(1)
            }}>
              <option>All Statuses</option>
              {periodStatuses.map((status) => <option key={status}>{status}</option>)}
            </select>
          </label>
          <label className="fiscal-filter-control">
            <span className="visually-hidden">Filter by period type</span>
            <select value={typeFilter} onChange={(event) => {
              setTypeFilter(event.target.value)
              setPage(1)
            }}>
              <option>All Types</option>
              {periodTypes.map((type) => <option key={type}>{type}</option>)}
            </select>
          </label>
          <button type="button" className="reset-filter-button" onClick={resetFilters}>Reset Filters</button>
        </div>

        <div className="fiscal-table-wrap">
          <table className="fiscal-table">
            <thead>
              <tr>
                {([
                  ['code', 'Period Code'],
                  ['name', 'Period Name'],
                  ['fiscalYear', 'Fiscal Year'],
                  ['startDate', 'Start Date'],
                  ['endDate', 'End Date'],
                  ['periodType', 'Period Type'],
                  ['status', 'Status'],
                ] as [SortField, string][]).map(([field, label]) => (
                  <th key={field} aria-sort={sortField === field ? (sortAscending ? 'ascending' : 'descending') : 'none'}>
                    <button type="button" className="sort-heading" onClick={() => sortBy(field)}>
                      {label}<ChevronsUpDown size={12} />
                    </button>
                  </th>
                ))}
                <th className="actions-heading">Actions</th>
              </tr>
            </thead>
            <tbody>
              {isLoading ? (
                <tr><td colSpan={8} className="fiscal-empty-state">Loading fiscal periods...</td></tr>
              ) : pagePeriods.map((period) => (
                <tr key={period.id}>
                  <td className="period-code">{period.code}</td>
                  <td className="period-name">{period.name}</td>
                  <td>{period.fiscalYear}</td>
                  <td>{formatPeriodDate(period.startDate)}</td>
                  <td>{formatPeriodDate(period.endDate)}</td>
                  <td><span className="period-type">{period.periodType}</span></td>
                  <td><span className={`period-status ${period.status.toLowerCase()}`}>{period.status}</span></td>
                  <td>
                    <div className="row-actions">
                      <button type="button" className="row-icon-button" aria-label={`View ${period.name}`} title="View" onClick={() => openViewModal(period)}><Eye size={15} /></button>
                      <button type="button" className="row-icon-button" aria-label={`Edit ${period.name}`} title="Edit" onClick={() => openEditModal(period)}><Edit3 size={15} /></button>
                      <div className="period-more-wrap">
                        <button
                          type="button"
                          className="row-icon-button"
                          aria-label={`More actions for ${period.name}`}
                          aria-expanded={moreMenuId === period.id}
                          onClick={(event) => {
                            if (moreMenuId === period.id) {
                              setMoreMenuId(null)
                              return
                            }
                            const bounds = event.currentTarget.getBoundingClientRect()
                            setMoreMenuPosition({
                              left: Math.max(8, Math.min(window.innerWidth - 158, bounds.right - 150)),
                              top: Math.min(window.innerHeight - 145, bounds.bottom + 4),
                            })
                            setMoreMenuId(period.id)
                          }}
                        ><MoreHorizontal size={17} /></button>
                        {moreMenuId === period.id && (
                          <div className="period-more-menu" style={{ left: moreMenuPosition.left, top: moreMenuPosition.top }}>
                            {period.status !== 'Open' && <button type="button" onClick={() => changeStatus(period, 'Open')}>Open Period</button>}
                            {period.status !== 'Closed' && <button type="button" onClick={() => changeStatus(period, 'Closed')}>Close Period</button>}
                            {period.status !== 'Upcoming' && <button type="button" onClick={() => changeStatus(period, 'Upcoming')}>Mark Upcoming</button>}
                            <button type="button" className="delete-menu-item" onClick={() => {
                              setDeleteTarget(period)
                              setMoreMenuId(null)
                            }}><Trash2 size={13} />Delete</button>
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                </tr>
              ))}
              {!isLoading && pagePeriods.length === 0 && (
                <tr><td colSpan={8} className="fiscal-empty-state">No fiscal periods match your search and filters.</td></tr>
              )}
            </tbody>
          </table>
        </div>

        <div className="fiscal-pagination">
          <span className="pagination-count">
            Showing <strong>{visiblePeriods.length === 0 ? 0 : (currentPage - 1) * pageSize + 1}</strong>
            {' '}to <strong>{Math.min(currentPage * pageSize, visiblePeriods.length)}</strong>
            {' '}of <strong>{visiblePeriods.length}</strong> periods
          </span>
          <div className="pagination-controls">
            <label className="rows-per-page">
              <span>Rows per page</span>
              <select value={pageSize} onChange={(event) => {
                setPageSize(Number(event.target.value))
                setPage(1)
              }}>
                {[5, 10, 20].map((value) => <option key={value} value={value}>{value}</option>)}
              </select>
            </label>
            <button type="button" className="page-arrow" aria-label="Previous page" disabled={currentPage <= 1} onClick={() => setPage((current) => Math.max(1, current - 1))}><ChevronLeft size={15} /></button>
            {Array.from({ length: pageCount }, (_, index) => index + 1).map((pageNumber) => (
              <button type="button" key={pageNumber} className={`page-number ${currentPage === pageNumber ? 'active' : ''}`} aria-current={currentPage === pageNumber ? 'page' : undefined} onClick={() => setPage(pageNumber)}>{pageNumber}</button>
            ))}
            <button type="button" className="page-arrow" aria-label="Next page" disabled={currentPage >= pageCount} onClick={() => setPage((current) => Math.min(pageCount, current + 1))}><ChevronRight size={15} /></button>
          </div>
        </div>
      </section>

      <section className="fiscal-information">
        <span className="fiscal-information-icon"><Info size={17} /></span>
        <div>
          <h2>Fiscal Period Information</h2>
          <ul>
            <li>Fiscal periods define the accounting date ranges used for financial transactions.</li>
            <li>Open periods allow permitted financial transactions.</li>
            <li>Closed periods restrict normal posting activities.</li>
            <li>Upcoming periods are prepared for future accounting activity.</li>
          </ul>
        </div>
      </section>

      {modalMode && (
        <div className="modal-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setModalMode(null)
        }}>
          <section className={`fiscal-modal ${modalMode === 'view' ? 'view-period-modal' : ''}`} role="dialog" aria-modal="true" aria-labelledby="period-modal-title">
            <div className="fiscal-modal-header">
              <div className="modal-icon blue"><CalendarDays size={19} /></div>
              <div>
                <h2 id="period-modal-title">{modalMode === 'create' ? 'Create Fiscal Period' : modalMode === 'edit' ? 'Edit Fiscal Period' : 'Fiscal Period Details'}</h2>
                <p>{modalMode === 'view' ? 'Review the fiscal period details.' : 'Set up the accounting date range and period status.'}</p>
              </div>
              <button type="button" className="close-modal" aria-label="Close dialog" onClick={() => setModalMode(null)}><X size={18} /></button>
            </div>

            {modalMode === 'view' && selectedPeriod ? (
              <div className="period-details">
                {([
                  ['Period Code', selectedPeriod.code],
                  ['Period Name', selectedPeriod.name],
                  ['Fiscal Year', selectedPeriod.fiscalYear],
                  ['Period Type', selectedPeriod.periodType],
                  ['Start Date', formatPeriodDate(selectedPeriod.startDate)],
                  ['End Date', formatPeriodDate(selectedPeriod.endDate)],
                  ['Status', selectedPeriod.status],
                  ['Description', selectedPeriod.description || '—'],
                ]).map(([label, value]) => (
                  <div className="period-detail-item" key={label}><span>{label}</span><strong>{value}</strong></div>
                ))}
                <div className="modal-footer"><button type="button" className="primary-button" onClick={() => setModalMode(null)}>Done</button></div>
              </div>
            ) : (
              <form onSubmit={savePeriod} noValidate>
                <div className="period-form-grid">
                  <label className="period-form-field">
                    <span>Period Code <em>Auto-generated</em></span>
                    <input value={form.code} readOnly aria-readonly="true" />
                    {fieldError('code')}
                  </label>
                  <label className="period-form-field">
                    <span>Period Name <b>*</b></span>
                    <input value={form.name} placeholder="e.g. April 2027" onChange={(event) => updateForm('name', event.target.value)} aria-invalid={Boolean(formErrors.name)} />
                    {fieldError('name')}
                  </label>
                  <label className="period-form-field">
                    <span>Fiscal Year <b>*</b></span>
                    <select value={form.fiscalYear} onChange={(event) => {
                      const fiscalYear = event.target.value
                      updateForm('fiscalYear', fiscalYear)
                      if (modalMode === 'create') updateForm('code', createPeriodCode(periods, fiscalYear))
                    }}>
                      {fiscalPeriodYears.map((year) => <option key={year}>{year}</option>)}
                    </select>
                    {fieldError('fiscalYear')}
                  </label>
                  <label className="period-form-field">
                    <span>Period Type <b>*</b></span>
                    <select value={form.periodType} onChange={(event) => updateForm('periodType', event.target.value as FiscalPeriodType)}>
                      {periodTypes.map((type) => <option key={type}>{type}</option>)}
                    </select>
                    {fieldError('periodType')}
                  </label>
                  <label className="period-form-field">
                    <span>Start Date <b>*</b></span>
                    <input type="date" value={form.startDate} onChange={(event) => updateForm('startDate', event.target.value)} aria-invalid={Boolean(formErrors.startDate)} />
                    {fieldError('startDate')}
                  </label>
                  <label className="period-form-field">
                    <span>End Date <b>*</b></span>
                    <input type="date" value={form.endDate} onChange={(event) => updateForm('endDate', event.target.value)} aria-invalid={Boolean(formErrors.endDate)} />
                    {fieldError('endDate')}
                  </label>
                  <label className="period-form-field">
                    <span>Status <b>*</b></span>
                    <select value={form.status} onChange={(event) => updateForm('status', event.target.value as FiscalPeriodStatus)}>
                      {periodStatuses.map((status) => <option key={status}>{status}</option>)}
                    </select>
                  </label>
                  <label className="period-form-field period-description-field">
                    <span>Description <em>Optional</em></span>
                    <textarea rows={3} value={form.description} placeholder="Add notes about this accounting period..." onChange={(event) => updateForm('description', event.target.value)} />
                  </label>
                </div>
                <div className="modal-footer">
                  <button type="button" className="cancel-button" onClick={() => setModalMode(null)} disabled={isSaving}>Cancel</button>
                  <button type="submit" className="primary-button" disabled={isSaving}><Check size={14} />{isSaving ? 'Saving...' : modalMode === 'edit' ? 'Save Changes' : 'Save Fiscal Period'}</button>
                </div>
              </form>
            )}
          </section>
        </div>
      )}

      {deleteTarget && (
        <div className="modal-backdrop fiscal-confirm-backdrop" onMouseDown={(event) => {
          if (event.target === event.currentTarget) setDeleteTarget(null)
        }}>
          <section className="fiscal-confirm-dialog" role="alertdialog" aria-modal="true" aria-labelledby="delete-period-title">
            <div className="confirm-icon"><AlertCircle size={21} /></div>
            <h2 id="delete-period-title">Delete fiscal period?</h2>
            <p><strong>{deleteTarget.name}</strong> ({deleteTarget.code}) will be permanently removed from the Fiscal Period list.</p>
            <div className="modal-footer">
              <button type="button" className="cancel-button" onClick={() => setDeleteTarget(null)}>Cancel</button>
              <button type="button" className="danger-button" onClick={confirmDelete}><Trash2 size={14} />Delete Period</button>
            </div>
          </section>
        </div>
      )}
    </div>
  )
}
