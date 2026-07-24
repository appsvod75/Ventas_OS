import axios from 'axios';

const API_URL = '/api/stats';

export const statsApi = {
    getDashboardStats: () => axios.get(`${API_URL}/dashboard`)
};
