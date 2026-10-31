import { ControlTab, ControlTabList } from "../workspaces/controlParts";
import { Button, REGION, useUi } from "../ui";
import { CLEAR_COMPLETED, OUTPUT_VIEWS } from "./editorLayout";
import { editorCopy } from "./editorCopy";

export interface ProblemsDrawerProps {
  readonly open: boolean;
  readonly view: (typeof OUTPUT_VIEWS)[number];
}

/** The strip along the bottom edge. It is absent until the View menu or a failure opens it, and shows one feed at a time. */
export function ProblemsDrawer({ open, view }: ProblemsDrawerProps) {
  const { registry } = useUi();
  if (!open) return null;
  return (
    <section aria-label={editorCopy.problemsDrawer} data-region={REGION.surface} className="editor-problems">
      <div className="workspace-bar">
        <ControlTabList label={editorCopy.problemsDrawer}>
          {OUTPUT_VIEWS.map((id) => (
            <ControlTab key={id} control={registry.requireControl(id)} selected={id === view} />
          ))}
        </ControlTabList>
        <Button control={registry.requireControl(CLEAR_COMPLETED)} />
      </div>
    </section>
  );
}
