const ACCESS_TOKEN_KEY = "token";
const REFRESH_TOKEN_KEY = "refresh_token";
const USER_KEY = "user";
const LOGGED_OUT_KEY = "auth_logged_out";
export const AUTH_SESSION_EVENT = "auth-session-changed";

const decodeBase64Url = (value) => {
  const normalized = String(value || "").replace(/-/g, "+").replace(/_/g, "/");
  const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");

  return JSON.parse(atob(padded));
};

export const decodeJwtPayload = (token) => {
  if (!token || typeof token !== "string") {
    return null;
  }

  try {
    const payloadPart = token.split(".")[1] || "";
    return decodeBase64Url(payloadPart);
  } catch {
    return null;
  }
};

export const isJwtExpired = (token) => {
  const payload = decodeJwtPayload(token);

  if (!payload?.exp) {
    return true;
  }

  return Date.now() >= Number(payload.exp) * 1000;
};

export const getStoredAccessToken = () => localStorage.getItem(ACCESS_TOKEN_KEY);
export const getStoredRefreshToken = () => localStorage.getItem(REFRESH_TOKEN_KEY);
export const getLoggedOutGuard = () => sessionStorage.getItem(LOGGED_OUT_KEY) === "true";

export const getStoredUser = () => {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || "null");
  } catch {
    return null;
  }
};

export const setAuthSession = ({ accessToken, refreshToken, user }) => {
  sessionStorage.removeItem(LOGGED_OUT_KEY);

  if (accessToken) {
    localStorage.setItem(ACCESS_TOKEN_KEY, accessToken);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }

  if (refreshToken) {
    localStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }

  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }

  window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
};

export const clearAuthSession = () => {
  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  window.dispatchEvent(new Event(AUTH_SESSION_EVENT));
};

export const setLoggedOutGuard = () => {
  sessionStorage.setItem(LOGGED_OUT_KEY, "true");
};

export const clearLoggedOutGuard = () => {
  sessionStorage.removeItem(LOGGED_OUT_KEY);
};

export const buildUserFromToken = (token) => {
  const payload = decodeJwtPayload(token);

  if (!payload) {
    return null;
  }

  return {
    id: payload.user_id,
    email: payload.email,
    // Do not trust role from the token for UI/authorization decisions.
    role: null,
    username: payload.username || payload.email?.split("@")[0] || ""
  };
};