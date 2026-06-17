import axios from 'axios';

// Detect if we are in a browser and what the current hostname is
// This helps if the backend is running on the same host but different port
const getBaseURL = () => {
  if (process.env.NEXT_PUBLIC_API_URL) return process.env.NEXT_PUBLIC_API_URL;
  if (typeof window !== 'undefined') {
    const { hostname } = window.location;
    // If we're accessing via IP or local dev, try port 5000 on the same host
    return `http://${hostname}:5000/api`;
  }
  return 'http://localhost:5000/api';
};

const api = axios.create({
  baseURL: getBaseURL(),
});

// Add a request interceptor to include the JWT token
api.interceptors.request.use((config) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`);
  return config;
});

// Add a response interceptor for debugging
api.interceptors.response.use(
  (response) => {
    console.log(`[API Success] ${response.config.url}`, response.data);
    return response;
  },
  (error) => {
    console.error(`[API Error] ${error.config?.url}`, error.response?.data || error.message);
    return Promise.reject(error);
  }
);

export default api;
