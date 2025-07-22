// lib/auth.ts
export function getAccessToken(): string | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "access_token") {
      return decodeURIComponent(value);
    }
  }

  console.warn("No access_token found in cookies");
  return null;
}

export function getRefreshToken(): string | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "refresh_token") {
      return decodeURIComponent(value);
    }
  }

  return null;
}

export function getUserFromToken(token: string): any | null {
  try {
    if (!token || typeof token !== 'string') {
      return null;
    }
    
    const parts = token.split('.');
    if (parts.length !== 3) {
      return null;
    }
    
    // Decode base64url (JWT uses base64url encoding, not base64)
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    // Pad with = if necessary
    while (base64.length % 4) {
      base64 += '=';
    }
    
    const payload = JSON.parse(atob(base64));

    // Kiểm tra token còn hạn
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return null;
    }

    return {
      id: payload.sub,
      username: payload.username || "",
      fullName: payload.fullName || "",
      status: payload.status || "active",
      isBlock: payload.isBlock ?? false,
      roles: payload.roles || [],
      departments: payload.departments || [],
      server_ip: payload.server_ip,
      permissions: payload.permissions || [],
      zaloLinkStatus: payload.zaloLinkStatus || 0,
      zaloName: payload.zaloName || null,
      avatarZalo: payload.avatarZalo || null,
      employeeCode: payload.employeeCode || "",
      nickName: payload.nickName || "",
      email: payload.email || "",
    };
  } catch (error) {
    console.error("Token decode error:", error);
    return null;
  }
}

export function getUserRolesFromToken(token: string): string[] {
  try {
    if (!token || typeof token !== 'string') {
      return [];
    }
    
    const parts = token.split('.');
    if (parts.length !== 3) {
      return [];
    }
    
    // Decode base64url (JWT uses base64url encoding, not base64)
    let base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    // Pad with = if necessary
    while (base64.length % 4) {
      base64 += '=';
    }
    
    const payload = JSON.parse(atob(base64));

    // Kiểm tra token còn hạn
    if (payload.exp && payload.exp < Date.now() / 1000) {
      return [];
    }

    if (payload.roles && Array.isArray(payload.roles)) {
      return payload.roles.map((role: any) => role.name || role);
    }

    return [];
  } catch (error) {
    console.error("Token decode error:", error);
    return [];
  }
}

export function setAccessToken(token: string) {
  if (typeof document !== "undefined") {
    // Set cookie with 30 days expiry
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    const isHttps = window.location.protocol === "https:";
    document.cookie = `access_token=${encodeURIComponent(token)}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax;${isHttps ? " Secure" : ""}`;
  }
}

export function setRefreshToken(token: string) {
  if (typeof document !== "undefined") {
    // Set cookie with 30 days expiry
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    const isHttps = window.location.protocol === "https:";
    document.cookie = `refresh_token=${encodeURIComponent(token)}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax${isHttps ? " Secure" : ""}`;
  }
}

export function clearAccessToken() {
  if (typeof document !== "undefined") {
    document.cookie =
      "access_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax";
  }
}

export function clearRefreshToken() {
  if (typeof document !== "undefined") {
    document.cookie =
      "refresh_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; SameSite=Lax";
  }
}

export function clearAllTokens() {
  clearAccessToken();
  clearRefreshToken();
}
