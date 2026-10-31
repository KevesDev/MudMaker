import { Button, Dropdown, TextField, useUi } from "../ui";
import { ASSETS } from "./editorLayout";

export interface AssetExplorerProps {
  readonly query: string;
  readonly onQueryChange: (query: string) => void;
}

/** The Explorer header. Folders and assets come from the project once one can be opened; none are invented here. */
export function AssetExplorer({ query, onQueryChange }: AssetExplorerProps) {
  const { registry } = useUi();
  const control = (id: string) => registry.requireControl(id);
  return (
    <div className="editor-assets">
      <div className="editor-assets-header">
        <TextField control={control(ASSETS.search)} value={query} onValueChange={onQueryChange} type="search" />
        <Dropdown control={control(ASSETS.filter)} options={[]} value="" />
        <div className="workspace-row">
          <Button control={control(ASSETS.create)} />
          <Button control={control(ASSETS.import)} />
        </div>
      </div>
    </div>
  );
}
