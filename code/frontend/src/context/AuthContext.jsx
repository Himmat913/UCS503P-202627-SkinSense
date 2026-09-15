import { createContext, useCallback, useContext, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";

import * as auth from "../lib/auth";
import { registerUser, loginUser, logoutUser, fetchMe, setOnSessionExpired, ApiError } from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(auth.getState);
  const navigate = useNavigate();

  useEffect(() => auth.subscribe(setSession), []);

  useEffect(() => {
    setOnSessionExpired(() => navigate("/login"));
  }, [navigate]);

  useEffect(() => {
    if (auth.getAccessToken() && !session.user) {
      fetchMe().catch(() => {});
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const register = useCallback(async (email, password) => {
    await registerUser(email, password);
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      await loginUser(email, password);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        throw new Error("Incorrect email or password.");
      }
      throw err;
    }
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    navigate("/login");
  }, [navigate]);

  return (
    <AuthContext.Provider
      value={{
        user: session.user,
        isLoggedIn: Boolean(session.accessToken),
        register,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth must be used inside <AuthProvider>.");
  return context;
}