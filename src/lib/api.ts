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
  create: (data: { nis: string; nama: string; kelas: string; jenis_kelamin: string }) =>
    fetchAPI('/siswa', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { nis: string; nama: string; kelas: string; jenis_kelamin: string }) =>
    fetchAPI(`/siswa/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/siswa/${id}`, { method: 'DELETE' }),
};

// Subjects API
export const subjectsAPI = {
  getAll: () => fetchAPI('/mapel'),
  create: (data: { nama_mapel: string }) =>
    fetchAPI('/mapel', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { nama_mapel: string }) =>
    fetchAPI(`/mapel/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/mapel/${id}`, { method: 'DELETE' }),
};

// Grades API
export const gradesAPI = {
  getAll: () => fetchAPI('/nilai'),
  create: (data: { student_id: string; mapel_id: string; semester: string; nilai: number }) =>
    fetchAPI('/nilai', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { student_id: string; mapel_id: string; semester: string; nilai: number }) =>
    fetchAPI(`/nilai/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/nilai/${id}`, { method: 'DELETE' }),
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
