import type { ReactNode } from "react";
import { StatusIndicator, type StatusTone } from "../ui";
import { homeCopy } from "./homeCopy";
import type { CheckResult, CheckStatus } from "./startupChecks";

const TONE: Readonly<Record<CheckStatus, StatusTone>> = {
  passed: "success",
  attention: "warning",
  failed: "error",
};

/** One line per startup check. The result is written in words, so color only supports it. */
export function CheckList({ results, children }: { readonly results: readonly CheckResult[]; readonly children?: ReactNode }) {
  return (
    <ul className="home-checks">
      {results.map((result) => (
        <li key={result.id}>
          <StatusIndicator
            described={{ passive: true, id: `startup.${result.id}`, ...homeCopy.checks[result.id] }}
            tone={TONE[result.status]}
            text={`${homeCopy.statusWord[result.status]} ${result.detail}`}
          />
        </li>
      ))}
      {children}
    </ul>
  );
}
