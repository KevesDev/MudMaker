import { describe, expect, it } from "vitest";
import { ART_ROLES } from "../theme";
import { APP_MARK, ICONS, SCENE_PIECES } from "./library";
import { CLEAR_PIXEL, pixelRole, type ArtPiece, type ArtRole } from "./parsePiece";

const files = import.meta.glob("./pieces/*.art.txt", { query: "?raw", import: "default", eager: true }) as Readonly<Record<string, string>>;

/** The roles a piece uses, read back from its pixels. */
function rolesOf(piece: ArtPiece): ArtRole[] {
  const found = new Set<ArtRole>();
  for (const pixel of piece.pixels) {
    const role = pixelRole(pixel);
    if (role !== null) found.add(role);
  }
  return [...found];
}

const icons = [...Object.values(ICONS), APP_MARK];
const shipped = [...icons, ...Object.values(SCENE_PIECES)];

describe("the shipped pieces", () => {
  it("are exactly the files in the pieces folder, each parsed under its own name", () => {
    const names = Object.keys(files).map((path) => /([^/]+)\.art\.txt$/.exec(path)?.[1] ?? "");
    expect(names.length).toBeGreaterThan(0);
    expect(shipped.map((piece) => piece.name).sort()).toEqual(names.sort());
  });

  it("draw only roles of the theme, and every piece draws something", () => {
    for (const piece of shipped) {
      const roles = rolesOf(piece);
      expect(roles.length, piece.name).toBeGreaterThan(0);
      expect(
        roles.every((role) => ART_ROLES.includes(role)),
        piece.name,
      ).toBe(true);
    }
  });

  it("make every icon and the application mark an 8 by 8 grid that is part drawn and part clear", () => {
    for (const piece of icons) {
      expect([piece.width, piece.height], piece.name).toEqual([8, 8]);
      expect(piece.pixels.includes(CLEAR_PIXEL), piece.name).toBe(true);
      expect(
        piece.pixels.some((pixel) => pixel !== CLEAR_PIXEL),
        piece.name,
      ).toBe(true);
    }
  });

  it("gives the three workspace icons one shared role and the footer icons and the mark one role each", () => {
    expect([ICONS.document, ICONS.play, ICONS.server].map(rolesOf)).toEqual([["light"], ["light"], ["light"]]);
    expect([ICONS.gear, ICONS.door, APP_MARK].map(rolesOf)).toEqual([["mid"], ["accent"], ["glow"]]);
  });

  it("give the two traced pieces one size, so their shores meet the lake at the same row", () => {
    expect([SCENE_PIECES.mountains.width, SCENE_PIECES.mountains.height]).toEqual([SCENE_PIECES.castle.width, SCENE_PIECES.castle.height]);
  });
});
