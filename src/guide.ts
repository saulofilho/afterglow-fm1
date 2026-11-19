// SPDX-License-Identifier: GPL-3.0-only
// The guide's words: what Afterglow is, how to start, and each pattern, palette and view in context.

export const GUIDE = {
  lede: "Plug in an M-VAVE FM-1 and Afterglow turns what it plays into falling panels of light. The sound becomes water, the beat becomes ripples, and every note bends its own stripe. Use it while you jam at home, project it on stage, or put it under your stream.",
  steps: [
    ["Plug it in", "Connect the FM-1 to this computer with a USB data cable and switch it on. Use Chrome or Edge."],
    ["Connect", "Press Connect FM-1 and allow MIDI and the microphone. The \"microphone\" is the FM-1's own sound coming over USB."],
    ["Play", "Press play on the FM-1, then pick a view, a palette and a pattern at the top. Your choices stay in the link, so you can bookmark them."],
  ],
  works: "Works with any firmware: the sound always, notes and tempo when it sends MIDI, and knob names on GR!MM and COQUÍ. No FM-1 at hand? The demo plays a simulated one.",
  patterns: {
    queda: { tag: "A waterfall", see: "Bands of lines slide down like water over rock.", moves: "The louder the FM-1 plays, the faster the water falls.", best: "Pads, drones, or a calm backdrop." },
    degraus: { tag: "The spectrum as terraces", see: "Ridges step across the panel: low notes on the left, highs on the right.", moves: "Each frequency band lifts its own ridge.", best: "Seeing the bass against the hats." },
    onda: { tag: "The waveform as a waterline", see: "A shoreline drawn in the actual shape of the sound.", moves: "The FM-1's waveform, redrawn every frame.", best: "Sound design: watch a filter or a wave change the shape." },
    bumbo: { tag: "Ripples on the beat", see: "Rings open from the bottom edge, one per beat.", moves: "The tempo spaces the rings and the kick lights them up.", best: "Drum grooves and dance sets." },
    trilhas: { tag: "Four tracks, four stripes", see: "The panel split into four stripes, one per FM-1 track.", moves: "A note bends its track's stripe, and a harder note shines brighter.", best: "Seeing which track plays when." },
    compasso: { tag: "The bar, step by step", see: "Sixteen columns, like the sequencer's sixteen steps.", moves: "The MIDI clock walks the lit column across. Set the FM-1 to send its clock.", best: "Keeping time, or showing the sequencer on stage." },
  } as Record<string, { tag: string; see: string; moves: string; best: string }>,
  palettes: {
    estudio: "Graphite and one lime line. Calm and easy on the eyes for long sessions.",
    cyberpunk: "Magenta and cyan neon on violet black, for loud, fast sets.",
    matrix: "Green phosphor on black, like an old terminal. Great in dark rooms.",
    win95: "Navy, teal and system grey. Nostalgic, and it holds its contrast on a projector.",
    ambar: "A warm amber monitor glow, for lo-fi sets and late nights.",
    vapor: "Sunset pink, purple and aqua. Chill and dreamy.",
  } as Record<string, string>,
  views: [
    ["cascata", "Cascata", "All six panels stacked like a waterfall."],
    ["estudio", "Estúdio", "One big panel plus the tracks, the step, the tempo and the knobs. For playing at your desk."],
    ["palco", "Palco", "One panel fills the screen and the controls hide. For a projector or a second screen."],
    ["overlay", "Overlay", "A band at the bottom on a see-through background. Add the page to OBS as a browser source."],
  ],
};
