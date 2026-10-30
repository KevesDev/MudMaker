import { useId, type ReactNode } from "react";
import { Inspector, inspectorHasContent, type InspectorProps } from "./Inspector";
import { editorCopy } from "./editorCopy";
import { SplitView } from "./SplitView";
import { TabStrip, documentTabId, type TabStripProps } from "./TabStrip";

export interface EditorShellProps {
  /** The open documents. Shown only while there are two or more. */
  readonly documents?: Omit<TabStripProps, "panelId">;
  /** An Assets drawer, drawn by the feature that owns it and collapsed until asked for. */
  readonly assets?: ReactNode;
  /** The dominant authoring surface. */
  readonly surface?: ReactNode;
  /** What is selected. The Inspector region exists only while it has something to show. */
  readonly inspector?: InspectorProps;
}

/**
 * The structure of the Create workspace: the open documents above a work area made of an optional Assets drawer, the
 * dominant surface and the Inspector. It adds nothing of its own; each part appears when a feature supplies it.
 */
export function EditorShell({ documents, assets, surface, inspector }: EditorShellProps) {
  const panelId = useId();
  const tabbed = documents !== undefined && documents.tabs.length > 1;
  return (
    <div className="editor-shell">
      {documents === undefined ? null : <TabStrip {...documents} panelId={panelId} />}
      <div className="editor-body">
        {assets}
        <SplitView
          separatorLabel={editorCopy.resizeInspector}
          primary={
            tabbed ? (
              <div role="tabpanel" id={panelId} aria-labelledby={documentTabId(panelId, documents.activeId)} className="editor-surface">
                {surface}
              </div>
            ) : (
              <div className="editor-surface">{surface}</div>
            )
          }
          secondary={inspector !== undefined && inspectorHasContent(inspector.sections) ? <Inspector {...inspector} /> : null}
        />
      </div>
    </div>
  );
}

/** The Create workspace as the application mounts it: the structure, with no feature in it yet. */
export function CreateShell() {
  return <EditorShell />;
}
