/**
 * Calls back whenever the window's device pixel ratio changes, such as when it moves to another display or
 * the page zoom changes. A media query matches one exact ratio, so it is renewed after every change.
 */
export function watchDevicePixelRatio(win: Window, onChange: () => void): () => void {
  if (typeof win.matchMedia !== "function") return () => undefined;
  let stop = (): void => undefined;
  const arm = (): void => {
    const list = win.matchMedia(`(resolution: ${win.devicePixelRatio}dppx)`);
    const changed = (): void => {
      list.removeEventListener("change", changed);
      onChange();
      arm();
    };
    list.addEventListener("change", changed);
    stop = () => list.removeEventListener("change", changed);
  };
  arm();
  return () => stop();
}
