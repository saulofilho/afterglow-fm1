// SPDX-License-Identifier: GPL-3.0-only
// The one shape every source writes and every panel reads: the FM-1's sound, notes, clock and knobs as they are now.
// The panels never know which firmware (or the demo) it came from.

export const BANDS = 32;                                    // the spectrum's bands, low to high
export const WAVE = 256;                                    // the waveform's points
export const TRACKS = 4;

export interface Param { name: string; value: number; max: number; text: string }

export interface Signal {
  t: number;                                                // seconds since the page started
  level: number;                                            // 0..1, the peak, falling slowly
  spec: Float32Array;                                       // BANDS values 0..1
  wave: Float32Array;                                       // WAVE values -1..1, from a rising edge
  kick: number; snare: number; hat: number;                 // 0..1: onsets in the low, middle and high bands
  bpm: number; beat: number; step: number;                  // the tempo, beats since start (fractional), the step 0..15
  running: boolean;                                         // the sequencer plays (from the MIDI clock's start / stop)
  clocked: boolean;                                         // the beat comes from a MIDI clock (else it runs free)
  notes: Float32Array;                                      // TRACKS envelopes 0..1, 1 at a note
  last: (number | null)[];                                  // the last note per track
  title: string;                                            // what is playing: a sound's name, "DEMO", ""
  params: Param[];                                          // the selected track's knobs (an adapter) or the last CCs
  fx: Param[];                                              // the effects (an adapter)
  source: { audio: string; midi: string; adapter: string; demo: boolean };
}

export function emptySignal(): Signal {
  return {
    t: 0, level: 0, spec: new Float32Array(BANDS), wave: new Float32Array(WAVE), kick: 0, snare: 0, hat: 0,
    bpm: 120, beat: 0, step: 0, running: false, clocked: false, notes: new Float32Array(TRACKS), last: [null, null, null, null],
    title: "", params: [], fx: [], source: { audio: "", midi: "", adapter: "", demo: false },
  };
}

// ------------------------------------------------------------------ onsets: the rise of a band's energy, held and let fall
export class Onsets {
  private prev = [0, 0, 0];
  update(s: Signal, dt: number) {
    const avg = (a: number, b: number) => { let m = 0; for (let i = a; i < b; i++) m += s.spec[i]; return m / (b - a); };
    const e = [avg(0, 4), avg(8, 18), avg(22, BANDS)];
    const fall = Math.exp(-dt * 7);
    const keys = ["kick", "snare", "hat"] as const;
    keys.forEach((k, i) => {
      const rise = Math.max(0, e[i] - this.prev[i]) * 4;
      s[k] = Math.min(1, Math.max(s[k] * fall, rise));
      this.prev[i] = e[i];
    });
  }
}

// ------------------------------------------------------------------ the clock: 24 ticks a beat, or free running at the last tempo
export class Clock {
  private ticks = 0;
  private lastTick = 0;
  private tickMs = 0;
  private free = 0;                                         // the beat when it runs free
  running = false;

  tick(now: number) {
    if (this.lastTick && now - this.lastTick < 250) {
      const d = now - this.lastTick;
      this.tickMs = this.tickMs ? this.tickMs * 0.92 + d * 0.08 : d;
    }
    this.lastTick = now;
    if (this.running) this.ticks++;
  }
  start() { this.running = true; this.ticks = 0; }
  resume() { this.running = true; }
  stop() { this.running = false; }

  /** the tempo, beat and step at now (ms); a clock unheard for a second: free running */
  update(s: Signal, now: number, dt: number) {
    const live = this.lastTick > 0 && now - this.lastTick < 1000;
    s.clocked = live;
    if (live && this.tickMs) s.bpm = 60000 / (this.tickMs * 24);
    if (live && this.running) {
      const frac = this.tickMs ? Math.min(1, (now - this.lastTick) / this.tickMs) : 0;
      s.beat = (this.ticks + frac) / 24;
      this.free = s.beat;
    } else {
      if (!live || this.running) this.free += (dt * s.bpm) / 60;   // (stopped on a live clock: the beat holds)
      s.beat = this.free;
    }
    s.running = live ? this.running : !s.source.demo ? false : true;
    s.step = Math.floor(s.beat * 4) % 16;
  }
}

/** the note envelopes fall */
export function decayNotes(s: Signal, dt: number) {
  const f = Math.exp(-dt * 5);
  for (let k = 0; k < TRACKS; k++) s.notes[k] *= f;
}
