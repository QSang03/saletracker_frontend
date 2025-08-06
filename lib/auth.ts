// lib/auth.ts
export function getAccessToken(): string | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "access_token") {
      const decodedValue = decodeURIComponent(value);
      return decodedValue.trim(); // Trim whitespace from decoded value
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
      const decodedValue = decodeURIComponent(value);
      return decodedValue.trim(); // Trim whitespace from decoded value
    }
  }

  return null;
}

export function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  return atob(str);
}

export function getUserFromToken(token: string): any | null {
  try {
    if (!token || typeof token !== "string") {
      return null;
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
      return null;
    }

    // Decode base64url (JWT uses base64url encoding, not base64)
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    // Pad with = if necessary
    while (base64.length % 4) {
      base64 += "=";
    }

    const payload = JSON.parse(base64UrlDecode(base64));

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
    if (!token || typeof token !== "string") {
      return [];
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
      return [];
    }

    // Decode base64url (JWT uses base64url encoding, not base64)
    let base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/");
    // Pad with = if necessary
    while (base64.length % 4) {
      base64 += "=";
    }

    const payload = JSON.parse(base64UrlDecode(base64));

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
  if (typeof document === "undefined") return;

  try {
    // Clean và validate token
    const cleanToken = token.trim();
    if (!cleanToken) {
      console.error("❌ [SetAccessToken] Empty token provided");
      return;
    }

    // Set cookie với proper encoding
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    const isHttps = window.location.protocol === "https:";

    const cookieString = `access_token=${encodeURIComponent(
      cleanToken
    )}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax;${
      isHttps ? " Secure" : ""
    }`;

    console.log("🔄 [SetAccessToken] Setting cookie:", {
      tokenLength: cleanToken.length,
      tokenStart: cleanToken.substring(0, 50) + "...",
      cookieLength: cookieString.length,
      isHttps,
      domain: window.location.hostname,
    });

    document.cookie = cookieString;

    // Immediate verification
    setTimeout(() => {
      const verification = getAccessToken();
      console.log("🔍 [SetAccessToken] Immediate verification:", {
        success: !!verification,
        matches: verification === cleanToken,
        verificationLength: verification?.length,
      });

      if (!verification || verification !== cleanToken) {
        console.error("❌ [SetAccessToken] Cookie verification failed");
      }
    }, 100);
  } catch (error) {
    console.error("❌ [SetAccessToken] Error setting token:", error);
  }
}

export function setRefreshToken(token: string) {
  if (typeof document !== "undefined") {
    // Set cookie with 30 days expiry
    const expiryDate = new Date();
    expiryDate.setDate(expiryDate.getDate() + 30);
    const isHttps = window.location.protocol === "https:";
    document.cookie = `refresh_token=${encodeURIComponent(
      token
    )}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax;${
      isHttps ? " Secure" : ""
    }`;
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
