// SPDX-License-Identifier: GPL-3.0-only
// Afterglow: the page. Sources (audio, MIDI, the GR!MM-family adapter, the demo) fill one Signal; the view's panels
// draw it every frame.

import "./style.css";
import { Clock, decayNotes, emptySignal, Onsets } from "./signal";
import { AudioIn, FM1_NAME } from "./sources/audio";
import { MidiIn } from "./sources/midi";
import { findGrimm, Grimm } from "./sources/grimm";
import { demoFill } from "./sources/demo";
import { PATTERNS, patternById } from "./render/patterns";
import { Panel, PALETTES, paletteById } from "./render/panel";
import { DEFAULT, parsePreset, presetHash, type Preset, VIEWS } from "./presets";

const $ = <T extends HTMLElement>(id: string) => document.getElementById(id) as T;
const sig = emptySignal(), clock = new Clock(), onsets = new Onsets(), midi = new MidiIn(sig, clock), audio = new AudioIn();
let grimm: Grimm | null = null, demo = false, panels: Panel[] = [];

// ------------------------------------------------------------------ the preset: the link, then what was chosen last
let saved: Preset = DEFAULT;
try { saved = parsePreset(localStorage.getItem("afterglow") ?? "", DEFAULT); } catch { /* (no storage) */ }
let pre = parsePreset(location.hash, saved);
function commit() {
  try { localStorage.setItem("afterglow", presetHash(pre)); } catch { /* (no storage) */ }
  history.replaceState(null, "", presetHash(pre) || location.pathname + location.search);
  build();
}

const status = (t: string, err = false) => { $("status").textContent = t; $("status").classList.toggle("err", err); };
function fill(sel: HTMLSelectElement, items: [string, string][], v: string) {
  sel.innerHTML = items.map(([k, n]) => `<option value="${k}">${n}</option>`).join("");
  sel.value = v;
}
const VIEW_NAMES: Record<string, string> = { cascata: "View: cascata", estudio: "View: estúdio", palco: "View: palco", overlay: "View: overlay" };
fill($("sel-view"), VIEWS.map((v) => [v, VIEW_NAMES[v]]), pre.view);
fill($("sel-pal"), [["mix", "Palette: mixed"], ...PALETTES.map((p): [string, string] => [p.id, "Palette: " + p.name])], pre.pal);
fill($("sel-pat"), PATTERNS.map((p): [string, string] => [p.id, "Pattern: " + p.name]), pre.pat);
fill($("sel-lines"), [2, 3, 4, 5].map((n): [string, string] => [String(n), `Lines: ${n} px`]), String(pre.lines));
($("in-gain") as HTMLInputElement).value = String(pre.gain);
$("sel-view").onchange = (e) => { pre.view = (e.target as HTMLSelectElement).value as Preset["view"]; commit(); };
$("sel-pal").onchange = (e) => { pre.pal = (e.target as HTMLSelectElement).value; commit(); };
$("sel-pat").onchange = (e) => { pre.pat = (e.target as HTMLSelectElement).value; commit(); };
$("sel-lines").onchange = (e) => { pre.lines = Number((e.target as HTMLSelectElement).value); commit(); };
$("in-gain").oninput = (e) => { pre.gain = Number((e.target as HTMLInputElement).value); commit(); };
addEventListener("hashchange", () => { pre = parsePreset(location.hash, pre); build(); });

