import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";
import RequireAuth from "./components/RequireAuth";
import About from "./pages/About";
import Feedback from "./pages/Feedback";
import Ingredients from "./pages/Ingredients";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Recommendations from "./pages/Recommendations";
import Register from "./pages/Register";
import Results from "./pages/Results";
import Upload from "./pages/Upload";
import { AnalysisProvider } from "./context/AnalysisContext";
import { AuthProvider } from "./context/AuthContext";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <AnalysisProvider>
          <Layout>
            <Routes>
              {/* Public */}
              <Route path="/login" element={<Login />} />
              <Route path="/register" element={<Register />} />
              <Route path="/ingredients" element={<Ingredients />} />
              <Route path="/about" element={<About />} />

              {/* Requires a logged-in session */}
              <Route path="/" element={<RequireAuth><Upload /></RequireAuth>} />
              <Route path="/results" element={<RequireAuth><Results /></RequireAuth>} />
              <Route path="/recommendations" element={<RequireAuth><Recommendations /></RequireAuth>} />
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
