// src/utils/sfx.ts
// 用 Web Audio API 即時合成遊戲音效，不需要下載任何檔案

let audioCtx: AudioContext | null = null;

function getCtx(): AudioContext {
  if (!audioCtx) {
    const CtxClass = window.AudioContext || (window as any).webkitAudioContext;
    audioCtx = new CtxClass();
  }
  if (audioCtx.state === 'suspended') audioCtx.resume();
  return audioCtx;
}

function playTone(
  freqStart: number,
  freqEnd: number,
  duration: number,
  type: OscillatorType,
  volume: number
) {
  const ctx = getCtx();
  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), ctx.currentTime + duration);
  gain.gain.setValueAtTime(volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
  osc.connect(gain).connect(ctx.destination);
  osc.start();
  osc.stop(ctx.currentTime + duration);
}

export function playMoveSFX(volume = 0.3) {
  playTone(180, 140, 0.04, 'square', 0.04 * volume);
}

export function playRotateSFX(volume = 0.3) {
  playTone(420, 620, 0.06, 'triangle', 0.05 * volume);
}

export function playHardDropSFX(volume = 0.3) {
  playTone(320, 80, 0.1, 'sawtooth', 0.08 * volume);
}

export function playLockSFX(volume = 0.3) {
  playTone(140, 90, 0.08, 'sine', 0.07 * volume);
}

export function playLineClearSFX(volume = 0.3, lines = 1) {
  // 消除行數越多，音階越高、越多音
  const baseFreq = 520;
  const steps = Math.min(lines, 4);
  for (let i = 0; i < steps; i++) {
    setTimeout(() => {
      playTone(baseFreq + i * 130, baseFreq + i * 130 + 200, 0.12, 'sine', 0.06 * volume);
    }, i * 50);
  }
}

export function playHoldSFX(volume = 0.3) {
  playTone(600, 400, 0.08, 'triangle', 0.05 * volume);
}