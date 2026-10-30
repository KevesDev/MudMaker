import { ControlTab, ControlTabList, EmptyCue } from "../workspaces/controlParts";
import { Button, REGION, useUi } from "../ui";
import { CLEAR_COMPLETED, OUTPUT_VIEWS } from "./editorLayout";
import { editorCopy } from "./editorCopy";

export interface ProblemsDrawerProps {
  readonly open: boolean;
  readonly view: (typeof OUTPUT_VIEWS)[number];
}

/**
 * The strip along the bottom edge. Closed, it is only the Problems tab; open, it lists every output view and what the
 * selected one holds. All of them are empty until a build or test has run.
 */
export function ProblemsDrawer({ open, view }: ProblemsDrawerProps) {
  const { registry } = useUi();
  const shown = open ? OUTPUT_VIEWS : OUTPUT_VIEWS.slice(0, 1);
  return (
    <section aria-label={editorCopy.problemsDrawer} data-region={REGION.surface} className="editor-problems">
      <div className="workspace-bar">
        <ControlTabList label={editorCopy.problemsDrawer}>
          {shown.map((id) => (
            <ControlTab key={id} control={registry.requireControl(id)} selected={open && id === view} />
          ))}
        </ControlTabList>
        {open ? <Button control={registry.requireControl(CLEAR_COMPLETED)} /> : null}
      </div>
      {open ? <EmptyCue>{editorCopy.emptyOutput[view]}</EmptyCue> : null}
    </section>
  );
}
