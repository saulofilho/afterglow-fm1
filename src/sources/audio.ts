// SPDX-License-Identifier: GPL-3.0-only
// Level 1: the sound, from any audio input (the FM-1's own USB audio on the Felucca-based firmwares, or its headphone
// out into an interface) or from an audio element (the demo's recording).

import { BANDS, type Signal, WAVE } from "../signal";

export const FM1_NAME = /felucca|fm-?1|m-?vave|coqu|gr!?mm|sloop/i;

export class AudioIn {
  ctx: AudioContext | null = null;
  private an: AnalyserNode | null = null;
  private node: AudioNode | null = null;
  private stream: MediaStream | null = null;
  private freq = new Float32Array(1024);
  private time = new Float32Array(2048);
  private edges: number[] = [];                             // each band's first and last bin
  label = "";

  private graph() {
    if (!this.ctx) {
      this.ctx = new AudioContext();
      this.an = this.ctx.createAnalyser();
      this.an.fftSize = 2048;
      this.an.smoothingTimeConstant = 0.55;
      this.an.minDecibels = -90;
      this.an.maxDecibels = -15;
      const nyq = this.ctx.sampleRate / 2, bins = this.an.frequencyBinCount;
      this.edges = [];
      for (let b = 0; b <= BANDS; b++) {                    // 30 Hz .. 16 kHz, log spaced
        const f = 30 * Math.pow(16000 / 30, b / BANDS);
        this.edges.push(Math.min(bins - 1, Math.max(1, Math.round((f / nyq) * bins))));
      }
    }
    if (this.ctx.state === "suspended") void this.ctx.resume();
    return this.ctx;
  }

  close() {
    this.node?.disconnect();
    this.node = null;
    this.stream?.getTracks().forEach((t) => t.stop());
    this.stream = null;
    this.label = "";
  }

  /** the audio inputs, names shown only after the browser's yes */
  static async inputs(): Promise<MediaDeviceInfo[]> {
    const first = await navigator.mediaDevices.getUserMedia({ audio: true });
    first.getTracks().forEach((t) => t.stop());
    return (await navigator.mediaDevices.enumerateDevices()).filter((d) => d.kind === "audioinput");
  }

  async openInput(id: string, label: string) {
    this.close();
    const ctx = this.graph();
    this.stream = await navigator.mediaDevices.getUserMedia({
      audio: { deviceId: { exact: id }, channelCount: 2, echoCancellation: false, noiseSuppression: false, autoGainControl: false },
    });
    this.node = ctx.createMediaStreamSource(this.stream);
    this.node.connect(this.an!);
    this.label = label;
  }

  /** an audio element (heard as well as seen) */
  openElement(el: HTMLMediaElement, label: string) {
    this.close();
    const ctx = this.graph();
    const src = ctx.createMediaElementSource(el);
    src.connect(this.an!);
    src.connect(ctx.destination);
    this.node = src;
    this.label = label;
  }

  get on() { return !!this.node; }

  /** the spectrum, waveform and level into s; gain scales what the panels see */
  read(s: Signal, dt: number, gain = 1) {
    if (!this.an || !this.node) return false;
    this.an.getFloatFrequencyData(this.freq);
    const lo = this.an.minDecibels, span = this.an.maxDecibels - lo;
    for (let b = 0; b < BANDS; b++) {
      let m = -Infinity;
      for (let i = this.edges[b]; i <= Math.max(this.edges[b], this.edges[b + 1] - 1); i++) m = Math.max(m, this.freq[i]);
      s.spec[b] = Math.max(0, Math.min(1, (((m - lo) / span) * gain)));
    }
    this.an.getFloatTimeDomainData(this.time);
    let z = 0, peak = 0;
    for (let i = 1; i < 1024; i++) if (this.time[i - 1] < 0 && this.time[i] >= 0) { z = i; break; }
    for (let i = 0; i < WAVE; i++) {
      const v = this.time[z + i * 4] * gain;
      s.wave[i] = Math.max(-1, Math.min(1, v));
    }
    for (let i = 0; i < this.time.length; i++) peak = Math.max(peak, Math.abs(this.time[i]));
    s.level = Math.max(Math.min(1, peak * gain * 1.4), s.level * Math.exp(-dt * 3));
    return true;
  }
}
