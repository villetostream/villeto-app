/** Join raw Axios auth URLs consistently with or without a trailing base slash. */
export function apiUrl(path: string, base = process.env.NEXT_PUBLIC_API_BASE_URL ?? "") {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
