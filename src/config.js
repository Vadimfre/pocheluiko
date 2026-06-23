const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://127.0.0.1:5001';

export const API_ENDPOINTS = {
  RESERVES: `${API_BASE_URL}/api/reserves`,
  RESERVE: (id) => `${API_BASE_URL}/api/reserves/${id}`,
  HEALTH: `${API_BASE_URL}/api/health`,
};

export default API_BASE_URL;
