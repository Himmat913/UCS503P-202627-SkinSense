import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Layout from "./components/Layout";
import About from "./pages/About";
import Feedback from "./pages/Feedback";
import Ingredients from "./pages/Ingredients";
import Profile from "./pages/Profile";
import Recommendations from "./pages/Recommendations";
import Results from "./pages/Results";
import Upload from "./pages/Upload";
import { AnalysisProvider } from "./context/AnalysisContext";

export default function App() {
  return (
    <BrowserRouter>
      <AnalysisProvider>
        <Layout>
          <Routes>
            <Route path="/" element={<Upload />} />
            <Route path="/results" element={<Results />} />
            <Route path="/recommendations" element={<Recommendations />} />
            <Route path="/profile" element={<Profile />} />
            <Route path="/ingredients" element={<Ingredients />} />
            <Route path="/feedback" element={<Feedback />} />
            <Route path="/about" element={<About />} />
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Layout>
      </AnalysisProvider>
    </BrowserRouter>
  );
}
