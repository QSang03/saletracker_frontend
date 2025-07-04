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

export function clearAccessToken() {
  if (typeof document !== "undefined") {
    document.cookie =
      "access_token=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/;";
  }
}
