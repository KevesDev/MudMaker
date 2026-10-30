import { homeCopy } from "./homeCopy";
import { Ornament } from "./Ornament";

/** The divider and the brand line that sit under the wordmark on the loaded and failed screens. */
export function Brand() {
  return (
    <>
      <Ornament width="wide" />
      <p className="home-tagline">{homeCopy.tagline}</p>
    </>
  );
}
