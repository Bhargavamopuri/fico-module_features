export type FiscalPeriodStatus = 'Open' | 'Closed' | 'Upcoming'
export type FiscalPeriodType = 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly'

export type FiscalPeriod = {
  id: string
  apiId?: number
  code: string
  name: string
  fiscalYear: string
  startDate: string
  endDate: string
  periodType: FiscalPeriodType
  status: FiscalPeriodStatus
  description: string
}

export const fiscalPeriodYears = ['2026 - 2027', '2025 - 2026', '2024 - 2025']

export const periodTypes: FiscalPeriodType[] = ['Monthly', 'Quarterly', 'Half-Yearly', 'Yearly']
export const periodStatuses: FiscalPeriodStatus[] = ['Open', 'Closed', 'Upcoming']

export function formatPeriodDate(value: string) {
  const [year, month, day] = value.split('-')
  return `${day}-${month}-${year}`
}
