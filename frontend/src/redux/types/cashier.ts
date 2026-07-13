export type PaymentMethod =
  | "cash"
  | "mobile_money"
  | "card"
  | "bank_transfer"
  | "other";

export type CashierSession = {
  session_id: string;
  cashier_user_id: string;
  status: "open" | "closed";
  opening_float: number;
  expected_cash_total?: number | null;
  counted_cash_total?: number | null;
  variance?: number | null;
  close_notes?: string | null;
  opened_at: string;
  closed_at?: string | null;
  cashier_name?: string | null;
  summary?: CashierSessionSummary;
};

export type CashierSessionSummary = {
  session: CashierSession;
  payment_count: number;
  void_count: number;
  collected_total: number;
  voided_total: number;
  by_method: Record<string, number>;
  cash_collected: number;
  opening_float: number;
  expected_cash_in_drawer: number;
  currency: string;
};

export type CashierQueueItem = {
  account_id: string;
  appointment_id: string;
  patient_id: string;
  status: string;
  grand_total: number;
  amount_paid: number;
  balance_due: number;
  currency: string;
  updated_at: string;
  patient_name?: string | null;
  patient_code?: string | null;
  phone_number?: string | null;
  admitted_at?: string | null;
  schedule_date?: string | null;
  schedule_time?: string | null;
  assigned_staff_name?: string | null;
  pending_collection_request?: {
    request_id: string;
    requested_at: string;
    amount_due_at_request: number;
    status: string;
    requester_name?: string | null;
  } | null;
};

export type CashierQueueResponse = {
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  results: CashierQueueItem[];
};

export type PaymentTender = {
  tender_id?: string;
  method: PaymentMethod;
  amount: number;
  reference?: string | null;
  provider?: string | null;
};

export type CashierPaymentRecord = {
  payment_id: string;
  receipt_number: string;
  amount: number;
  currency: string;
  status: string;
  reference_note?: string | null;
  created_at?: string;
  tenders: PaymentTender[];
};

export type CashierAccountDetail = {
  account: {
    account_id: string;
    appointment_id: string;
    patient_id: string;
    status: string;
    subtotal: number;
    discount_total: number;
    tax_total: number;
    grand_total: number;
    amount_paid: number;
    balance_due: number;
    currency: string;
    patient?: {
      full_name?: string;
      phone_number?: string;
      patientProfile?: { patient_code?: string };
    };
    appointment?: {
      admitted_at?: string;
      schedule?: {
        schedule_date?: string;
        start_time?: string;
        end_time?: string;
      };
      staff?: { full_name?: string };
    };
  };
  entries: Array<{
    entry_id: string;
    service_name: string;
    quantity: number;
    unit_price: number;
    line_tax_amount: number;
    line_total: number;
    tax_percent: number;
  }>;
  summary: {
    subtotal: number;
    tax_total: number;
    discount_total: number;
    grand_total: number;
    amount_paid?: number;
    balance_due?: number;
  };
  payments: CashierPaymentRecord[];
};

export type CashierReceipt = {
  payment_id: string;
  receipt_number: string;
  status: string;
  amount: number;
  currency: string;
  paid_at: string;
  reference_note?: string | null;
  cashier_name?: string | null;
  patient_name?: string | null;
  patient_code?: string | null;
  appointment_at?: string | null;
  account_grand_total: number;
  previously_paid: number;
  balance_due: number;
  entries: Array<{
    service_name: string;
    quantity: number;
    unit_price: number;
    line_total: number;
  }>;
  tenders: PaymentTender[];
  html: string;
};

export type CashierPaymentLedgerItem = {
  payment_id: string;
  receipt_number: string;
  account_id: string;
  appointment_id: string;
  patient_id: string;
  amount: number;
  currency: string;
  status: string;
  reference_note?: string | null;
  created_at: string;
  patient_name?: string | null;
  patient_code?: string | null;
  cashier_name?: string | null;
  cashier_user_id?: string;
  session_id?: string;
  tenders: PaymentTender[];
  account_status?: string | null;
  account_grand_total?: number | null;
  account_balance_due?: number | null;
};

export type CashierPaymentLedgerResponse = {
  total: number;
  totalPages: number;
  currentPage: number;
  limit: number;
  total_amount: number;
  by_method?: Record<string, number>;
  by_cashier?: Record<string, number>;
  results: CashierPaymentLedgerItem[];
};

export type BillingSummary = {
  account_id: string;
  appointment_id: string;
  status: string;
  grand_total: number;
  amount_paid: number;
  balance_due: number;
  currency: string;
};
