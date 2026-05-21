import {
  createContext,
  useEffect,
  useState
} from "react";

import {
  AUTH_SESSION_EVENT,
  buildUserFromToken,
  clearLoggedOutGuard,
  clearAuthSession,
  getLoggedOutGuard,
  getStoredAccessToken,
  getStoredRefreshToken,
  getStoredUser,
  isJwtExpired,
  setLoggedOutGuard,
  setAuthSession
} from "../utils/authSession";

import {
  logoutUser,
  refreshAccessToken
} from "../services/authService";
import { getCurrentUser } from "../services/authService";

export const AuthContext = createContext();

export default function AuthProvider({
  children
}) {
  const [token, setToken] = useState(() => getStoredAccessToken());
  const [refreshToken, setRefreshToken] = useState(() => getStoredRefreshToken());
  const [user, setUser] = useState(() => getStoredUser());
  const [loggedOut, setLoggedOut] = useState(() => getLoggedOutGuard());
  const [isHydrating, setIsHydrating] = useState(true);

  const applySession = ({ accessToken, refreshToken: nextRefreshToken, user: nextUser }) => {
    const resolvedUser = nextUser || (accessToken ? buildUserFromToken(accessToken) : null);

    setAuthSession({
      accessToken,
      refreshToken: nextRefreshToken,
      user: resolvedUser
    });

    setToken(accessToken || null);
    setRefreshToken(nextRefreshToken || null);
    setUser(resolvedUser);
  };

  const hydrateSession = async () => {
    if (getLoggedOutGuard()) {
      setLoggedOut(true);
      setToken(null);
      setRefreshToken(null);
      setUser(null);
      setIsHydrating(false);
      return;
    }

    const storedAccessToken = getStoredAccessToken();
    const storedRefreshToken = getStoredRefreshToken();
    const storedUser = getStoredUser();

    if (storedAccessToken && !isJwtExpired(storedAccessToken)) {
      applySession({
        accessToken: storedAccessToken,
        refreshToken: storedRefreshToken,
        user: storedUser || buildUserFromToken(storedAccessToken)
      });
      // Fetch authoritative user (role from DB) and update session if available
      try {
        const me = await getCurrentUser();
        if (me) {
          setAuthSession({
            accessToken: storedAccessToken,
            refreshToken: storedRefreshToken,
            user: me
          });
          setUser(me);
        }
      } catch (err) {
        console.error("/me fetch failed during hydrate", err);
      }

      setIsHydrating(false);
      return;
    }

    if (storedRefreshToken) {
      try {
        const session = await refreshAccessToken(storedRefreshToken);

        applySession({
          accessToken: session.access_token,
          refreshToken: session.refresh_token,
          user: session.user
        });
      } catch (error) {
        console.error(error);
        clearAuthSession();
        setToken(null);
        setRefreshToken(null);
        setUser(null);
      } finally {
        setIsHydrating(false);
      }

      return;
    }

    setToken(storedAccessToken || null);
    setRefreshToken(storedRefreshToken || null);
    setUser(storedUser || (storedAccessToken ? buildUserFromToken(storedAccessToken) : null));
    setIsHydrating(false);
  };

  useEffect(() => {
    void hydrateSession();

    const syncSession = () => {
      const loggedOutGuard = getLoggedOutGuard();
      setLoggedOut(loggedOutGuard);

      if (loggedOutGuard) {
        setToken(null);
        setRefreshToken(null);
        setUser(null);
        setIsHydrating(false);
        return;
      }

      setToken(getStoredAccessToken());
      setRefreshToken(getStoredRefreshToken());
      setUser(getStoredUser());
    };

    const handleStorage = () => {
      syncSession();
    };

    const handleAuthSession = () => {
      syncSession();
    };

    const handleFocus = async () => {
      const access = getStoredAccessToken();
      if (!access) return;

      try {
        const me = await getCurrentUser();
        if (me) {
          setAuthSession({
            accessToken: access,
            refreshToken: getStoredRefreshToken(),
            user: me
          });
          setToken(access);
          setUser(me);
        }
      } catch (err) {
        console.error("Failed to refresh /me on focus", err);
      }
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener(AUTH_SESSION_EVENT, handleAuthSession);
    window.addEventListener("focus", handleFocus);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener(AUTH_SESSION_EVENT, handleAuthSession);
      window.removeEventListener("focus", handleFocus);
    };
  }, []);

  const login = (session) => {
    clearLoggedOutGuard();
    setLoggedOut(false);

    if (typeof session === "string") {
      applySession({
        accessToken: session,
        refreshToken: null,
        user: buildUserFromToken(session)
      });
      setIsHydrating(false);
      return;
    }

    applySession({
      accessToken: session?.access_token || session?.accessToken || null,
      refreshToken: session?.refresh_token || session?.refreshToken || null,
      user: session?.user || null
    });

    // Immediately fetch authoritative user after login so UI role is accurate
    (async () => {
      try {
        const me = await getCurrentUser();
        if (me) {
          setAuthSession({
            accessToken: session?.access_token || session?.accessToken || null,
            refreshToken: session?.refresh_token || session?.refreshToken || null,
            user: me
          });
          setUser(me);
        }
      } catch (err) {
        console.error("Failed to fetch /me after login", err);
      }
    })();

    setIsHydrating(false);
  };

  const logout = async () => {
    const currentRefreshToken = refreshToken || getStoredRefreshToken();

    try {
      if (currentRefreshToken) {
        await logoutUser(currentRefreshToken);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoggedOutGuard();
      setLoggedOut(true);
      clearAuthSession();
      setToken(null);
      setRefreshToken(null);
      setUser(null);
      setIsHydrating(false);

      if (window.location.pathname !== "/login") {
        window.location.href = "/login";
      }
    }
  };

  const refreshSession = async () => {
    if (getLoggedOutGuard()) {
      throw new Error("Session refresh skipped after logout");
    }

    const currentRefreshToken = getStoredRefreshToken() || refreshToken;

    if (!currentRefreshToken) {
      throw new Error("Refresh token not available");
    }

    try {
      const session = await refreshAccessToken(currentRefreshToken);

      applySession({
        accessToken: session.access_token,
        refreshToken: session.refresh_token,
        user: session.user
      });

      clearLoggedOutGuard();
      setLoggedOut(false);

      setIsHydrating(false);

      return session;
    } catch (err) {
      // Hard cleanup on refresh failure: clear session and broadcast to all tabs
      clearAuthSession();
      setLoggedOutGuard();
      setLoggedOut(true);
      setToken(null);
      setRefreshToken(null);
      setUser(null);
      setIsHydrating(false);
      // rethrow so callers can handle
      throw err;
    }
  };

  return (

    <AuthContext.Provider
      value={{
        token,
        refreshToken,
        user,
        isHydrating,
        loggedOut,
        login,
        logout,
        refreshSession
      }}
    >

      {children}

    </AuthContext.Provider>
  );
}