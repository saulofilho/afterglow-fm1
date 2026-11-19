// SPDX-License-Identifier: GPL-3.0-only
// A panel: a pattern drawn as steep diagonal 1 px lines on a small canvas, scaled up without smoothing. The pattern
// shifts the lines; where the shift changes, the lines break into ridges and falls.

import type { Signal } from "../signal";
import type { Pattern } from "./patterns";

export interface Palette { id: string; name: string; c: string[] }
export const PALETTES: Palette[] = [
  { id: "estudio", name: "Estúdio", c: ["#0b0b0c", "#2b2a28", "#6b6862", "#e2e4dc", "#c9e46b"] },
  { id: "cyberpunk", name: "Cyberpunk", c: ["#07020f", "#3a0a5e", "#ff2bd6", "#00f0ff", "#fcee0a"] },
  { id: "matrix", name: "Matrix", c: ["#000600", "#003b0c", "#0f8a2a", "#39ff6a", "#d8ffe0"] },
  { id: "win95", name: "Windows 95", c: ["#000080", "#008080", "#c0c0c0", "#ffffff", "#ffff00"] },
  { id: "ambar", name: "Âmbar CRT", c: ["#0d0700", "#4a2a00", "#a35f00", "#ffb000", "#ffe2a0"] },
  { id: "vapor", name: "Vaporwave", c: ["#1a0b2e", "#5b1a8a", "#ff71ce", "#01cdfe", "#fff2a8"] },
];
export const paletteById = (id: string) => PALETTES.find((p) => p.id === id) ?? PALETTES[0];
const rgb = (h: string) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];

export class Panel {
  readonly canvas = document.createElement("canvas");
  private ctx = this.canvas.getContext("2d")!;
  private img: ImageData | null = null;
  private cols: number[][] = [];
  private o = new Float32Array(2);
  px = 3;                                                   // css pixels a panel pixel
  spacing = 3;                                              // pixels between lines
  transparent = false;                                      // (overlay: the gaps let the page through)

  constructor(public pattern: Pattern, palette: Palette) { this.setPalette(palette); }

  setPalette(p: Palette) { this.cols = p.c.map(rgb); }

  private fit() {
    const r = this.canvas.getBoundingClientRect(), w = Math.max(16, Math.round(r.width / this.px)), h = Math.max(8, Math.round(r.height / this.px));
    if (this.canvas.width !== w || this.canvas.height !== h || !this.img) {
      this.canvas.width = w, this.canvas.height = h;
      this.img = this.ctx.createImageData(w, h);
    }
  }

  draw(s: Signal) {
    this.fit();
    const img = this.img!, d = img.data, w = img.width, h = img.height, P = this.spacing, n = this.cols.length - 1, o = this.o, f = this.pattern.f;
    for (let j = 0; j < h; j++) {
      const y = j / (h - 1);
      for (let i = 0; i < w; i++) {
        f(i / (w - 1), y, s, o);
        const ph = (((i - j * 0.35 + o[0] * P) % P) + P) % P;   // (steep: a third of a pixel across a row)
        const top = Math.max(2, Math.round(Math.max(0, Math.min(1, o[1])) * n));
        const k = ph < 1 ? top : ph < 2 && P > 2 ? top - 2 : 0;
        const c = this.cols[k], q = (j * w + i) * 4;
        d[q] = c[0], d[q + 1] = c[1], d[q + 2] = c[2], d[q + 3] = this.transparent && k === 0 ? 0 : 255;
      }
    }
    this.ctx.putImageData(img, 0, 0);
  }
}
