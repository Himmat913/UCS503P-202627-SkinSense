import { StrictMode } from "react";
import { createRoot } from "react-dom/client";

import App from "./App";

// Order matters: tokens, then base, then components.
import "./styles/theme.css";
import "./styles/base.css";
import "./styles/components.css";

createRoot(document.getElementById("root")).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
