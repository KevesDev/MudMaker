import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { App } from "./App";
import { readPreferences, writePreferences } from "./appInfo";
import { productionDependencies } from "./home/homeDependencies";
import { PreferencesStore } from "./prefs";
import { clientProfiles } from "./play/clientProfiles";
import { launch } from "./launch";
import { themeManager } from "./theme";
import "./styles.css";
import "./home/home.css";
import "./frame/frame.css";
import "./nav/nav.css";
import "./workspaces/workspaces.css";
import "./editor/editor.css";
import "./canvas/canvas.css";

const container = document.getElementById("root");
if (!container) throw new Error("Root element is missing");

void launch({
  preferences: new PreferencesStore({ bridge: { read: readPreferences, write: writePreferences }, report: productionDependencies.report, profiles: clientProfiles }),
  manager: themeManager,
  window,
  mount: () =>
    createRoot(container).render(
      <StrictMode>
        <App />
      </StrictMode>,
    ),
});
