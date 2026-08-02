import axios from "axios";

const API_ORIGIN = import.meta.env.VITE_API_URL ?? "";

export const api = axios.create({
  baseURL: API_ORIGIN,
  withCredentials: true,
});
