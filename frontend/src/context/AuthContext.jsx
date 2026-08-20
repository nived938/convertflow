import {
  createContext,
  useContext,
  useEffect,
  useState,
} from "react";

import {
  getCurrentUser,
  logout as apiLogout,
} from "../services/api";

const AuthContext =
  createContext(null);

export function AuthProvider({
  children,
}) {
  const [user, setUser] =
    useState(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    checkAuthentication();
  }, []);

  async function checkAuthentication() {
    try {
      const currentUser =
        await getCurrentUser();

      setUser(
        currentUser || null
      );
    } catch {
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  async function logout() {
    try {
      await apiLogout();
    } finally {
      setUser(null);
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated:
          Boolean(user),
        logout,
        refreshUser:
          checkAuthentication,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

// This hook is intentionally exported with the provider for a small auth module.
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
  return useContext(
    AuthContext
  );
}
