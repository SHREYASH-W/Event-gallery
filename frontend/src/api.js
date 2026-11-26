import axios from 'axios';

// In production (Vercel), use the VITE_API_URL env variable
// In development, use empty string so Vite proxy handles /api -> localhost:3000
const baseURL = import.meta.env.VITE_API_URL || '';

const api = axios.create({ baseURL });

export default api;
