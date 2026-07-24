export const getOfflineQueue = () => {
    const queue = localStorage.getItem('offline_sales_queue');
    return queue ? JSON.parse(queue) : [];
};

export const addToOfflineQueue = (saleData: any) => {
    const queue = getOfflineQueue();
    queue.push({ ...saleData, timestamp: new Date().toISOString() });
    localStorage.setItem('offline_sales_queue', JSON.stringify(queue));
};

export const clearOfflineQueue = () => {
    localStorage.removeItem('offline_sales_queue');
};

export const syncOfflineSales = async (api: any) => {
    const queue = getOfflineQueue();
    if (queue.length === 0) return;

    const results = { success: 0, failed: 0 };
    const remaining: any[] = [];

    for (const sale of queue) {
        try {
            await api.post('/sales', sale);
            results.success++;
        } catch (err) {
            results.failed++;
            remaining.push(sale);
        }
    }

    if (remaining.length > 0) {
        localStorage.setItem('offline_sales_queue', JSON.stringify(remaining));
    } else {
        clearOfflineQueue();
    }

    return results;
};
