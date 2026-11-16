/** Join API URLs consistently via the Next.js BFF proxy unless a base override is supplied. */
export function apiUrl(path: string, base = "/api/bff") {
  return `${base.replace(/\/+$/, "")}/${path.replace(/^\/+/, "")}`;
}