// ------------------------------------------------------------------ the views
let side: { title: HTMLElement; bpm: HTMLElement; src: HTMLElement; prm: HTMLElement } | null = null;
function panel(parent: HTMLElement, patId: string, palId: string, cls = "") {
  const p = new Panel(patternById(patId), paletteById(palId));
  p.spacing = pre.lines, p.px = pre.px, p.transparent = pre.view === "overlay";
  const box = document.createElement("div");
  box.className = "pan " + cls;
  box.append(p.canvas);
  const cap = document.createElement("span");
  cap.className = "cap";
  cap.innerHTML = `<b>${p.pattern.name}</b>${paletteById(palId).name}`;
  box.append(cap);
  parent.append(box);
  panels.push(p);
  return p;
}
function build() {
  const st = $("stage");
  st.className = "v-" + pre.view;
  st.innerHTML = "";
  panels = [], side = null;
  document.body.classList.toggle("overlay", pre.view === "overlay");
  const pal = (own: string) => (pre.pal === "mix" ? own : pre.pal);
  if (pre.view === "cascata") PATTERNS.forEach((p) => panel(st, p.id, pal(p.pal)));
  else if (pre.view === "estudio") {
    const main = patternById(pre.pat);
    panel(st, main.id, pal(main.pal), "main");
    const sd = document.createElement("div");
    sd.className = "side";
    sd.innerHTML = `<h2>Playing</h2><div class="title" id="s-title">—</div><h2>Tempo</h2><div class="num" id="s-bpm">—</div>
      <h2>Sources</h2><div class="title" id="s-src">—</div><h2>Knobs</h2><div class="prm" id="s-prm"></div>`;
    st.append(sd);
    side = { title: sd.querySelector("#s-title")!, bpm: sd.querySelector("#s-bpm")!, src: sd.querySelector("#s-src")!, prm: sd.querySelector("#s-prm")! };
    const tr = patternById("trilhas"), cp = patternById("compasso");
    panel(st, tr.id, pal(tr.pal), "thin").canvas.parentElement!.style.cssText = "grid-column:1;grid-row:2";
    panel(st, cp.id, pal(cp.pal), "thin").canvas.parentElement!.style.cssText = "grid-column:1;grid-row:3";
  } else {
    const main = patternById(pre.pat);
    panel(st, main.id, pal(main.pal));
  }
  $("sel-view").setAttribute("value", pre.view);
  ($("sel-view") as HTMLSelectElement).value = pre.view;
  hideLater();
}

// the bar hides itself on the stage and overlay views until the pointer moves
let hideT = 0;
function hideLater() {
  $("bar").classList.remove("hide");
  clearTimeout(hideT);
  if (pre.view === "palco" || pre.view === "overlay") hideT = window.setTimeout(() => $("bar").classList.add("hide"), 2500);
}
addEventListener("pointermove", hideLater);
addEventListener("keydown", (e) => {
  if ((e.target as HTMLElement).matches("input, select")) return;
  const i = "1234".indexOf(e.key);
  if (i >= 0) { pre.view = VIEWS[i]; commit(); }
  if (e.key === "f") $("bt-full").click();
  hideLater();
});
$("bt-full").onclick = () => { if (document.fullscreenElement) void document.exitFullscreen(); else void document.documentElement.requestFullscreen?.().catch(() => {}); };

// ------------------------------------------------------------------ the sources
$("bt-demo").onclick = () => {
  demo = !demo;
  sig.source.demo = demo;
  $("bt-demo").classList.toggle("on", demo);
  if (!demo) { sig.title = ""; sig.params = []; sig.notes.fill(0); }
  status(demo ? "Demo: a simulated FM-1 plays a dembow at 95 BPM." : "Demo off.");
};

async function pickAudio(auto: boolean) {
  try {
    const devs = await AudioIn.inputs(), sel = $("sel-audio") as HTMLSelectElement;
    fill(sel, [["", "Sound: off"], ...devs.map((d): [string, string] => [d.deviceId, "Sound: " + (d.label || "input")])], "");
    const fm = devs.find((d) => FM1_NAME.test(d.label));
    if (fm) { sel.value = fm.deviceId; await audio.openInput(fm.deviceId, fm.label); sig.source.audio = fm.label; }
    else if (!auto) status("Pick the FM-1 in the Sound list. Without USB audio, use any input it is plugged into.");
  } catch (e) { status(`Sound: ${(e as Error).message}`, true); }
}
$("sel-audio").onfocus = () => { if (($("sel-audio") as HTMLSelectElement).options.length < 2) void pickAudio(false); };
$("sel-audio").onchange = async (e) => {
  const sel = e.target as HTMLSelectElement;
  if (!sel.value) { audio.close(); sig.source.audio = ""; return; }
  try { await audio.openInput(sel.value, sel.selectedOptions[0].text); sig.source.audio = sel.selectedOptions[0].text.replace(/^Sound: /, ""); }
  catch (x) { status(`Sound: ${(x as Error).message}`, true); }
};

