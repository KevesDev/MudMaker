import { useEffect, useState } from "react";
import { Progress, type PassiveDescriptor } from "../ui";
import { homeCopy } from "./homeCopy";

const LOADING: PassiveDescriptor = { passive: true, id: "startup.loading", ...homeCopy.loading };

export function StartupLoading() {
  return (
    <main className="home" aria-busy="true">
      <Progress described={LOADING} fraction={null} />
    </main>
  );
}

/**
 * Stays mounted for the whole life of the window, so screen readers have a live region to watch when the loading
 * screen replaces another screen, which happens on every retry as well as at launch. The words are added after the
 * region exists, because most screen readers announce a change to a live region and not content it arrives with.
 */
export function LoadingAnnouncement({ checking }: { readonly checking: boolean }) {
  const [announced, setAnnounced] = useState(false);
  useEffect(() => {
    setAnnounced(checking);
  }, [checking]);
  return (
    <div role="status" aria-live="polite" className="ui-visually-hidden">
      {checking && announced ? LOADING.label : ""}
    </div>
  );
}
