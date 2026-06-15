// Centralized WebAudio with a global limiter (DynamicsCompressor + master gain)
// so multiple simultaneous sounds never peak.
let _ctx: AudioContext | null = null;
let _master: GainNode | null = null;

export function audio(): { ctx: AudioContext; master: GainNode } | null {
  if (typeof window === "undefined") return null;
  if (!_ctx) {
    try {
      const Ctor =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext })
          .webkitAudioContext;
      _ctx = new Ctor();
    } catch {
      return null;
    }
    // Limiter chain: compressor (brick-wall-ish) → master gain → destination
    const comp = _ctx.createDynamicsCompressor();
    comp.threshold.value = -18; // start limiting early
    comp.knee.value = 6;
    comp.ratio.value = 20; // near brick-wall
    comp.attack.value = 0.002;
    comp.release.value = 0.18;
    _master = _ctx.createGain();
    _master.gain.value = 0.55; // overall calm level
    comp.connect(_master).connect(_ctx.destination);
    // Expose comp as the input node by aliasing master = comp's input
    // We achieve this by routing callers to comp via a fresh getter:
    (_master as GainNode & { _input?: AudioNode })._input = comp;
  }
  if (_ctx.state === "suspended") _ctx.resume().catch(() => {});
  // Callers connect into the limiter input
  const input = (_master as GainNode & { _input?: AudioNode })._input as AudioNode;
  return { ctx: _ctx, master: input as GainNode };
}

/**
 * Zen "wood click / soft glass tap" for task completion or deletion.
 * Low-volume, crisp, no harsh highs (everything low-passed under ~3.2kHz).
 */
export function playGlassBreak() {
  const a = audio();
  if (!a) return;
  const { ctx, master } = a;
  const now = ctx.currentTime;

  // Shared low-pass to keep things organic & free of harsh frequencies
  const lp = ctx.createBiquadFilter();
  lp.type = "lowpass";
  lp.frequency.value = 3200;
  lp.Q.value = 0.4;
  const bus = ctx.createGain();
  bus.gain.value = 0.5;
  lp.connect(bus).connect(master);

  // 1) Soft wood-snap body (sine, short pitch drop)
  const o1 = ctx.createOscillator();
  o1.type = "sine";
  o1.frequency.setValueAtTime(740, now);
  o1.frequency.exponentialRampToValueAtTime(280, now + 0.16);
  const g1 = ctx.createGain();
  g1.gain.setValueAtTime(0.0001, now);
  g1.gain.exponentialRampToValueAtTime(0.6, now + 0.008);
  g1.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
  o1.connect(g1).connect(lp);
  o1.start(now);
  o1.stop(now + 0.24);

  // 2) Gentle high partial (triangle) for "glass click" sparkle — quiet
  const o2 = ctx.createOscillator();
  o2.type = "triangle";
  o2.frequency.setValueAtTime(1480, now + 0.005);
  o2.frequency.exponentialRampToValueAtTime(980, now + 0.2);
  const g2 = ctx.createGain();
  g2.gain.setValueAtTime(0.0001, now + 0.005);
  g2.gain.exponentialRampToValueAtTime(0.18, now + 0.02);
  g2.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
  o2.connect(g2).connect(lp);
  o2.start(now + 0.005);
  o2.stop(now + 0.27);

  // 3) Brief, very soft filtered noise tick (organic crack)
  const dur = 0.08;
  const buf = ctx.createBuffer(1, Math.max(1, Math.floor(ctx.sampleRate * dur)), ctx.sampleRate);
  const data = buf.getChannelData(0);
  for (let i = 0; i < data.length; i++) {
    const t = i / data.length;
    data[i] = (Math.random() * 2 - 1) * Math.pow(1 - t, 3);
  }
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const bp = ctx.createBiquadFilter();
  bp.type = "bandpass";
  bp.frequency.value = 1600;
  bp.Q.value = 0.7;
  const gN = ctx.createGain();
  gN.gain.setValueAtTime(0.0001, now);
  gN.gain.exponentialRampToValueAtTime(0.14, now + 0.006);
  gN.gain.exponentialRampToValueAtTime(0.0001, now + dur);
  src.connect(bp).connect(gN).connect(lp);
  src.start(now);
  src.stop(now + dur);
}
