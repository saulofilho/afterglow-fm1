// SPDX-License-Identifier: GPL-3.0-only
// What the viewer chose, as a link: #view=palco&pal=cyberpunk&pat=queda&lines=3&px=3&gain=1.5

export const VIEWS = ["cascata", "estudio", "palco", "overlay"] as const;
export type View = (typeof VIEWS)[number];
export interface Preset { view: View; pal: string; pat: string; lines: number; px: number; gain: number }
export const DEFAULT: Preset = { view: "cascata", pal: "mix", pat: "queda", lines: 3, px: 3, gain: 1 };

const clampN = (v: string | null, lo: number, hi: number, def: number) => {
  const n = Number(v);
  return v !== null && v !== "" && Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : def;
};

export function parsePreset(hash: string, base: Preset = DEFAULT): Preset {
  const q = new URLSearchParams(hash.replace(/^#/, ""));
  const view = q.get("view") as View | null;
  return {
    view: view && VIEWS.includes(view) ? view : base.view,
    pal: q.get("pal")?.replace(/[^a-z0-9-]/g, "") || base.pal,
    pat: q.get("pat")?.replace(/[^a-z0-9-]/g, "") || base.pat,
    lines: Math.round(clampN(q.get("lines"), 2, 6, base.lines)),
    px: Math.round(clampN(q.get("px"), 1, 8, base.px)),
    gain: clampN(q.get("gain"), 0.25, 4, base.gain),
  };
}

export function presetHash(p: Preset): string {
  const q = new URLSearchParams();
  (Object.keys(DEFAULT) as (keyof Preset)[]).forEach((k) => { if (p[k] !== DEFAULT[k]) q.set(k, String(p[k])); });
  const s = q.toString();
  return s ? "#" + s : "";
}
