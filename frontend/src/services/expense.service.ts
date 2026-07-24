import api from './api';

export interface Expense {
    id: number;
    description: string;
    amount: number;
    branchId: number;
    userId: number;
    createdAt: string;
    user?: { name: string };
    branch?: { name: string };
}

export const expenseApi = {
    registerExpense: (data: { branchId: number; description: string; amount: number; date?: string }) =>
        api.post('/expenses', data),

    getDailyExpenses: (branchId?: number, date?: string) =>
        api.get<Expense[]>('/expenses/daily', { params: { branchId, date } }),

    updateExpense: (id: number, data: { description: string; amount: number; date?: string }) =>
        api.put(`/expenses/${id}`, data),

    deleteExpense: (id: number) =>
        api.delete(`/expenses/${id}`)
};
