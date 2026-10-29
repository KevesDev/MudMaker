import { useEffect, useState } from "react";
import { getAppInfo, quitApp, type AppInfo } from "./appInfo";

export function App() {
  const [info, setInfo] = useState<AppInfo | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getAppInfo().then(setInfo, (e: unknown) =>
      setError(e instanceof Error ? e.message : String(e)),
    );
  }, []);

  return (
    <main className="launch">
      <h1>{info?.name ?? ""}</h1>
      {info && (
        <dl>
          <dt>Version</dt>
          <dd>{info.version}</dd>
          <dt>Build</dt>
          <dd>{info.buildId}</dd>
          <dt>Platform</dt>
          <dd>{info.platform}</dd>
          <dt>Architecture</dt>
          <dd>{info.arch}</dd>
        </dl>
      )}
      {error && <p role="alert">Could not read build details: {error}</p>}
      <p>Game engine: not installed in this build</p>
      <button type="button" onClick={() => void quitApp()}>
        Quit
      </button>
    </main>
  );
}
