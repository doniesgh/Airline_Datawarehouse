import axios from "axios";

const API = axios.create({
  baseURL: "http://localhost:8000/tss",
});

// ─── Token interceptor ───────────────────────────────────────────────────────
export const TOKEN_KEY = "sv_token";

API.interceptors.request.use((config) => {
  const token = localStorage.getItem(TOKEN_KEY);
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// ─── Auth namespace ──────────────────────────────────────────────────────────
export const auth = {
  signup: (payload) =>
    API.post("/auth/signup", payload).then(r => r.data),
  loginPassword: (email, password) =>
    API.post("/auth/login", { email, password }).then(r => r.data),
  loginFace: (descriptor) =>
    API.post("/auth/verify-face", { descriptor }).then(r => r.data),
  me: () => API.get("/auth/me").then(r => r.data),
  logout: () => API.post("/auth/logout").then(r => r.data).catch(() => ({ ok: true })),
  listUsers: () => API.get("/auth/users").then(r => r.data),
  createUser: (payload) => API.post("/auth/users", payload).then(r => r.data),
  updateRole: (id, role) =>
    API.patch(`/auth/users/${id}/role`, { role }).then(r => r.data),
  deleteUser: (id) => API.delete(`/auth/users/${id}`).then(r => r.data),
  extractDescriptor: (image) =>
    API.post("/auth/extract-descriptor", { image }).then(r => r.data),
};

// ─── NLP namespace ───────────────────────────────────────────────────────────
export const nlp = {
  analyze: (text, travel_type) =>
    API.post("/nlp/analyze", { text, travel_type }).then(r => r.data),
  submitFeedback: (text, travel_type) =>
    API.post("/nlp/submit-feedback", { text, travel_type }).then(r => r.data),
  analyzeBatch: (texts, travel_type) =>
    API.post("/nlp/analyze-batch", { texts, travel_type }).then(r => r.data),
  feed: (params = {}) =>
    API.get("/nlp/feed", { params }).then(r => r.data),
  stats: (airline) =>
    API.get("/nlp/stats", { params: airline ? { airline } : {} }).then(r => r.data),
  dissatisfied: (params = {}) =>
    API.get("/nlp/dissatisfied-customers", { params }).then(r => r.data),
  logAction: (payload) =>
    API.post("/nlp/log-action", payload).then(r => r.data),
  health: () => API.get("/nlp/health").then(r => r.data),
};

// ─── Loyalty namespace ───────────────────────────────────────────────────────
export const loyalty = {
  stats:     () => API.get("/loyalty/stats").then(r => r.data),
  customers: (params = {}) => API.get("/loyalty/customers", { params }).then(r => r.data),
  atRisk:    (limit = 15)  => API.get("/loyalty/at-risk", { params: { limit } }).then(r => r.data),
  topClv:    (limit = 15)  => API.get("/loyalty/top-clv", { params: { limit } }).then(r => r.data),
  score:     (payload)     => API.post("/loyalty/score", payload).then(r => r.data),
  health:    () => API.get("/loyalty/health").then(r => r.data),
};

export default API;
