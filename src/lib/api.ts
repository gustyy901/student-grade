const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

function getAuthHeaders(): Record<string, string> {
  const token = localStorage.getItem("auth_token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function fetchAPI(endpoint: string, options: RequestInit = {}) {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...getAuthHeaders(),
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || 'Request failed');
  }

  return response.json();
}

// Students API
export const studentsAPI = {
  getAll: () => fetchAPI('/siswa'),
  create: (data: any) =>
    fetchAPI('/siswa', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    fetchAPI(`/siswa/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/siswa/${id}`, { method: 'DELETE' }),
};

// Subjects API
export const subjectsAPI = {
  getAll: () => fetchAPI('/mapel'),
  create: (data: any) =>
    fetchAPI('/mapel', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: any) =>
    fetchAPI(`/mapel/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/mapel/${id}`, { method: 'DELETE' }),
};

// Grades API - with separate endpoints for Tugas/UTS/UAS
export const gradesAPI = {
  getAll: async () => {
    const [tugas, uts, uas] = await Promise.all([
      fetchAPI('/nilai/tugas'),
      fetchAPI('/nilai/uts'),
      fetchAPI('/nilai/uas'),
    ]);
    return [...tugas, ...uts, ...uas];
  },
  getAllTugas: () => fetchAPI('/nilai/tugas'),
  getAllUts: () => fetchAPI('/nilai/uts'),
  getAllUas: () => fetchAPI('/nilai/uas'),
  
  createTugas: (data: any) =>
    fetchAPI('/nilai/tugas', { method: 'POST', body: JSON.stringify(data) }),
  createUts: (data: any) =>
    fetchAPI('/nilai/uts', { method: 'POST', body: JSON.stringify(data) }),
  createUas: (data: any) =>
    fetchAPI('/nilai/uas', { method: 'POST', body: JSON.stringify(data) }),
  
  updateTugas: (id: string, data: any) =>
    fetchAPI(`/nilai/tugas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateUts: (id: string, data: any) =>
    fetchAPI(`/nilai/uts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  updateUas: (id: string, data: any) =>
    fetchAPI(`/nilai/uas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  
  deleteTugas: (id: string) => fetchAPI(`/nilai/tugas/${id}`, { method: 'DELETE' }),
  deleteUts: (id: string) => fetchAPI(`/nilai/uts/${id}`, { method: 'DELETE' }),
  deleteUas: (id: string) => fetchAPI(`/nilai/uas/${id}`, { method: 'DELETE' }),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => fetchAPI('/dashboard/stats'),
};

// Admin API
export const adminAPI = {
  getSummary: () => fetchAPI('/admin/summary'),
  getTeachers: () => fetchAPI('/admin/teachers'),
  getStudents: () => fetchAPI('/admin/students'),
  getGrades: () => fetchAPI('/admin/grades'),
};

// Auth API
export const authAPI = {
  register: (data: any) =>
    fetchAPI('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data: any) =>
    fetchAPI('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () =>
    fetchAPI('/auth/logout', { method: 'POST' }),
  getProfile: () => fetchAPI('/auth/profile'),
};
