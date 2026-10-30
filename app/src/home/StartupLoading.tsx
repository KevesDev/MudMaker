import { useEffect, useRef, useState } from "react";
import type { ThemeManager } from "../theme";
import { Progress, type PassiveDescriptor } from "../ui";
import { homeCopy } from "./homeCopy";
import { WordmarkBlock } from "./WordmarkBlock";

const LOADING: PassiveDescriptor = { passive: true, id: "startup.loading", label: homeCopy.loadingLabel, help: "" };

/** The wordmark and a progress bar; the bar's name is for assistive technology and no words about the checks are drawn. */
export function StartupLoading({ theme }: { readonly theme: ThemeManager }) {
  const stageRef = useRef<HTMLElement>(null);
  return (
    <main className="home" aria-busy="true" aria-label={homeCopy.productName} ref={stageRef}>
      <div className="home-above" aria-hidden="true" />
      <div className="home-header">
        <WordmarkBlock name={homeCopy.productName} theme={theme} stageRef={stageRef} />
      </div>
      <div className="home-below">
        <Progress described={LOADING} fraction={null} showText={false} />
      </div>
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
