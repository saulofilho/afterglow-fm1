// SPDX-License-Identifier: GPL-3.0-only
// Level 3 for the GR!MM family (GR!MM, COQUÍ): its editor protocol over SysEx (F0 7D 47 52 cmd .. F7, GR!MM's
// docs/EDITOR_PROTOCOL.md, as COQUÍ's editor_core.js speaks it): the selected track's sound and the effects, asked for
// a few times a second, since the FM-1 does not send its knobs by itself.

import type { Param, Signal } from "../signal";

export const HEAD = [0x7d, 0x47, 0x52];
const INFO = 20, TRACK = 23, FX = 25;

export function pack7(b: ArrayLike<number>): number[] {
  const out: number[] = [];
  for (let i = 0; i < b.length; i += 7) {
    const g = Array.from({ length: Math.min(7, b.length - i) }, (_, j) => b[i + j]);
    out.push(g.reduce((t, x, j) => t | (((x >> 7) & 1) << j), 0), ...g.map((x) => x & 0x7f));
  }
  return out;
}
export function unpack7(b: ArrayLike<number>): number[] {
  const out: number[] = [];
  for (let i = 0; i < b.length;) {
    const top = b[i++], n = Math.min(7, b.length - i);
    for (let j = 0; j < n; j++) out.push(b[i + j] | (((top >> j) & 1) << 7));
    i += n;
  }
  return out;
}

// the sources' four knobs (COQUÍ's names; GR!MM's VOICE in place of PERC)
const ENGINES: Record<string, [string, string[], number[]][]> = {
  coqui: [["VA", ["WAVE", "DETUNE", "CUTOFF", "RESONANCE"], [2, 127, 127, 127]], ["FM", ["PATCH", "BRIGHT", "DECAY", "DETUNE"], [7, 127, 127, 127]],
    ["SAMPLE", ["SLOT", "START", "LENGTH", "REVERSE"], [3, 127, 127, 1]], ["PERC", ["KIT", "TUNE", "DECAY", "HUMAN"], [3, 127, 127, 127]],
    ["WHEEL", ["DRAWBARS", "PERC", "CLICK", "DRIVE"], [15, 6, 127, 127]], ["PHYS", ["MODEL", "STRUCTURE", "DAMP", "BOW"], [3, 127, 127, 127]],
    ["PHASE", ["WAVE", "WAVE2", "DCW", "DETUNE"], [7, 8, 127, 127]]],
};
ENGINES.grimm = ENGINES.coqui.map((e, i) => (i === 3 ? ["VOICE", ["KNOB 1", "KNOB 2", "KNOB 3", "KNOB 4"], [127, 127, 127, 127]] : e));
const FX_NAMES = ["WOW", "SATURATION", "TONE", "HISS", "SIZE", "DENSITY", "SCATTER", "MIX", "TIME", "FEEDBACK", "WEAR", "MIX",
  "SIZE", "DAMP", "MIX", "PRE-DELAY", "CUTOFF", "RESONANCE", "TYPE", "POSITION", "AMOUNT", "TYPE", "TONE", "MIX"];
const FX_PAGES = ["TAPE", "GRAIN", "DELAY", "SPACE", "MASTER", "DRIVE"];

export class Grimm {
  firmware = "";
  private wait: { cmd: number; res: (d: number[]) => void; timer: number } | null = null;
  private family: "coqui" | "grimm" = "grimm";
  private sel = 0;
  private n = 0;

  constructor(private send: (bytes: number[]) => void) {}

  /** a SysEx message from the FM-1 (with F0 .. F7) */
  onSysex(d: ArrayLike<number>) {
    if (!this.wait || d[1] !== HEAD[0] || d[2] !== HEAD[1] || d[3] !== HEAD[2] || d[4] !== this.wait.cmd) return;
    const w = this.wait;
    this.wait = null;
    clearTimeout(w.timer);
    w.res(Array.from(d).slice(5, d.length - 1));
  }

  request(cmd: number, args: number[] = [], timeout = 1500): Promise<number[]> {
    if (this.wait) return Promise.reject(new Error("busy"));
    return new Promise((res, rej) => {
      this.wait = { cmd, res, timer: window.setTimeout(() => { this.wait = null; rej(new Error("no answer")); }, timeout) };
      this.send([0xf0, ...HEAD, cmd, ...args, 0xf7]);
    });
  }

  async info() {
    const r = await this.request(INFO);
    const j = r.indexOf(0, 2);
    this.firmware = String.fromCharCode(...r.slice(2, j > 0 ? j : r.length));
    this.family = /coqu/i.test(this.firmware) ? "coqui" : "grimm";
    return this.firmware;
  }

  /** one poll: the selected track's sound; every fourth, the effects too */
  async poll(s: Signal) {
    let r = await this.request(TRACK, [0, this.sel]);
    if (r[2] !== this.sel && r[2] < 4) { this.sel = r[2]; r = await this.request(TRACK, [0, this.sel]); }
    if (!r[3]) {
      const rec = unpack7(r.slice(4, 78)), name = String.fromCharCode(...r.slice(78)).trim();
      const eng = ENGINES[this.family][Math.min(6, rec[3])] ?? ENGINES.coqui[0];
      const env = ["ATTACK", "DECAY", "SUSTAIN", "RELEASE"];
      s.title = `T${this.sel + 1} · ${name || eng[0] + " SOUND"}`;
      s.params = [
        ...eng[1].map((n, k): Param => ({ name: n, value: rec[4 + k], max: eng[2][k], text: String(rec[4 + k]) })),
        ...env.map((n, k): Param => ({ name: n, value: rec[8 + k], max: 127, text: String(rec[8 + k]) })),
      ];
    }
    if (this.n++ % 4 === 0) {
      const f = await this.request(FX, [0]);
      if (!f[1]) s.fx = f.slice(2, 26).map((v, i) => ({ name: `${FX_PAGES[i >> 2]} ${FX_NAMES[i]}`, value: v, max: 127, text: String(v) }));
    }
  }
}

/** the FM-1 among the MIDI ports: the output whose INFO gets a GR!MM-family answer (none: null) */
export async function findGrimm(acc: MIDIAccess): Promise<{ input: MIDIInput; output: MIDIOutput } | null> {
  const fm = (p: MIDIPort) => (/felucca|fm-?1|m-?vave|gr!?mm|coqu/i.test(p.name ?? "") ? 0 : 1);
  const outs = [...acc.outputs.values()].sort((a, b) => fm(a) - fm(b));
  const ins = [...acc.inputs.values()];
  for (const out of outs) {
    const got = await new Promise<MIDIInput | null>((res) => {
      const done = (v: MIDIInput | null) => { clearTimeout(timer); ins.forEach((i) => (i.onmidimessage = null)); res(v); };
      const timer = setTimeout(() => done(null), 800);
      ins.forEach((i) => (i.onmidimessage = (e) => {
        const d = e.data!;
        if (d.length >= 20 && d[0] === 0xf0 && d[1] === HEAD[0] && d[2] === HEAD[1] && d[3] === HEAD[2] && d[4] === INFO) done(i);
      }));
      try { out.send([0xf0, ...HEAD, INFO, 0xf7]); } catch { done(null); }
    });
    if (got) return { input: got, output: out };
  }
  return null;
}
