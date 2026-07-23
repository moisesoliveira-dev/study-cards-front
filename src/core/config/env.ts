type RuntimeEnv = {
  API_URL?: string;
};

declare global {
  interface Window {
    __ENV__?: RuntimeEnv;
  }
}

const raw =
  window.__ENV__?.API_URL ||
  import.meta.env.VITE_API_URL ||
  'http://localhost:3000/api';

export const env = {
  apiUrl: raw.replace(/\/$/, ''),
};
