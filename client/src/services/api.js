import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json' },
});

// Attach JWT to every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('swiftdrop_token');
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

// Handle 401 globally — redirect to login
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem('swiftdrop_token');
      localStorage.removeItem('swiftdrop_user');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  }
);

// ─── Auth ─────────────────────────────────────────────────────────────────────
export const authAPI = {
  register: (data) => api.post('/auth/register', data),
  login: (data) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  changePassword: (data) => api.put('/auth/change-password', data),
  getMe: () => api.get('/auth/me'),
};

// ─── Events ───────────────────────────────────────────────────────────────────
export const eventsAPI = {
  getAll: () => api.get('/events'),
  getOne: (id) => api.get(`/events/${id}`),
  create: (data) => api.post('/events', data),
  update: (id, data) => api.put(`/events/${id}`, data),
  updateStatus: (id, status) => api.patch(`/events/${id}/status`, { status }),
  getDashboard: (id) => api.get(`/events/${id}/dashboard`),
  getAdminAll: () => api.get('/events/admin/all'),
};

// ─── Purchases ────────────────────────────────────────────────────────────────
export const purchasesAPI = {
  initiate: (data) => api.post('/purchases', data),
  getStatus: (jobId) => api.get(`/purchases/status/${encodeURIComponent(jobId)}`),
  getMyOrders: () => api.get('/purchases/my-orders'),
  simulateLoad: (data) => api.post('/purchases/simulate-load', data),
};

// ─── Users ────────────────────────────────────────────────────────────────────
export const usersAPI = {
  getAll: (params) => api.get('/users', { params }),
  toggleStatus: (id) => api.patch(`/users/${id}/toggle-status`),
  updateProfile: (data) => api.put('/users/profile', data),
};

export default api;