import axios from "axios";
import { useAuthStore } from "@/stores/auth-stores";
import { clearTokenRefresh } from "@/lib/tokenRefreshService";

const BASEURL = process.env.NEXT_PUBLIC_API_BASE_URL;

export async function logoutAndRedirect() {
  clearTokenRefresh();
  try {
    await axios.post(`${BASEURL}auth/logout`, {}, { withCredentials: true });
  } catch { /* Best-effort — still clear local state */ }
  
  useAuthStore.getState().logout();
  
  try { 
    sessionStorage.removeItem('auth-storage');
    localStorage.removeItem('auth-storage'); // clean up any legacy data
  } catch {}

  try {
    const keysToRemove: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (
        key?.startsWith("expense-status-") ||
        key?.startsWith("villeto_") ||
        key?.startsWith("line_item_staging:") ||
        key?.startsWith("bill_line_item_staging:")
      ) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(k => localStorage.removeItem(k));
  } catch {}
  
  document.cookie = "villeto_auth=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;";
  
  window.location.href = "/login";
}
