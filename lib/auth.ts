// lib/auth.ts

export function getAccessToken(): string | null {
  if (typeof document === "undefined") return null;
  
  try {
    const tokenData = localStorage.getItem('access_token');
    if (!tokenData) {
      return null;
    }

    const parsed = JSON.parse(tokenData);
    
    return parsed;
  } catch (error) {
    console.error('❌ [GetAccessToken] Error parsing localStorage token:', error);
    localStorage.removeItem('access_token');
    return null;
  }
}

export function getAccessTokenShort(): string | null {
  if (typeof document === "undefined") return null;

  const cookies = document.cookie.split(";");
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split("=");
    if (name === "access_token") {
      return decodeURIComponent(value);
    }
  }
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

export function base64UrlDecode(str: string): string {
  str = str.replace(/-/g, "+").replace(/_/g, "/");
  while (str.length % 4) str += "=";
  
  try {
    // Sử dụng TextDecoder để xử lý UTF-8 đúng cách
    const binaryString = atob(str);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new TextDecoder('utf-8').decode(bytes);
  } catch (error) {
    console.error('Error decoding base64 with UTF-8:', error);
    // Fallback to original method
    return atob(str);
  }
}

export function getUserFromToken(token: string): any | null {
  try {
    if (!token || typeof token !== "string") {
      console.log('🔍 [getUserFromToken] No token or invalid token type');
      return null;
    }

    const parts = token.split(".");
    if (parts.length !== 3) {
      console.log('🔍 [getUserFromToken] Invalid token format, parts:', parts.length);
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

    const userData = {
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
    
    return userData;
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
    const cleanToken = token.trim();
    if (!cleanToken) {
      console.error("❌ [SetAccessToken] Empty token provided");
      return;
    }

    // Store full token in localStorage
    localStorage.setItem('access_token', JSON.stringify(cleanToken));
    
    let cookieToken = cleanToken;
    
    if (cleanToken.length > 4000) {
      try {
        const parts = cleanToken.split(".");
        if (parts.length === 3) {
          const payload = JSON.parse(base64UrlDecode(parts[1]));
          // Remove large fields but keep essential ones
          const essentialPayload = {
            sub: payload.sub,
            username: payload.username,
            roles: payload.roles,
            exp: payload.exp,
            zaloLinkStatus: payload.zaloLinkStatus,
            status: payload.status,
            isBlock: payload.isBlock
          };
          
          // Re-encode the essential payload
          const essentialPayloadStr = JSON.stringify(essentialPayload);
          const essentialPayloadBase64 = btoa(unescape(encodeURIComponent(essentialPayloadStr)))
            .replace(/\+/g, "-")
            .replace(/\//g, "_")
            .replace(/=+$/, "");
          
          cookieToken = [parts[0], essentialPayloadBase64, "signature-removed"].join(".");
          
          // Nếu token rút gọn vẫn quá dài, cắt signature và chỉ giữ header + payload
          if (cookieToken.length > 4000) {
            cookieToken = parts[0] + "." + essentialPayloadBase64 + ".short";
          }
          
        }
      } catch (e) {
        console.error("❌ [SetAccessToken] Error creating cookie token:", e);
        // Fallback: tạo một token minimal với chỉ thông tin cần thiết
        try {
          const parts = cleanToken.split(".");
          if (parts.length === 3) {
            const payload = JSON.parse(base64UrlDecode(parts[1]));
            const minimalPayload = {
              sub: payload.sub,
              exp: payload.exp,
              roles: payload.roles || [],
              zaloLinkStatus: payload.zaloLinkStatus || 0
            };
            const minimalPayloadStr = JSON.stringify(minimalPayload);
            const minimalPayloadBase64 = btoa(unescape(encodeURIComponent(minimalPayloadStr)))
              .replace(/\+/g, "-")
              .replace(/\//g, "_")
              .replace(/=+$/, "");
            cookieToken = parts[0] + "." + minimalPayloadBase64 + ".minimal";
          } else {
            cookieToken = "";
          }
        } catch (fallbackError) {
          console.error("❌ [SetAccessToken] Fallback token creation failed:", fallbackError);
          cookieToken = "";
        }
      }
    }

    // Always try to set cookie, even with fallback token
    if (cookieToken) {
      document.cookie = `access_token=${cookieToken}; path=/; max-age=${2147483647}`;
    }
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
    document.cookie = `refresh_token=${encodeURIComponent(token)}; expires=${expiryDate.toUTCString()}; path=/; SameSite=Lax${isHttps ? " Secure" : ""}`;
  }
}

export function clearAccessToken() {
  if (typeof document === "undefined") return;
  localStorage.removeItem('access_token');
  // Xóa cookie access_token_short
  document.cookie = "access_token=; path=/; max-age=0";
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
