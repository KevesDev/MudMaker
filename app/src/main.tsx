import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { startTheme, themeManager } from "./theme";
import "./styles.css";

startTheme(themeManager, "home", window);

const container = document.getElementById("root");
if (!container) throw new Error("Root element is missing");
createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
