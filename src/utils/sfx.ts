// src/utils/sfx.ts
// 用 Web Audio API 即時合成遊戲音效

let audioCtx: AudioContext | null = null;
let lastMoveTime = 0;
let lastRotateTime = 0;
let lastHoldTime = 0;

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
  try {
    const ctx = getCtx();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freqStart, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), ctx.currentTime + duration);
    gain.gain.setValueAtTime(Math.max(0.001, volume), ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + duration);
    osc.connect(gain).connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + duration);
  } catch {
    // 忽略音訊錯誤
  }
}

// 移動音效（音量放大 2.5 倍：0.04 → 0.10）
export function playMoveSFX(volume = 0.3) {
  const now = Date.now();
  if (now - lastMoveTime < 30) return;
  lastMoveTime = now;
  playTone(180, 140, 0.04, 'square', 0.10 * volume);
}

// 旋轉音效（音量放大 2.5 倍：0.05 → 0.13）
export function playRotateSFX(volume = 0.3) {
  const now = Date.now();
  if (now - lastRotateTime < 50) return;
  lastRotateTime = now;
  playTone(420, 620, 0.06, 'triangle', 0.13 * volume);
}

// 硬降音效（音量放大 2.5 倍：0.08 → 0.20）
export function playHardDropSFX(volume = 0.3) {
  playTone(320, 80, 0.1, 'sawtooth', 0.20 * volume);
}

// 鎖定音效（音量放大 2.5 倍：0.07 → 0.18）
export function playLockSFX(volume = 0.3) {
  playTone(140, 90, 0.08, 'sine', 0.18 * volume);
}

// 消除行音效（音量放大 2.5 倍：0.06 → 0.15）
export function playLineClearSFX(volume = 0.3, lines = 1) {
  const baseFreq = 520;
  const steps = Math.min(lines, 4);
  for (let i = 0; i < steps; i++) {
    setTimeout(() => {
      playTone(baseFreq + i * 130, baseFreq + i * 130 + 200, 0.12, 'sine', 0.15 * volume);
    }, i * 50);
  }
}

// Hold 音效（音量放大 2.5 倍：0.05 → 0.13）
export function playHoldSFX(volume = 0.3) {
  const now = Date.now();
  if (now - lastHoldTime < 50) return;
  lastHoldTime = now;
  playTone(600, 400, 0.08, 'triangle', 0.13 * volume);
}
