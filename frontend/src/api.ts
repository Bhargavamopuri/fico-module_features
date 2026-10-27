const API_BASE_URL = (import.meta.env.VITE_API_URL || 'http://localhost:8000').replace(/\/$/, '')

export type ApiFiscalPeriod = {
  id: number
  fiscal_year: string
  period_name: string
  period_number: number
  start_date: string
  end_date: string
  period_type: 'Monthly' | 'Quarterly' | 'Half-Yearly' | 'Yearly'
  status: 'Open' | 'Closed' | 'Upcoming'
  description: string | null
}

export type FiscalPeriodPayload = Omit<ApiFiscalPeriod, 'id'>

export type ApiFinancialReport = {
  id: number
  report_name: string
  report_type: string
  fiscal_year: string
  period: string
  from_date: string
  to_date: string
  status: string
  report_data: Record<string, unknown> | unknown[] | null
  generated_at: string
  created_at: string
  updated_at: string
}

export type FinancialReportPayload = {
  report_name: string
  report_type: string
  fiscal_year: string
  period: string
  from_date: string
  to_date: string
}

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  let response: Response
  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        Accept: 'application/json',
        ...(init?.body ? { 'Content-Type': 'application/json' } : {}),
        ...init?.headers,
      },
    })
  } catch {
    throw new Error(`Cannot reach the FICO API at ${API_BASE_URL}. Start the backend and check backend/.env.`)
  }

  const body = await response.json().catch(() => null) as { detail?: string | { msg?: string }[]; message?: string } | null
  if (!response.ok) {
    let message = body?.message || (typeof body?.detail === 'string' ? body.detail : '')
    if (!message && Array.isArray(body?.detail)) {
      message = body.detail.map((item) => item.msg || 'Invalid request').join(' ')
    }
    throw new Error(message || `API request failed (${response.status}).`)
  }
  return body as T
}

export const ficoApi = {
  getFiscalPeriods: () => request<ApiFiscalPeriod[]>('/fiscal-periods'),
  createFiscalPeriod: (payload: FiscalPeriodPayload) => request<ApiFiscalPeriod>('/fiscal-period', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  updateFiscalPeriod: (id: number, payload: FiscalPeriodPayload) => request<ApiFiscalPeriod>(`/fiscal-period/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  }),
  deleteFiscalPeriod: (id: number) => request<{ message: string; id: number }>(`/fiscal-period/${id}`, {
    method: 'DELETE',
  }),
  getFinancialReports: () => request<ApiFinancialReport[]>('/financial-reports'),
  generateFinancialReport: (payload: FinancialReportPayload) => request<ApiFinancialReport>('/financial-report/generate', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
  createFinancialReport: (payload: FinancialReportPayload) => request<ApiFinancialReport>('/financial-report', {
    method: 'POST',
    body: JSON.stringify(payload),
  }),
}
