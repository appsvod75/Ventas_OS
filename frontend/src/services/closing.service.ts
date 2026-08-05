import api from './api';

const API_URL = '/closings';

export interface CashClosing {
    id: number;
    date: string;
    branchId: number;
    totalSales: number;
    totalExpenses: number;
    netAmount: number;
    createdAt: string;
    branch?: { name: string };
}

export interface TodaySummary {
    todayStart: string;
    todayEnd: string;
    totalSales: number;
    totalShipping: number;
    totalDiscounts: number;
    grossSales: number;
    totalExpenses: number;
    netAmount: number;
}

export interface PeriodSummary {
    periodLabel: string;
    closingType: string;
    periodStart: string;
    periodEnd: string;
    totalSales: number;
    totalShipping: number;
    totalDiscounts: number;
    grossSales: number;
    totalExpenses: number;
    netAmount: number;
    salesCount: number;
}

export interface ClosingMovement {
    id: number | string;
    time: string;
    type: 'SALE' | 'EXPENSE' | 'PAYMENT';
    method?: string;
    description: string;
    amount: number;
    balance?: number;
    user: string;
}

export interface PaymentBreakdown {
    [key: string]: { count: number; total: number };
}

export interface CashSummary {
    openingAmount: number;
    cashSalesTotal: number;
    cashCreditPayments: number;
    totalExpenses: number;
    cashExpected: number;
}

export interface ClosingDetails {
    movements: ClosingMovement[];
    paymentBreakdown: PaymentBreakdown;
    cashSummary: CashSummary;
}

export const closingApi = {
    getClosings: (params?: { 
        branchId?: number | string; 
        startDate?: string; 
        endDate?: string; 
        page?: number; 
        limit?: number 
    }) => api.get<{ data: CashClosing[], initialBalance: number, pagination: { total: number, page: number, limit: number, totalPages: number } }>(API_URL, { params }),

    getTodaySummary: () =>
        api.get<TodaySummary>(`${API_URL}/today-summary`),

    getPeriodSummary: (branchId?: number) =>
        api.get<PeriodSummary>(`${API_URL}/period-summary`, { params: { branchId } }),

    forceClosing: (date?: string) =>
        api.post(`${API_URL}/force`, { date }),

    getClosingDetails: (date: string, branchId: number) =>
        api.get<ClosingDetails>(`${API_URL}/details`, { params: { date, branchId } })
};
