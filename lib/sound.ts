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
  | "join"
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

/** Ruído filtrado: serve de "whoosh" (troca de vez) e de impacto seco (assassina). */
function noise({ at = 0, dur = 0.4, gain = 0.25, freq = 900, type = "lowpass" as BiquadFilterType }) {
  const ac = audio();
  if (!ac || !master) return;
  const t0 = ac.currentTime + at;
  const frames = Math.floor(ac.sampleRate * dur);
  const buffer = ac.createBuffer(1, frames, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames);
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = type;
  filter.frequency.setValueAtTime(freq, t0);
  const env = ac.createGain();
  env.gain.setValueAtTime(gain, t0);
  env.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(filter).connect(env).connect(master);
  src.start(t0);
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
    case "win": // fanfarra curta
      note(523, { type: "triangle", dur: 0.16, gain: 0.36 });
      note(659, { type: "triangle", at: 0.12, dur: 0.16, gain: 0.36 });
      note(784, { type: "triangle", at: 0.24, dur: 0.18, gain: 0.36 });
      note(1047, { type: "sine", at: 0.36, dur: 0.6, gain: 0.4 });
      break;
    case "join":
      note(587, { type: "sine", dur: 0.1, gain: 0.26, to: 784 });
      break;
    case "deal": {
      // 25 cartas caindo na mesa: um "flap" de papel atrás do outro, acelerando
      for (let i = 0; i < 12; i++) {
        const at = i * 0.045 + Math.random() * 0.012;
        noise({ at, dur: 0.1, gain: 0.16 + Math.random() * 0.07, freq: 1400 + Math.random() * 1600, type: "bandpass" });
      }
      note(330, { type: "triangle", at: 0.55, dur: 0.14, gain: 0.26 });
      note(494, { type: "triangle", at: 0.66, dur: 0.16, gain: 0.26 });
      note(659, { type: "sine", at: 0.78, dur: 0.5, gain: 0.3 });
      break;
    }
  }
}
