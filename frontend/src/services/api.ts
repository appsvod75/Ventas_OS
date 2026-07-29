import axios from 'axios';

const api = axios.create({
    baseURL: '/api'
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const authApi = {
    login: (pin: string) => api.post('/auth/login', { pin })
};

export const productApi = {
    getProducts: (branchId?: number, showInactive?: boolean) => api.get('/products', { params: { branch_id: branchId, show_inactive: showInactive } }),
    searchProducts: (q: string) => api.get('/products/search', { params: { q } }),
    getCategories: (showInactive?: boolean) => api.get('/products/categories', { params: { showInactive } }),
    createCategory: (data: { name: string, icon?: string, colorHex?: string }) => api.post('/products/categories', data),
    updateCategory: (id: number, data: { name: string, icon?: string, colorHex?: string }) => api.put(`/products/categories/${id}`, data),
    deleteCategory: (id: number) => api.delete(`/products/categories/${id}`),
    restoreCategory: (id: number) => api.patch(`/products/categories/${id}/restore`),
    getProductById: (id: number) => api.get(`/products/${id}`),
    createProduct: (data: any) => api.post('/products', data),
    updateProduct: (id: number, data: any) => api.put(`/products/${id}`, data),
    deleteProduct: (id: number) => api.delete(`/products/${id}`),
    restoreProduct: (id: number) => api.put(`/products/${id}/restore`),
    deleteProductPermanent: (id: number) => api.delete(`/products/${id}/permanent`)
};

export const branchApi = {
    getBranches: () => api.get('/branches'),
    createBranch: (data: any) => api.post('/branches', data),
    updateBranch: (id: number, data: any) => api.put(`/branches/${id}`, data),
    deleteBranch: (id: number) => api.delete(`/branches/${id}`)
};

export const configApi = {
    getConfig: () => api.get('/config'),
    updateConfig: (data: any) => api.put('/config', data),
    resetSales: (pin: string) => api.post('/config/danger/reset-sales', { pin }),
    resetInventory: (pin: string) => api.post('/config/danger/reset-inventory', { pin }),
    resetProducts: (pin: string) => api.post('/config/danger/reset-products', { pin }),
    resetSaleCounter: (pin: string) => api.post('/config/danger/reset-sale-counter', { pin })
};

export const adminAuthApi = {
    getUsers: () => api.get('/auth/users'),
    createUser: (data: any) => api.post('/auth/users', data),
    updateUser: (id: number, data: any) => api.put(`/auth/users/${id}`, data),
    verifyPin: (pin: string) => api.post('/auth/verify-pin', { pin }),
    getRoles: () => api.get('/auth/roles'),
    getPermissions: () => api.get('/auth/permissions'),
    updateRolePermissions: (roleId: number, permissionKeys: string[]) => api.put(`/auth/roles/${roleId}/permissions`, { permissionKeys })
};

export const providerApi = {
    getProviders: () => api.get('/providers'),
    getProviderById: (id: number) => api.get(`/providers/${id}`),
    createProvider: (data: any) => api.post('/providers', data),
    updateProvider: (id: number, data: any) => api.put(`/providers/${id}`, data),
    deleteProvider: (id: number) => api.delete(`/providers/${id}`)
};

export const clientApi = {
    getClients: () => api.get('/clients'),
    createClient: (data: any) => api.post('/clients', data),
    updateClient: (id: number, data: any) => api.put(`/clients/${id}`, data),
    deleteClient: (id: number) => api.delete(`/clients/${id}`),
    getClientStatement: (id: number) => api.get(`/clients/${id}/statement`)
};

export const purchaseApi = {
    createPurchase: (data: any) => api.post('/purchases', data),
    getPurchases: () => api.get('/purchases'),
    getPurchase: (id: number) => api.get(`/purchases/${id}`),
    getAccountsPayable: () => api.get('/purchases/payable'),
    payPurchase: (id: number, amount: number) => api.post(`/purchases/${id}/pay`, { amount }),
    markAsPaid: (id: number) => api.post(`/purchases/${id}/mark-paid`)
};


export const inventoryApi = {
    createTransfer: (data: any) => api.post('/inventory/transfer', data),
    confirmTransfer: (id: number, data?: any) => api.post(`/inventory/transfer/${id}/confirm`, data),
    getTransfers: (params?: { branchId?: number; status?: string }) => api.get('/inventory/transfers', { params }),
    getTransfer: (id: number) => api.get(`/inventory/transfers/${id}`),
    getProductKardex: (productId: number, branchId: number) => api.get(`/inventory/product/${productId}/kardex/${branchId}`),

    getLowStockReport: (branchId?: number) => api.get('/inventory/reports/low-stock', { params: { branchId } }),
    updateInventory: (branchId: number, productId: number, data: { minStock?: number; maxStock?: number; stockLevel?: number }) => api.put(`/inventory/${branchId}/${productId}`, data)
};

export const saleApi = {
    createSale: (saleData: any) => api.post('/sales', saleData),
    getAccountsReceivable: () => api.get('/sales/receivable'),
    getSalesHistory: (params: any) => api.get('/sales/history', { params }),
    getSaleById: (id: number) => api.get(`/sales/${id}`),
    updateSale: (id: number, data: any) => api.put(`/sales/${id}`, data),
    payAccountReceivable: (id: number, amount: number) => api.post(`/sales/${id}/pay`, { amount }),
    getClientPayments: (id: number) => api.get(`/sales/${id}/payments`),
    reverseSale: (id: number, data: { reason: string; includeShipping: boolean }) => api.post(`/sales/${id}/reverse`, data)
};

export const auditApi = {
    getLogs: (branchId?: number, limit?: number) => api.get('/audit', { params: { branch_id: branchId, limit } })
};

export const statsApi = {
    getDashboardStats: (branchId?: number) => api.get('/stats/dashboard', { params: { branchId } }),
    getReports: (params: { startDate: string; endDate: string; branchId?: number }) => api.get('/stats/reports', { params }),
    getSalesBySeller: (startDate: string, endDate: string, sellerId?: number) => api.get('/stats/sales-by-seller', { params: { startDate, endDate, sellerId } })
};

export const expenseApi = {
    getExpenses: (branchId?: number) => api.get('/expenses', { params: { branchId } }),
    createExpense: (data: any) => api.post('/expenses', data)
};

export const closingApi = {
    getClosings: (branchId?: number) => api.get('/closings', { params: { branchId } }),
    getClosingReport: (branchId: number, date: string) => api.get('/closings/report', { params: { branchId, date } })
};

export const projectionApi = {
    getGoals: (branchId: number) => api.get('/projections/goals', { params: { branchId } }),
    getProjection: (branchId: number, monthYear?: string) => api.get('/projections/projection', { params: { branchId, monthYear } }),
    upsertGoal: (data: any) => api.post('/projections/goals', data)
};

export default api;
