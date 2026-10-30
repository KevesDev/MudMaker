import type { ReactNode } from "react";
import { REGION } from "../ui";
import { frameCopy } from "./frameCopy";

interface AppFrameProps {
  /** The application mark, ahead of the title. */
  readonly leading?: ReactNode;
  readonly title: string;
  /** The catalog test id of the title, when the screen has the catalog to name it. */
  readonly titleTestId?: string;
  /** Frequent actions of a workspace sit here; the home screen leaves it empty. */
  readonly middle?: ReactNode;
  /** Settings and Go To sit here, ahead of the window controls. */
  readonly end?: ReactNode;
  /** The window controls, always the far end of the row. */
  readonly windowControls?: ReactNode;
}

/**
 * The top row of every screen. Everything in it that is not a control drags the window, and a double
 * click on it toggles maximize; the shell does both, so the row only declares where.
 */
export function AppFrame({ leading, title, titleTestId, middle, end, windowControls }: AppFrameProps) {
  return (
    <div className="app-frame" role="region" aria-label={frameCopy.regionName} data-region={REGION.toolbar} data-tauri-drag-region="deep">
      {leading === undefined ? null : <div className="app-frame-leading">{leading}</div>}
      <span className="app-frame-title" {...(titleTestId === undefined ? {} : { "data-testid": titleTestId })}>
        {title}
      </span>
      <div className="app-frame-middle">{middle}</div>
      {end === undefined ? null : <div className="app-frame-end">{end}</div>}
      {windowControls}
    </div>
  );
}

/** The window's border and its two parts: the frame row above, and the screen below that scrolls on its own. */
export function AppWindow({ frame, children }: { readonly frame: ReactNode; readonly children: ReactNode }) {
  return (
    <div className="app-window">
      {frame}
      <div className="app-window-content">{children}</div>
    </div>
  );
}
