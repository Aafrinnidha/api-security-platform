import axios from 'axios';

const api = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor for attaching JWT Bearer Token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for handling 401 unauthorized
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      // If token expired, clear and allow auth hook to redirect
      if (window.location.pathname !== '/login' && window.location.pathname !== '/register') {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export const authService = {
  register: (userData) => api.post('/auth/register', userData),
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get('/auth/me'),
};

export const requestService = {
  validate: (requestPayload) => api.post('/requests/validate', requestPayload),
  getAll: (params) => api.get('/requests', { params }),
  getById: (id) => api.get(`/requests/${id}`),
};

export const dashboardService = {
  getStats: () => api.get('/dashboard/stats'),
  getActivity: () => api.get('/dashboard/activity'),
  getStatusDistribution: () => api.get('/dashboard/status-distribution'),
  getClientActivity: () => api.get('/dashboard/client-activity'),
};

export const alertService = {
  getAll: (params) => api.get('/alerts', { params }),
  getById: (id) => api.get(`/alerts/${id}`),
  review: (id, status = 'REVIEWED', notes = '') => api.patch(`/alerts/${id}/review`, { status, notes }),
};

export const automataService = {
  getStates: () => api.get('/automata/states'),
  getTransitions: () => api.get('/automata/transitions'),
  getClientState: (clientId) => api.get(`/automata/client/${clientId}`),
  getAllClients: () => api.get('/automata/clients'),
  resetClient: (clientId) => api.post(`/automata/reset/${clientId}`),
};

export const demoService = {
  seedTraffic: () => api.post('/demo/seed'),
};

export default api;
