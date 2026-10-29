import { createContext, useContext, useEffect, useSyncExternalStore, type ReactNode } from "react";
import { UiContractError } from "./actions/types";
import type { UiRuntime } from "./runtime";
import "./ui.css";

const UiContext = createContext<UiRuntime | null>(null);

export function useUi(): UiRuntime {
  const runtime = useContext(UiContext);
  if (runtime === null) {
    throw new UiContractError("provider-missing", "UiProvider", "Shared interface parts must be rendered inside a UiProvider.");
  }
  return runtime;
}

function AnnouncementRegion({ runtime }: { readonly runtime: UiRuntime }) {
  const { announcer } = runtime;
  const last = useSyncExternalStore(
    (listener) => announcer.subscribe(listener),
    () => announcer.getLast(),
  );
  return (
    <div className="ui-visually-hidden">
      <div role="status" aria-live="polite" aria-atomic="true">
        {last?.politeness === "polite" ? <span key={last.sequence}>{last.text}</span> : null}
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="true">
        {last?.politeness === "assertive" ? <span key={last.sequence}>{last.text}</span> : null}
      </div>
    </div>
  );
}

/** Shares one runtime with every shared part and keeps its input listeners attached while mounted. */
export function UiProvider({ runtime, children }: { readonly runtime: UiRuntime; readonly children: ReactNode }) {
  useEffect(() => runtime.input.attach(), [runtime]);
  return (
    <UiContext.Provider value={runtime}>
      {children}
      <AnnouncementRegion runtime={runtime} />
    </UiContext.Provider>
  );
}
