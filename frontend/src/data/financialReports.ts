import {
  Banknote,
  BookOpen,
  BriefcaseBusiness,
  ChartNoAxesCombined,
  FileBarChart,
  FileSpreadsheet,
  Landmark,
  Receipt,
  Scale,
  ShieldCheck,
  Wallet,
  type LucideIcon,
} from 'lucide-react'

export type ReportDefinition = {
  name: string
  description: string
  icon: LucideIcon
  tone: string
  category: string
}

export type RecentReport = {
  id: number
  name: string
  type: string
  generatedOn: string
  period: string
  status: string
}

export const reportDefinitions: ReportDefinition[] = [
  { name: 'Profit & Loss', description: 'Shows revenue, expenses and profit or loss for the selected period.', icon: ChartNoAxesCombined, tone: 'blue', category: 'Financial Statement' },
  { name: 'Balance Sheet', description: 'Shows assets, liabilities and equity of the company.', icon: Scale, tone: 'purple', category: 'Financial Statement' },
  { name: 'Trial Balance', description: 'Displays debit and credit balances of all accounts.', icon: FileSpreadsheet, tone: 'green', category: 'Accounting' },
  { name: 'General Ledger', description: 'Provides detailed transactions for each account.', icon: BookOpen, tone: 'cyan', category: 'Accounting' },
  { name: 'Accounts Receivable', description: 'Shows customer outstanding amounts and aging schedule.', icon: Wallet, tone: 'blue', category: 'Subledger' },
  { name: 'Accounts Payable', description: 'Shows vendor outstanding amounts and due dates.', icon: Receipt, tone: 'orange', category: 'Subledger' },
  { name: 'Cash Flow Statement', description: 'Shows cash inflow and outflow of the company.', icon: Banknote, tone: 'green', category: 'Financial Statement' },
  { name: 'Fixed Asset Report', description: 'Shows asset values and depreciation details.', icon: BriefcaseBusiness, tone: 'purple', category: 'Subledger' },
  { name: 'Budget vs Actual', description: 'Compares budgeted amounts with actuals.', icon: FileBarChart, tone: 'orange', category: 'Management' },
  { name: 'GST / Tax Report', description: 'Shows tax-related transactions and GST details.', icon: ShieldCheck, tone: 'cyan', category: 'Tax' },
]

export const reportPeriods = [
  'All Periods',
  'April 2026',
  'May 2026',
  'June 2026',
  'July 2026',
  'August 2026',
  'September 2026',
  'October 2026',
  'November 2026',
  'December 2026',
  'January 2027',
  'February 2027',
  'March 2027',
]

export const reportYears = ['2025 - 2026', '2026 - 2027', '2027 - 2028']

export const reportSummaryCards = [
  { label: 'Total Revenue', amount: 4825000, link: 'Showing All', tone: 'blue', icon: ChartNoAxesCombined },
  { label: 'Total Expenses', amount: 2680000, link: 'Filter Expenses', tone: 'green', icon: Banknote },
  { label: 'Net Profit (PAT)', amount: 2145000, link: 'Filter Margin', tone: 'purple', icon: Landmark },
  { label: 'Total Assets', amount: 7700000, link: 'Special Accounts', tone: 'orange', icon: BriefcaseBusiness },
]

export const balanceSheetSections: {
  title: string
  groups: { title: string; rows: [string, number][] }[]
}[] = [
  {
    title: 'Assets',
    groups: [
      { title: 'Current Assets', rows: [['Cash and Bank', 2245000], ['Accounts Receivable', 975000], ['Inventory', 760000], ['Prepaid Expenses', 120000]] },
      { title: 'Non-Current Assets', rows: [['Fixed Assets', 2100000], ['Property and Equipment', 1200000], ['Other Assets', 300000]] },
    ],
  },
  {
    title: 'Liabilities and Equity',
    groups: [
      { title: 'Current Liabilities', rows: [['Accounts Payable', 850000], ['Short-Term Loans', 450000], ['Accrued Expenses', 300000]] },
      { title: 'Non-Current Liabilities', rows: [['Long-Term Loans', 1800000], ['Other Liabilities', 100000]] },
      { title: 'Equity', rows: [['Share Capital', 2000000], ['Retained Earnings', 1055000], ['Current Year Profit', 1145000]] },
    ],
  },
]

export const profitLossSections: { title: string; rows: [string, number][] }[] = [
  { title: 'Revenue', rows: [['Sales Revenue', 4550000], ['Other Income', 275000]] },
  { title: 'Expenses', rows: [['Purchase Expenses', 1250000], ['Salary Expenses', 700000], ['Rent Expenses', 300000], ['Utilities', 95000], ['Depreciation', 185000], ['Other Expenses', 150000]] },
]