$("bt-connect").onclick = async () => {
  if (!navigator.requestMIDIAccess) return status("This browser has no Web MIDI: use Chrome or Edge. The sound still works.", true);
  try {
    status("Looking for the FM-1…");
    let acc: MIDIAccess;
    try { acc = await navigator.requestMIDIAccess({ sysex: true }); }
    catch { acc = await navigator.requestMIDIAccess(); }    // (no SysEx allowed: notes, clock and CCs only)
    const g = acc.sysexEnabled ? await findGrimm(acc) : null;
    const ins = g ? [g.input] : [...acc.inputs.values()].filter((i) => FM1_NAME.test(i.name ?? "")).concat(
      [...acc.inputs.values()].filter((i) => !FM1_NAME.test(i.name ?? "")));
    if (!ins.length) return status("No MIDI input found. Is the FM-1 plugged in with a data cable?", true);
    const input = ins[0];
    if (g) {
      grimm = new Grimm((b) => g.output.send(b));
      const fw = await grimm.info();
      sig.source.adapter = fw;
    }
    input.onmidimessage = (e) => {
      const d = e.data!;
      if (d[0] === 0xf0) grimm?.onSysex(d);
      else midi.handle(d, performance.now());
    };
    sig.source.midi = input.name ?? "MIDI";
    $("bt-connect").textContent = "Connected";
    $("bt-connect").classList.remove("hot");
    status(g ? `Connected: ${grimm!.firmware} on ${input.name}. Knobs, notes and clock.` : `Connected to ${input.name}: notes, clock and CCs.`);
    if (!audio.on) void pickAudio(true);
    if (grimm) void poll();
  } catch (e) { status(`MIDI: ${(e as Error).message}. Allow MIDI for this page in the browser's site settings.`, true); }
};

async function poll() {
  let fails = 0;
  while (grimm) {
    try { if (!demo) await grimm.poll(sig); fails = 0; }
    catch { if (++fails > 5) { status("The FM-1 does not answer its knobs any more: is it still plugged in?", true); await sleep(1000); } }
    await sleep(90);
  }
}
const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ------------------------------------------------------------------ the loop
let last = performance.now(), slow = 0;
function frame(now: number) {
  const dt = Math.min(0.1, (now - last) / 1000);
  last = now;
  sig.t = now / 1000;
  decayNotes(sig, dt);
  if (demo) demoFill(sig, sig.t);
  else {
    if (!audio.read(sig, dt, pre.gain)) { sig.spec.fill(0); sig.wave.fill(0); sig.level *= Math.exp(-dt * 3); }
    onsets.update(sig, dt);
    clock.update(sig, now, dt);
    if (!grimm && midi.hasCC) sig.params = midi.ccParams();
  }
  for (const p of panels) p.draw(sig);
  if (side && (slow += dt) > 0.1) {
    slow = 0;
    side.title.textContent = sig.title || "—";
    side.bpm.textContent = sig.clocked || demo ? `${Math.round(sig.bpm)} BPM · ${sig.step + 1}/16` : "no clock";
    side.src.textContent = [demo && "demo", sig.source.audio && "sound: " + sig.source.audio, sig.source.midi && "midi: " + sig.source.midi,
      sig.source.adapter && "knobs: " + sig.source.adapter].filter(Boolean).join(" · ") || "none yet";
    side.prm.innerHTML = [...sig.params, ...sig.fx.filter((f) => f.value > 0).slice(0, 8)].map((p) =>
      `<div class="row"><span>${p.name}</span><b>${p.text}</b></div><div class="track"><div class="fill" style="width:${(100 * p.value) / Math.max(1, p.max)}%"></div></div>`).join("");
  }
  requestAnimationFrame(frame);
}
build();
if (new URLSearchParams(location.search).has("demo")) $("bt-demo").click();
requestAnimationFrame(frame);
