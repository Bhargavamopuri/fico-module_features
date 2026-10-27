import type { LucideIcon } from 'lucide-react'
import {
  Banknote,
  BookOpen,
  BriefcaseBusiness,
  Building2,
  Calculator,
  ChartNoAxesCombined,
  ClipboardList,
  CreditCard,
  FileBarChart,
  FileText,
  Landmark,
  Receipt,
  Scale,
  ShieldCheck,
  Wallet,
} from 'lucide-react'

export type NavigationItem = {
  label: string
  icon: LucideIcon
}

export type Transaction = {
  date: string
  documentNo: string
  module: string
  description: string
  amount: number
  status: 'Posted' | 'Approved' | 'Created' | 'In Progress'
}

export type FicoModule = {
  name: string
  description: string
  icon: LucideIcon
  color: string
}

export const navigationItems: NavigationItem[] = [
  { label: 'Home', icon: Building2 },
  { label: 'FICO', icon: ChartNoAxesCombined },
  { label: 'Company', icon: Building2 },
  { label: 'Fiscal Year', icon: ClipboardList },
  { label: 'Fiscal Period', icon: Calculator },
  { label: 'Chart of Accounts', icon: BookOpen },
  { label: 'Journal Entry', icon: Receipt },
  { label: 'General Ledger', icon: Landmark },
  { label: 'Trial Balance', icon: Scale },
  { label: 'Accounts Payable (AP)', icon: CreditCard },
  { label: 'Accounts Receivable (AR)', icon: Wallet },
  { label: 'Fixed Assets', icon: BriefcaseBusiness },
  { label: 'Budgeting', icon: Banknote },
  { label: 'GST', icon: ShieldCheck },
  { label: 'Financial Reports', icon: FileBarChart },
]

export const transactions: Transaction[] = [
  { date: '10-04-2025', documentNo: 'JE-000123', module: 'Journal Entry', description: 'Rent Expense', amount: 10000, status: 'Posted' },
  { date: '09-04-2025', documentNo: 'AP-000456', module: 'Accounts Payable', description: 'Supplier Invoice', amount: 50000, status: 'Approved' },
  { date: '08-04-2025', documentNo: 'AR-000789', module: 'Accounts Receivable', description: 'Customer Invoice', amount: 75000, status: 'Approved' },
  { date: '07-04-2025', documentNo: 'FA-000321', module: 'Fixed Assets', description: 'Machine Purchase', amount: 500000, status: 'Posted' },
  { date: '06-04-2025', documentNo: 'BG-000654', module: 'Budgeting', description: 'Annual Budget', amount: 1000000, status: 'Created' },
  { date: '05-04-2025', documentNo: 'GL-000987', module: 'General Ledger', description: 'Period Close', amount: 0, status: 'In Progress' },
]

export const ficoModules: FicoModule[] = [
  { name: 'Company', description: 'Manage company and business settings.', icon: Building2, color: 'blue' },
  { name: 'Chart of Accounts', description: 'Maintain COA structure and account controls.', icon: BookOpen, color: 'green' },
  { name: 'Journal Entry', description: 'Record and manage journal entries.', icon: Receipt, color: 'purple' },
  { name: 'General Ledger', description: 'View ledger and trial balance.', icon: FileText, color: 'cyan' },
  { name: 'Trial Balance', description: 'View and manage trial balance reports.', icon: Scale, color: 'blue' },
  { name: 'Accounts Payable', description: 'Handle vendor bills and payments.', icon: CreditCard, color: 'blue' },
  { name: 'Accounts Receivable', description: 'Manage customer invoices and collections.', icon: Wallet, color: 'green' },
  { name: 'Fixed Assets', description: 'Track and manage fixed assets and depreciation.', icon: BriefcaseBusiness, color: 'green' },
  { name: 'Budgeting', description: 'Create and monitor budgets and actuals.', icon: Banknote, color: 'purple' },
  { name: 'GST / Tax', description: 'Manage GST and tax transactions.', icon: ShieldCheck, color: 'cyan' },
  { name: 'Financial Reports', description: 'Generate and view financial reports.', icon: FileBarChart, color: 'orange' },
]

export const companies = ['Stackly Technologies', 'Stackly Global Services']
export const fiscalYears = ['2026 - 2027', '2025 - 2026', '2024 - 2025']
export const fiscalPeriods = ['All Periods', 'April', 'May', 'June', 'July', 'August', 'September']

export const actionOptions = [
  { label: 'Create Journal Entry', icon: Receipt, color: 'blue', fields: ['Entry date', 'Description', 'Debit account', 'Credit account', 'Amount'] },
  { label: 'Create AP Invoice', icon: CreditCard, color: 'green', fields: ['Vendor name', 'Invoice number', 'Invoice date', 'Due date', 'Amount'] },
  { label: 'Create AR Invoice', icon: Wallet, color: 'purple', fields: ['Customer name', 'Invoice number', 'Invoice date', 'Due date', 'Amount'] },
  { label: 'Add Fixed Asset', icon: BriefcaseBusiness, color: 'orange', fields: ['Asset name', 'Asset code', 'Category', 'Purchase date', 'Purchase cost'] },
  { label: 'Create Budget', icon: Banknote, color: 'teal', fields: ['Budget name', 'Fiscal year', 'Period', 'Account', 'Budget amount'] },
  { label: 'Generate Report', icon: FileBarChart, color: 'indigo', fields: ['Report type', 'Fiscal year', 'Period', 'From date', 'To date'] },
]
