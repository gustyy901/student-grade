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
  getAll: () => fetchAPI('/students'),
  create: (data: { name: string; user_id?: number }) =>
    fetchAPI('/students', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { name: string }) =>
    fetchAPI(`/students/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => fetchAPI(`/students/${id}`, { method: 'DELETE' }),
};

// Subjects API
export const subjectsAPI = {
  getAll: () => fetchAPI('/subjects'),
  create: (data: { name: string; user_id?: number }) =>
    fetchAPI('/subjects', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { name: string }) =>
    fetchAPI(`/subjects/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => fetchAPI(`/subjects/${id}`, { method: 'DELETE' }),
};

// Grades API
export const gradesAPI = {
  getAll: () => fetchAPI('/grades'),
  create: (data: { student_id: number; subject_id: number; score: number; user_id?: number }) =>
    fetchAPI('/grades', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: number, data: { student_id: number; subject_id: number; score: number }) =>
    fetchAPI(`/grades/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: number) => fetchAPI(`/grades/${id}`, { method: 'DELETE' }),
};

// Dashboard API
export const dashboardAPI = {
  getStats: () => fetchAPI('/dashboard/stats'),
};

// Admin API
export const adminAPI = {
  getTeachers: () => fetchAPI('/admin/teachers'),
  getSummary: () => fetchAPI('/admin/summary'),
};
