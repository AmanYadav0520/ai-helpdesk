import axios from "axios";

const API_ORIGIN = import.meta.env.VITE_API_URL ?? "http://localhost:3001";

export const api = axios.create({
  baseURL: API_ORIGIN,
  withCredentials: true,
});
