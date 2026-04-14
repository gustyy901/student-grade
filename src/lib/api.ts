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

// Grades API - Assignment (Tugas)
export const gradesAPI = {
  // Get all tugas
  getAllTugas: () => fetchAPI('/nilai/tugas'),
  createTugas: (data: { student_id: string; mapel_id: string; semester: string; nilai: number }) =>
    fetchAPI('/nilai/tugas', { method: 'POST', body: JSON.stringify(data) }),
  updateTugas: (id: string, data: { student_id: string; mapel_id: string; semester: string; nilai: number }) =>
    fetchAPI(`/nilai/tugas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteTugas: (id: string) => fetchAPI(`/nilai/tugas/${id}`, { method: 'DELETE' }),

  // Get all UTS (Midterm)
  getAllUts: () => fetchAPI('/nilai/uts'),
  createUts: (data: { student_id: string; mapel_id: string; semester: string; nilai: number }) =>
    fetchAPI('/nilai/uts', { method: 'POST', body: JSON.stringify(data) }),
  updateUts: (id: string, data: { student_id: string; mapel_id: string; semester: string; nilai: number }) =>
    fetchAPI(`/nilai/uts/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUts: (id: string) => fetchAPI(`/nilai/uts/${id}`, { method: 'DELETE' }),

  // Get all UAS (Final)
  getAllUas: () => fetchAPI('/nilai/uas'),
  createUas: (data: { student_id: string; mapel_id: string; semester: string; nilai: number }) =>
    fetchAPI('/nilai/uas', { method: 'POST', body: JSON.stringify(data) }),
  updateUas: (id: string, data: { student_id: string; mapel_id: string; semester: string; nilai: number }) =>
    fetchAPI(`/nilai/uas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteUas: (id: string) => fetchAPI(`/nilai/uas/${id}`, { method: 'DELETE' }),

  // Get detail nilai
  getDetail: () => fetchAPI('/nilai/detail'),
  
  // Legacy fallback (for compatibility)
  getAll: () => fetchAPI('/nilai/tugas'),
  create: (data: { student_id: string; mapel_id: string; semester: string; nilai: number }) =>
    fetchAPI('/nilai/tugas', { method: 'POST', body: JSON.stringify(data) }),
  update: (id: string, data: { student_id: string; mapel_id: string; semester: string; nilai: number }) =>
    fetchAPI(`/nilai/tugas/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  delete: (id: string) => fetchAPI(`/nilai/tugas/${id}`, { method: 'DELETE' }),
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
