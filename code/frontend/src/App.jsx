import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";
import RequireAuth from "./components/RequireAuth";
import Login from "./pages/Login";
import Register from "./pages/Register";
import Analyze from "./pages/Analyze";
import Report from "./pages/Report";
import RoutineBuilder from "./pages/RoutineBuilder";
import Profile from "./pages/Profile";
import Feedback from "./pages/Feedback";
import { AuthProvider } from "./context/AuthContext";
import { AnalysisProvider } from "./context/AnalysisContext";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AnalysisProvider>
          <Layout>
            <Routes>
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/" element={<RequireAuth><Analyze /></RequireAuth>} />
              <Route path="/report" element={<RequireAuth><Report /></RequireAuth>} />
              <Route path="/routine" element={<RequireAuth><RoutineBuilder /></RequireAuth>} />
              <Route path="/profile" element={<RequireAuth><Profile /></RequireAuth>} />
              <Route path="/feedback" element={<RequireAuth><Feedback /></RequireAuth>} />
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </Layout>
        </AnalysisProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}