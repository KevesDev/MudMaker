import { SPLASH_GLYPHS } from "./homeLayout";

export type OrnamentWidth = "wide" | "narrow";

/** A thin rule on each side of a small star, centered and narrower than the action row. Decoration only. */
export function Ornament({ width }: { readonly width: OrnamentWidth }) {
  return (
    <div className="home-ornament" data-width={width} aria-hidden="true">
      <span className="home-rule" />
      <span>{SPLASH_GLYPHS.ornament}</span>
      <span className="home-rule" />
    </div>
  );
}