export const trialBalanceRows = [
  { code: '1001', name: 'Cash', debit: 825000, credit: 0 },
  { code: '1002', name: 'Bank', debit: 1420000, credit: 0 },
  { code: '1100', name: 'Accounts Receivable', debit: 975000, credit: 0 },
  { code: '1200', name: 'Inventory', debit: 760000, credit: 0 },
  { code: '1500', name: 'Fixed Assets', debit: 2100000, credit: 0 },
  { code: '2001', name: 'Accounts Payable', debit: 0, credit: 850000 },
  { code: '2100', name: 'Long-Term Loans', debit: 0, credit: 155000 },
  { code: '3001', name: 'Capital', debit: 0, credit: 2000000 },
  { code: '4001', name: 'Sales', debit: 0, credit: 4550000 },
  { code: '5001', name: 'Purchase', debit: 1250000, credit: 0 },
  { code: '5100', name: 'Salary Expense', debit: 350000, credit: 0 },
  { code: '5200', name: 'Rent Expense', debit: 150000, credit: 0 },
  { code: '5300', name: 'Other Income', debit: 0, credit: 275000 },
]

export const ledgerAccounts = ['Cash', 'Bank', 'Sales', 'Purchase', 'Accounts Receivable', 'Accounts Payable']

export const ledgerTransactions: Record<string, { date: string; document: string; description: string; debit: number; credit: number }[]> = {
  Cash: [
    { date: '01-04-2026', document: 'OP-2026-001', description: 'Opening balance', debit: 500000, credit: 0 },
    { date: '04-04-2026', document: 'RC-2026-018', description: 'Customer receipt - Northwind Traders', debit: 275000, credit: 0 },
    { date: '06-04-2026', document: 'PV-2026-027', description: 'Office rent payment', debit: 0, credit: 85000 },
    { date: '10-04-2026', document: 'RC-2026-036', description: 'Retail sales collection', debit: 185000, credit: 0 },
  ],
  Bank: [
    { date: '01-04-2026', document: 'OP-2026-002', description: 'Opening bank balance', debit: 1200000, credit: 0 },
    { date: '03-04-2026', document: 'RC-2026-012', description: 'Customer invoice collection', debit: 350000, credit: 0 },
    { date: '07-04-2026', document: 'PV-2026-029', description: 'Supplier payment', debit: 0, credit: 220000 },
    { date: '10-04-2026', document: 'JV-2026-043', description: 'Bank interest received', debit: 12000, credit: 0 },
  ],
  Sales: [
    { date: '02-04-2026', document: 'AR-2026-101', description: 'Product sales - Northwind Traders', debit: 0, credit: 485000 },
    { date: '05-04-2026', document: 'AR-2026-114', description: 'Service revenue - Alpine Group', debit: 0, credit: 325000 },
    { date: '08-04-2026', document: 'AR-2026-126', description: 'Product sales - Contoso Ltd', debit: 0, credit: 615000 },
  ],
  Purchase: [
    { date: '02-04-2026', document: 'AP-2026-044', description: 'Inventory purchase - Acme Supply', debit: 350000, credit: 0 },
    { date: '06-04-2026', document: 'AP-2026-059', description: 'Raw material purchase', debit: 420000, credit: 0 },
    { date: '09-04-2026', document: 'AP-2026-071', description: 'Office consumables', debit: 95000, credit: 0 },
  ],
  'Accounts Receivable': [
    { date: '03-04-2026', document: 'AR-2026-103', description: 'Invoice - Northwind Traders', debit: 425000, credit: 0 },
    { date: '07-04-2026', document: 'RC-2026-031', description: 'Receipt - Northwind Traders', debit: 0, credit: 275000 },
    { date: '09-04-2026', document: 'AR-2026-128', description: 'Invoice - Alpine Group', debit: 315000, credit: 0 },
  ],
  'Accounts Payable': [
    { date: '02-04-2026', document: 'AP-2026-045', description: 'Invoice - Acme Supply', debit: 0, credit: 350000 },
    { date: '06-04-2026', document: 'PV-2026-029', description: 'Payment - Acme Supply', debit: 220000, credit: 0 },
    { date: '09-04-2026', document: 'AP-2026-072', description: 'Invoice - Metro Office', debit: 0, credit: 128000 },
  ],
}

