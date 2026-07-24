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

export interface ClosingMovement {
    id: number;
    time: string;
    type: 'SALE' | 'EXPENSE';
    description: string;
    amount: number;
    user: string;
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

    forceClosing: (date?: string) =>
        api.post(`${API_URL}/force`, { date }),

    getClosingDetails: (date: string, branchId: number) =>
        api.get<ClosingMovement[]>(`${API_URL}/details`, { params: { date, branchId } })
};
