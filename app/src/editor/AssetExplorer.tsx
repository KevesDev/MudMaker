import { useId, useState } from "react";
import { ControlList } from "../workspaces/controlParts";
import { Button, Dropdown, TextField, useCommand, useUi, type DropdownOption } from "../ui";
import { ASSETS, ASSET_CATEGORIES } from "./editorLayout";
import { editorCopy } from "./editorCopy";

export const ALL_ASSETS = "all";

export const assetFilterOptions: readonly DropdownOption[] = [{ value: ALL_ASSETS, label: editorCopy.assetFilterAll }, ...ASSET_CATEGORIES.map(({ id, label }) => ({ value: id, label }))];

function CategoryRow({ label }: { readonly label: string }) {
  const [expanded, setExpanded] = useState(false);
  const uid = useId();
  const toggle = `assets.category.${uid}`;
  useCommand(toggle, () => setExpanded((current) => !current));
  return (
    <div role="treeitem" aria-expanded={expanded} aria-selected={false} className="editor-category">
      <button type="button" data-ui-command={toggle} className="ui-control ui-hit editor-category-toggle">
        <span aria-hidden="true" className="editor-category-mark">
          {expanded ? editorCopy.expandedMark : editorCopy.collapsedMark}
        </span>
        {label}
      </button>
    </div>
  );
}

export interface AssetExplorerProps {
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
  readonly filter: string;
}

/** The header and the folder tree. No asset exists to list until a project can be opened. */
export function AssetExplorer({ query, onQueryChange, filter }: AssetExplorerProps) {
  const { registry } = useUi();
  const control = (id: string) => registry.requireControl(id);
  const folders = ASSET_CATEGORIES.filter(({ id }) => filter === ALL_ASSETS || id === filter);
  return (
    <div className="editor-assets">
      <div className="editor-assets-header">
        <TextField control={control(ASSETS.search)} value={query} onValueChange={onQueryChange} type="search" />
        <Dropdown control={control(ASSETS.filter)} options={assetFilterOptions} value={filter} />
        <div className="workspace-row">
          <Button control={control(ASSETS.create)} />
          <Button control={control(ASSETS.import)} />
        </div>
      </div>
      <ControlList control={control(ASSETS.explorer)}>
        {folders.map(({ id, label }) => (
          <CategoryRow key={id} label={label} />
        ))}
      </ControlList>
    </div>
  );
}