export const receivables = [
  { customer: 'Northwind Traders', invoice: 'AR-2026-103', date: '03-04-2026', due: '03-05-2026', amount: 425000, paid: 275000, outstanding: 150000, status: 'Partially Paid', age: 'Current' },
  { customer: 'Alpine Group', invoice: 'AR-2026-128', date: '09-04-2026', due: '09-05-2026', amount: 315000, paid: 0, outstanding: 315000, status: 'Open', age: 'Current' },
  { customer: 'Contoso Ltd', invoice: 'AR-2026-087', date: '10-03-2026', due: '09-04-2026', amount: 240000, paid: 40000, outstanding: 200000, status: 'Overdue', age: '1–30 Days' },
  { customer: 'Blue Yonder LLC', invoice: 'AR-2026-052', date: '18-02-2026', due: '20-03-2026', amount: 180000, paid: 0, outstanding: 180000, status: 'Overdue', age: '31–60 Days' },
  { customer: 'Fabrikam Inc', invoice: 'AR-2026-031', date: '20-01-2026', due: '19-02-2026', amount: 120000, paid: 0, outstanding: 120000, status: 'Overdue', age: '61–90 Days' },
]

export const payables = [
  { customer: 'Acme Supply Co.', invoice: 'AP-2026-045', date: '02-04-2026', due: '02-05-2026', amount: 350000, paid: 220000, outstanding: 130000, status: 'Partially Paid', age: 'Current' },
  { customer: 'Metro Office Supplies', invoice: 'AP-2026-072', date: '09-04-2026', due: '09-05-2026', amount: 128000, paid: 0, outstanding: 128000, status: 'Open', age: 'Current' },
  { customer: 'Global Freight Ltd', invoice: 'AP-2026-039', date: '08-03-2026', due: '07-04-2026', amount: 195000, paid: 0, outstanding: 195000, status: 'Overdue', age: '1–30 Days' },
  { customer: 'City Power & Utilities', invoice: 'AP-2026-025', date: '15-02-2026', due: '17-03-2026', amount: 87000, paid: 0, outstanding: 87000, status: 'Overdue', age: '31–60 Days' },
  { customer: 'Pioneer Rentals', invoice: 'AP-2026-014', date: '20-01-2026', due: '19-02-2026', amount: 210000, paid: 0, outstanding: 210000, status: 'Overdue', age: '61–90 Days' },
]

export const agingBuckets = ['Current', '1–30 Days', '31–60 Days', '61–90 Days', 'Above 90 Days']

export const fixedAssets = [
  { code: 'FA-0012', name: 'CNC Production Machinery', date: '15-04-2024', cost: 1850000, depreciation: 277500, book: 1572500, status: 'Active' },
  { code: 'FA-0034', name: 'Computer Equipment', date: '02-08-2024', cost: 480000, depreciation: 120000, book: 360000, status: 'Active' },
  { code: 'FA-0042', name: 'Office Furniture', date: '12-11-2023', cost: 325000, depreciation: 97500, book: 227500, status: 'Active' },
  { code: 'FA-0058', name: 'Delivery Vehicles', date: '21-02-2025', cost: 920000, depreciation: 92000, book: 828000, status: 'Active' },
]

export const budgetActualRows = [
  { account: 'Sales Revenue', budget: 4500000, actual: 4825000, status: 'Over Budget' },
  { account: 'Purchase Expenses', budget: 1400000, actual: 1250000, status: 'Under Budget' },
  { account: 'Salary Expenses', budget: 750000, actual: 700000, status: 'Within Budget' },
  { account: 'Rent Expenses', budget: 300000, actual: 300000, status: 'Within Budget' },
  { account: 'Utilities', budget: 100000, actual: 95000, status: 'Within Budget' },
  { account: 'Capital Expenditure', budget: 600000, actual: 685000, status: 'Over Budget' },
]

export const gstTransactions = [
  { date: '02-04-2026', document: 'AR-2026-101', party: 'Northwind Traders', taxable: 485000, cgst: 43650, sgst: 43650, igst: 0 },
  { date: '05-04-2026', document: 'AP-2026-051', party: 'Acme Supply Co.', taxable: 250000, cgst: 22500, sgst: 22500, igst: 0 },
  { date: '07-04-2026', document: 'AR-2026-114', party: 'Alpine Group', taxable: 325000, cgst: 0, sgst: 0, igst: 58500 },
  { date: '09-04-2026', document: 'AP-2026-072', party: 'Metro Office Supplies', taxable: 128000, cgst: 11520, sgst: 11520, igst: 0 },
]
