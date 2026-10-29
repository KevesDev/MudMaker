import type { DiagnosticRecord } from "../appInfo";

export interface DiagnosticSinkOptions {
  /** Appends the record to the shell log. */
  readonly write: (record: DiagnosticRecord) => Promise<void>;
  /** Told when the log itself could not be written; the interface carries on. */
  readonly logFailed: (failure: unknown) => void;
  /** Development console copy of each record; absent in a release build. */
  readonly echo?: (record: DiagnosticRecord) => void;
}

/** The one place interface diagnostics leave the window. Writing is fire and forget so a slow or broken log never delays the screen. */
export function createDiagnosticSink(options: DiagnosticSinkOptions): (record: DiagnosticRecord) => void {
  return (record) => {
    options.echo?.(record);
    void Promise.resolve()
      .then(() => options.write(record))
      .catch(options.logFailed);
  };
}
