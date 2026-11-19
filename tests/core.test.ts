import { describe, expect, it } from "vitest";
import { pack7, unpack7 } from "../src/sources/grimm";
import { DEFAULT, parsePreset, presetHash } from "../src/presets";
import { Clock, emptySignal } from "../src/signal";
import { MidiIn } from "../src/sources/midi";
import { demoFill } from "../src/sources/demo";
import { PATTERNS } from "../src/render/patterns";

describe("pack7", () => {
  it("round-trips any bytes", () => {
    const b = Array.from({ length: 64 }, (_, i) => (i * 37 + 200) & 255);
    expect(unpack7(pack7(b))).toEqual(b);
    expect(pack7(b).every((x) => x < 128)).toBe(true);
  });
});

describe("presets", () => {
  it("the default is an empty hash", () => expect(presetHash(DEFAULT)).toBe(""));
  it("round-trips and clamps", () => {
    const p = parsePreset("#view=palco&pal=cyberpunk&pat=onda&lines=9&gain=1.5");
    expect(p).toMatchObject({ view: "palco", pal: "cyberpunk", pat: "onda", lines: 6, gain: 1.5 });
    expect(parsePreset(presetHash(p))).toEqual(p);
    expect(parsePreset("#view=nope").view).toBe("cascata");
  });
});

describe("MIDI", () => {
  it("notes go to their track, the clock gives the tempo and step", () => {
    const s = emptySignal(), c = new Clock(), m = new MidiIn(s, c);
    m.handle([0x91, 60, 100], 0);
    expect(s.notes[1]).toBeGreaterThan(0.8);
    expect(s.last[1]).toBe(60);
    m.handle([0xfa], 0);
    const tick = 60000 / (95 * 24);
    for (let i = 1; i <= 24 * 4; i++) m.handle([0xf8], i * tick);
    c.update(s, 24 * 4 * tick, 0.016);
    expect(Math.round(s.bpm)).toBe(95);
    expect(s.beat).toBeCloseTo(4, 1);
    m.handle([0xb0, 74, 99], 1);
    expect(m.ccParams()[0]).toMatchObject({ name: "CC 74", value: 99 });
  });
});

describe("patterns", () => {
  it("stay finite on the demo's signal", () => {
    const s = emptySignal(), o = new Float32Array(2);
    demoFill(s, 3.3);
    for (const p of PATTERNS) for (let y = 0; y <= 1; y += 0.25) for (let x = 0; x <= 1; x += 0.25) {
      p.f(x, y, s, o);
      expect(Number.isFinite(o[0]) && Number.isFinite(o[1])).toBe(true);
    }
  });
});
