import { Navigate, useLocation } from "react-router-dom";

import { useAuth } from "../context/useAuth";

export default function RequireAuth({ children }) {
  const { isLoggedIn } = useAuth();
  const location = useLocation();

  if (!isLoggedIn) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }
  return children;
}
