import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import { useEffect } from "react";

import Layout from "./components/Layout";
import RequireAuth from "./components/RequireAuth";
import Analyze from "./pages/Analyze";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Progress from "./pages/Progress";
import Register from "./pages/Register";
import Report from "./pages/Report";
import RoutineBuilder from "./pages/RoutineBuilder";
import { AnalysisProvider } from "./context/AnalysisContext";
import { AuthProvider } from "./context/AuthContext";
import { useAuth } from "./context/useAuth";

function PublicOnly({ children }) {
  const { isLoggedIn } = useAuth();
  return isLoggedIn ? <Navigate to="/analyze" replace /> : children;
}

/** New pages start at the top; in-page anchors (#faq) still scroll to their target. */
function ScrollToTop() {
  const { pathname, hash } = useLocation();
  useEffect(() => {
    if (!hash) window.scrollTo(0, 0);
  }, [pathname, hash]);
  return null;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AnalysisProvider>
          <ScrollToTop />
          <Layout>
            <Routes>
              <Route path="/" element={<PublicOnly><Home /></PublicOnly>} />
              <Route path="/login" element={<PublicOnly><Login /></PublicOnly>} />
              <Route path="/register" element={<PublicOnly><Register /></PublicOnly>} />
              <Route path="/analyze" element={<RequireAuth><Analyze /></RequireAuth>} />
              <Route path="/report" element={<RequireAuth><Report /></RequireAuth>} />
              <Route path="/routine" element={<RequireAuth><RoutineBuilder /></RequireAuth>} />
              <Route path="/progress" element={<RequireAuth><Progress /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
              <Route path="/feedback" element={<Navigate to="/report" replace />} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </AnalysisProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}
