import appMarkText from "./pieces/app-mark.art.txt?raw";
import castleText from "./pieces/scene-castle.art.txt?raw";
import doorText from "./pieces/icon-door.art.txt?raw";
import documentText from "./pieces/icon-document.art.txt?raw";
import gearText from "./pieces/icon-gear.art.txt?raw";
import mountainsText from "./pieces/scene-mountains.art.txt?raw";
import playText from "./pieces/icon-play.art.txt?raw";
import serverText from "./pieces/icon-server.art.txt?raw";
import { parseArtPiece, type ArtPiece } from "./parsePiece";

/*
 * The pieces the application ships, parsed once when the module loads. A file that does not parse fails here, with
 * the piece, line and column, before any screen is drawn.
 */

/** The 8 by 8 icons. Each is drawn in one role; a control that wants its own color overrides that role in its style. */
export const ICONS = {
  document: parseArtPiece(documentText, "icon-document.art.txt"),
  play: parseArtPiece(playText, "icon-play.art.txt"),
  server: parseArtPiece(serverText, "icon-server.art.txt"),
  gear: parseArtPiece(gearText, "icon-gear.art.txt"),
  door: parseArtPiece(doorText, "icon-door.art.txt"),
} as const;

export type IconName = keyof typeof ICONS;

/** The mark of the application at the start of the window frame row. */
export const APP_MARK: ArtPiece = parseArtPiece(appMarkText, "app-mark.art.txt");

/** The two hand-traced pieces of the splash landscape; the rest of it is generated to the window. */
export const SCENE_PIECES = {
  castle: parseArtPiece(castleText, "scene-castle.art.txt"),
  mountains: parseArtPiece(mountainsText, "scene-mountains.art.txt"),
} as const;
