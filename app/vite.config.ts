import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  plugins: [react()],
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
    watch: { ignored: ["**/src-tauri/**"] },
    fs: { allow: [".", "../contracts/ui/v1", "../docs/03-contracts/ui-ux"] },
  },
  // Style tests read these stylesheets as text; other styles stay unprocessed.
  test: { environment: "jsdom", css: { include: [/src\/ui\/ui\.css/, /src\/home\/home\.css/, /src\/frame\/frame\.css/, /src\/art\/art\.css/, /src\/nav\/nav\.css/, /src\/workspaces\/workspaces\.css/] } },
});
