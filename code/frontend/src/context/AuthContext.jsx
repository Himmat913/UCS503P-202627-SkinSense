import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";

import * as auth from "../lib/auth";
import { ApiError, fetchMe, loginUser, logoutUser, registerUser, setOnSessionExpired } from "../api/client";
import { AuthContext } from "./contexts";


export function AuthProvider({ children }) {
  const [session, setSession] = useState(auth.getState);
  const navigate = useNavigate();

  useEffect(() => auth.subscribe(setSession), []);

  useEffect(() => {
    setOnSessionExpired(() => navigate("/login", { replace: true }));
  }, [navigate]);

  useEffect(() => {
    if (auth.getAccessToken() && !auth.getState().user) {
      fetchMe().catch(() => {});
    }
  }, []);

  const register = useCallback(async (email, password) => {
    await registerUser(email, password);
    await fetchMe().catch(() => {});
  }, []);

  const login = useCallback(async (email, password) => {
    try {
      await loginUser(email, password);
    } catch (err) {
      if (err instanceof ApiError && err.status === 401) {
        throw new Error("That email and password don't match an account.", { cause: err });
      }
      throw err;
    }
    await fetchMe().catch(() => {});
  }, []);

  const logout = useCallback(async () => {
    await logoutUser();
    navigate("/login", { replace: true });
  }, [navigate]);

  const value = useMemo(
    () => ({
      user: session.user,
      userId: session.user?.id != null ? String(session.user.id) : auth.userIdFromToken(session.accessToken),
      isLoggedIn: Boolean(session.accessToken),
      register,
      login,
      logout,
    }),
    [session, register, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
