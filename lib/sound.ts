"use client";

/**
 * Sons sintetizados na hora (Web Audio), sem arquivo nenhum: liga rápido, não pesa no deploy
 * e não depende de biblioteca de áudio. Cada efeito é uma nota curta com envelope.
 */

export type Sfx =
  | "vote"
  | "unvote"
  | "clue"
  | "turn"
  | "own"
  | "neutral"
  | "enemy"
  | "assassin"
  | "win"
  | "lose"
  | "join"
  | "enlist"
  | "enlistOther"
  | "deal";

const MUTE_KEY = "lead-secreto:mute";

let ctx: AudioContext | null = null;
let master: GainNode | null = null;
let muted = false;

export function loadMuted(): boolean {
  try {
    muted = localStorage.getItem(MUTE_KEY) === "1";
  } catch {}
  return muted;
}

export function setMuted(value: boolean) {
  muted = value;
  try {
    localStorage.setItem(MUTE_KEY, value ? "1" : "0");
  } catch {}
}

/** O navegador só deixa tocar depois de um gesto do usuário; por isso o contexto nasce preguiçoso. */
function audio(): AudioContext | null {
  if (typeof window === "undefined") return null;
  try {
    if (!ctx) {
      const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
      if (!Ctor) return null;
      ctx = new Ctor();
      master = ctx.createGain();
      master.gain.value = 0.34;
      master.connect(ctx.destination);
    }
    if (ctx.state === "suspended") void ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/** Destrava o áudio no primeiro clique/tecla da pessoa. */
export function unlockAudio() {
  audio();
}

type NoteOpts = { type?: OscillatorType; at?: number; dur?: number; gain?: number; to?: number };

function note(freq: number, { type = "sine", at = 0, dur = 0.16, gain = 0.5, to }: NoteOpts = {}) {
  const ac = audio();
  if (!ac || !master) return;
  const t0 = ac.currentTime + at;
  const osc = ac.createOscillator();
  const env = ac.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (to) osc.frequency.exponentialRampToValueAtTime(Math.max(40, to), t0 + dur);
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(env).connect(master);
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/** Ruído branco de 1s reaproveitado por todo mundo: cada som pega um pedaço aleatório dele. */
let noiseBuffer: AudioBuffer | null = null;
function whiteNoise(ac: AudioContext) {
  if (!noiseBuffer || noiseBuffer.sampleRate !== ac.sampleRate) {
    const frames = Math.floor(ac.sampleRate);
    noiseBuffer = ac.createBuffer(1, frames, ac.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < frames; i++) data[i] = Math.random() * 2 - 1;
  }
  return noiseBuffer;
}

type NoiseOpts = {
  at?: number;
  dur?: number;
  gain?: number;
  freq?: number;
  /** varredura do filtro até esta frequência: é o que dá o "fffp" do papel */
  to?: number;
  type?: BiquadFilterType;
  q?: number;
  /** ataque em segundos; curto = estalo, longo = sopro */
  attack?: number;
  /** -1 (esquerda) a 1 (direita) */
  pan?: number;
};

/** Ruído filtrado: whoosh, atrito de papel e impacto seco. */
function noise({ at = 0, dur = 0.4, gain = 0.25, freq = 900, to, type = "lowpass", q = 0.7, attack = 0.004, pan = 0 }: NoiseOpts) {
  const ac = audio();
  if (!ac || !master) return;
  const t0 = ac.currentTime + at;
  const src = ac.createBufferSource();
  src.buffer = whiteNoise(ac);
  src.loop = true;
  const filter = ac.createBiquadFilter();
  filter.type = type;
  filter.Q.value = q;
  filter.frequency.setValueAtTime(freq, t0);
  if (to) filter.frequency.exponentialRampToValueAtTime(Math.max(60, to), t0 + dur);
  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + Math.min(attack, dur / 2));
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  const out = panner(ac, pan);
  src.connect(filter).connect(env).connect(out);
  src.start(t0, Math.random() * 0.8);
  src.stop(t0 + dur + 0.02);
}

/** Corpo grave e curto: a carta batendo no feltro da mesa. */
function thump(freq: number, { at = 0, dur = 0.09, gain = 0.2, pan = 0 }) {
  const ac = audio();
  if (!ac || !master) return;
  const t0 = ac.currentTime + at;
  const osc = ac.createOscillator();
  osc.type = "sine";
  osc.frequency.setValueAtTime(freq, t0);
  osc.frequency.exponentialRampToValueAtTime(freq * 0.55, t0 + dur);
  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + 0.003);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(env).connect(panner(ac, pan));
  osc.start(t0);
  osc.stop(t0 + dur + 0.02);
}

/** Espalha o som pela mesa; se o navegador não tiver panner, cai no master mesmo. */
function panner(ac: AudioContext, pan: number): AudioNode {
  if (!master) throw new Error("sem master");
  if (!pan || !ac.createStereoPanner) return master;
  const node = ac.createStereoPanner();
  node.pan.value = Math.max(-1, Math.min(1, pan));
  node.connect(master);
  return node;
}

/**
 * Uma carta: o atrito do papel saindo do baralho (agudo, varrendo para baixo)
 * e o tapinha dela caindo na mesa logo em seguida.
 */
function card({ at = 0, gain = 1, pan = 0 }) {
  const bright = 3200 + Math.random() * 1800;
  noise({ at, dur: 0.05 + Math.random() * 0.02, gain: 0.2 * gain, freq: bright, to: bright * 0.35, type: "bandpass", q: 1.1, attack: 0.002, pan });
  const land = at + 0.022 + Math.random() * 0.012;
  noise({ at: land, dur: 0.045, gain: 0.14 * gain, freq: 900 + Math.random() * 400, to: 260, type: "lowpass", attack: 0.001, pan });
  thump(150 + Math.random() * 45, { at: land, dur: 0.075, gain: 0.16 * gain, pan });
}

/** Sopro de trombone com glissando: a base do "quan quan quan quaaan" da derrota. */
function brass(freq: number, { at = 0, dur = 0.34, gain = 0.28, from, to, vibrato = 0, pan = 0 }: { at?: number; dur?: number; gain?: number; from?: number; to?: number; vibrato?: number; pan?: number }) {
  const ac = audio();
  if (!ac || !master) return;
  const t0 = ac.currentTime + at;
  const osc = ac.createOscillator();
  osc.type = "sawtooth";
  osc.frequency.setValueAtTime(from ?? freq * 1.08, t0);
  osc.frequency.exponentialRampToValueAtTime(freq, t0 + Math.min(0.14, dur * 0.45));
  if (to) osc.frequency.exponentialRampToValueAtTime(to, t0 + dur);
  if (vibrato) {
    const lfo = ac.createOscillator();
    const depth = ac.createGain();
    lfo.frequency.value = 5.4;
    depth.gain.value = vibrato;
    lfo.connect(depth).connect(osc.frequency);
    lfo.start(t0);
    lfo.stop(t0 + dur + 0.05);
  }
  // filtro fechando = surdina do trombone
  const filter = ac.createBiquadFilter();
  filter.type = "lowpass";
  filter.Q.value = 5;
  filter.frequency.setValueAtTime(freq * 5, t0);
  filter.frequency.exponentialRampToValueAtTime(Math.max(300, freq * 1.7), t0 + dur);
  const env = ac.createGain();
  env.gain.setValueAtTime(0.0001, t0);
  env.gain.exponentialRampToValueAtTime(gain, t0 + 0.05);
  env.gain.setValueAtTime(gain, t0 + dur * 0.62);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(filter).connect(env).connect(panner(ac, pan));
  osc.start(t0);
  osc.stop(t0 + dur + 0.05);
}

/** Plateia batendo palma: um monte de estalos curtos espalhados, com o barulho da sala por baixo. */
function applause({ at = 0, dur = 2 }) {
  for (let i = 0; i < 64; i++) {
    // mais denso no começo, como palma de verdade: todo mundo entra junto e vai soltando
    const when = at + Math.pow(Math.random(), 1.6) * dur;
    noise({
      at: when,
      dur: 0.02 + Math.random() * 0.025,
      gain: 0.04 + Math.random() * 0.055,
      freq: 1100 + Math.random() * 2400,
      to: 600,
      type: "bandpass",
      q: 1.5,
      attack: 0.001,
      pan: (Math.random() * 2 - 1) * 0.85,
    });
  }
  noise({ at, dur: dur * 0.9, gain: 0.07, freq: 1900, to: 800, type: "bandpass", q: 0.8, attack: 0.3 });
}

export function play(sfx: Sfx) {
  if (muted) return;
  switch (sfx) {
    case "vote":
      note(660, { type: "triangle", dur: 0.08, gain: 0.32, to: 880 });
      break;
    case "unvote":
      note(520, { type: "triangle", dur: 0.08, gain: 0.22, to: 380 });
      break;
    case "clue": // máquina de escrever + sino do dossiê
      noise({ dur: 0.09, gain: 0.2, freq: 2600, type: "highpass" });
      note(988, { type: "sine", at: 0.06, dur: 0.5, gain: 0.3 });
      note(1319, { type: "sine", at: 0.12, dur: 0.55, gain: 0.22 });
      break;
    case "turn":
      noise({ dur: 0.45, gain: 0.16, freq: 700 });
      note(294, { type: "sine", dur: 0.3, gain: 0.3, to: 440 });
      break;
    case "own": // acertou: arpejo maior subindo
      note(523, { type: "triangle", dur: 0.13, gain: 0.38 });
      note(659, { type: "triangle", at: 0.09, dur: 0.14, gain: 0.36 });
      note(880, { type: "sine", at: 0.18, dur: 0.35, gain: 0.32 });
      break;
    case "neutral": // lead frio: baque sem graça
      note(196, { type: "sine", dur: 0.26, gain: 0.34, to: 130 });
      noise({ dur: 0.16, gain: 0.12, freq: 500 });
      break;
    case "enemy": // entregou carta pro adversário
      note(392, { type: "sawtooth", dur: 0.16, gain: 0.22, to: 330 });
      note(262, { type: "sawtooth", at: 0.13, dur: 0.3, gain: 0.2, to: 208 });
      break;
    case "assassin": // churn: impacto grave e longo
      noise({ dur: 0.7, gain: 0.34, freq: 380 });
      note(110, { type: "sawtooth", dur: 0.9, gain: 0.34, to: 48 });
      note(73, { type: "square", at: 0.05, dur: 1.1, gain: 0.2, to: 40 });
      break;
    case "win": // fanfarra curta e a sala aplaudindo
      note(523, { type: "triangle", dur: 0.16, gain: 0.34 });
      note(659, { type: "triangle", at: 0.12, dur: 0.16, gain: 0.34 });
      note(784, { type: "triangle", at: 0.24, dur: 0.18, gain: 0.34 });
      note(1047, { type: "sine", at: 0.36, dur: 0.6, gain: 0.38 });
      applause({ at: 0.3, dur: 2.2 });
      break;
    case "lose": // trombone de derrota: quan, quan, quan, quaaannn
      brass(349, { at: 0, dur: 0.32, from: 392 });
      brass(330, { at: 0.34, dur: 0.32, from: 349 });
      brass(311, { at: 0.68, dur: 0.32, from: 330 });
      brass(294, { at: 1.02, dur: 1.25, from: 311, to: 208, gain: 0.3, vibrato: 7 });
      break;
    case "join":
      note(587, { type: "sine", dur: 0.1, gain: 0.26, to: 784 });
      break;
    case "enlist": // seu nome entrando no dossiê: carimbo na mesa e a insígnia confirmando
      noise({ dur: 0.05, gain: 0.26, freq: 2200, to: 500, type: "lowpass", attack: 0.001 });
      thump(95, { dur: 0.13, gain: 0.3 });
      note(523, { type: "triangle", at: 0.1, dur: 0.12, gain: 0.3 });
      note(784, { type: "triangle", at: 0.19, dur: 0.16, gain: 0.32 });
      note(1568, { type: "sine", at: 0.28, dur: 0.5, gain: 0.16 });
      break;
    case "enlistOther": // alguém do time entrou: só o carimbo, discreto
      noise({ dur: 0.045, gain: 0.14, freq: 1800, to: 450, type: "lowpass", attack: 0.001 });
      thump(105, { dur: 0.1, gain: 0.16 });
      note(659, { type: "triangle", at: 0.09, dur: 0.12, gain: 0.12 });
      break;
    case "deal": {
      // Embaralha e distribui: riffle curto e depois as cartas caindo espalhadas pela mesa.
      for (let i = 0; i < 20; i++) {
        const at = 0.012 * i + Math.random() * 0.006;
        noise({ at, dur: 0.018, gain: 0.07 + Math.random() * 0.05, freq: 2600 + i * 120, to: 1400, type: "bandpass", q: 2.2, attack: 0.001, pan: (Math.random() - 0.5) * 0.5 });
      }
      noise({ at: 0.26, dur: 0.1, gain: 0.12, freq: 1200, to: 300, type: "lowpass" });
      thump(120, { at: 0.27, dur: 0.12, gain: 0.16 });
      // 13 cartas, ritmo humano (acelera e alivia no fim), alternando os lados da mesa
      let at = 0.4;
      for (let i = 0; i < 13; i++) {
        card({ at, gain: 0.85 + Math.random() * 0.3, pan: (i % 2 ? 0.5 : -0.5) * (0.5 + Math.random() * 0.5) });
        at += 0.075 - Math.min(i, 8) * 0.004 + Math.random() * 0.022;
      }
      note(330, { type: "triangle", at: at + 0.06, dur: 0.14, gain: 0.2 });
      note(494, { type: "triangle", at: at + 0.17, dur: 0.16, gain: 0.2 });
      note(659, { type: "sine", at: at + 0.29, dur: 0.5, gain: 0.24 });
      break;
    }
  }
}
