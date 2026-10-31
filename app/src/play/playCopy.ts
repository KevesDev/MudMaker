export const playCopy = {
  noWorlds: "No saved worlds.",
  cancel: "Cancel",
  save: "Save",
  name: "Name",
  favorite: "Favorite",
  deleteConfirm: "Delete",
  deleteTitle: (name: string): string => `Delete ${name}?`,
  /** The reason in the tooltip of a library action while no world is selected. */
  selectFirst: "Select a world from the list first.",
  sessionsName: "Sessions",
  connected: "Connected",
  notEncrypted: "Not encrypted",
  gameActions: "Game actions",
  composer: "Composer",
  invalidChoice: "Choose one of the listed adapters.",
  invalidToggle: "That setting could not be changed.",
} as const;
