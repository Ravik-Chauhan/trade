// All sound is synthesised at runtime with the Web Audio API — no audio files,
// fully original. An engine drone whose pitch tracks RPM, plus one-shot SFX.

export class AudioEngine {
  private ctx: AudioContext | null = null
  private master: GainNode | null = null
  private engineOsc: OscillatorNode | null = null
  private engineSub: OscillatorNode | null = null
  private engineGain: GainNode | null = null
  private engineFilter: BiquadFilterNode | null = null
  enabled = true
  private running = false

  /** Must be called from a user gesture to satisfy autoplay policies. */
  resume(): void {
    if (!this.enabled) return
    if (!this.ctx) this.init()
    if (this.ctx && this.ctx.state === 'suspended') void this.ctx.resume()
  }

  setEnabled(on: boolean): void {
    this.enabled = on
    if (!on) {
      this.stopEngine()
      if (this.master) this.master.gain.value = 0
    } else if (this.master) {
      this.master.gain.value = 0.9
    }
  }

  private init(): void {
    type Win = Window & { webkitAudioContext?: typeof AudioContext }
    const Ctor = window.AudioContext || (window as Win).webkitAudioContext
    if (!Ctor) return
    this.ctx = new Ctor()
    this.master = this.ctx.createGain()
    this.master.gain.value = 0.9
    this.master.connect(this.ctx.destination)
  }

  startEngine(): void {
    if (!this.enabled) return
    if (!this.ctx) this.init()
    if (!this.ctx || !this.master || this.running) return
    const ctx = this.ctx
    this.engineGain = ctx.createGain()
    this.engineGain.gain.value = 0.0
    this.engineFilter = ctx.createBiquadFilter()
    this.engineFilter.type = 'lowpass'
    this.engineFilter.frequency.value = 900
    this.engineOsc = ctx.createOscillator()
    this.engineOsc.type = 'sawtooth'
    this.engineSub = ctx.createOscillator()
    this.engineSub.type = 'square'
    this.engineOsc.connect(this.engineFilter)
    this.engineSub.connect(this.engineFilter)
    this.engineFilter.connect(this.engineGain)
    this.engineGain.connect(this.master)
    this.engineOsc.start()
    this.engineSub.start()
    this.running = true
  }

  stopEngine(): void {
    try {
      this.engineOsc?.stop()
      this.engineSub?.stop()
    } catch {
      /* already stopped */
    }
    this.engineOsc = null
    this.engineSub = null
    this.engineGain = null
    this.running = false
  }

  /** rpm 0..1, load 0..1 (throttle). */
  updateEngine(rpm: number, throttle: number): void {
    if (!this.ctx || !this.running || !this.engineOsc || !this.engineSub || !this.engineGain || !this.engineFilter) return
    const base = 55 + rpm * 240
    const now = this.ctx.currentTime
    this.engineOsc.frequency.setTargetAtTime(base, now, 0.04)
    this.engineSub.frequency.setTargetAtTime(base * 0.5, now, 0.04)
    this.engineFilter.frequency.setTargetAtTime(500 + rpm * 2600, now, 0.05)
    this.engineGain.gain.setTargetAtTime(0.06 + throttle * 0.1 + rpm * 0.04, now, 0.05)
  }

  private blip(freq: number, dur: number, type: OscillatorType, vol: number, sweepTo?: number): void {
    if (!this.enabled) return
    if (!this.ctx) this.init()
    if (!this.ctx || !this.master) return
    const ctx = this.ctx
    const o = ctx.createOscillator()
    const g = ctx.createGain()
    o.type = type
    o.frequency.setValueAtTime(freq, ctx.currentTime)
    if (sweepTo) o.frequency.exponentialRampToValueAtTime(Math.max(20, sweepTo), ctx.currentTime + dur)
    g.gain.setValueAtTime(vol, ctx.currentTime)
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + dur)
    o.connect(g)
    g.connect(this.master)
    o.start()
    o.stop(ctx.currentTime + dur + 0.02)
  }

  private noise(dur: number, vol: number, cutoff: number): void {
    if (!this.enabled) return
    if (!this.ctx) this.init()
    if (!this.ctx || !this.master) return
    const ctx = this.ctx
    const frames = Math.floor(ctx.sampleRate * dur)
    const buf = ctx.createBuffer(1, frames, ctx.sampleRate)
    const data = buf.getChannelData(0)
    for (let i = 0; i < frames; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / frames)
    const src = ctx.createBufferSource()
    src.buffer = buf
    const f = ctx.createBiquadFilter()
    f.type = 'lowpass'
    f.frequency.value = cutoff
    const g = ctx.createGain()
    g.gain.value = vol
    src.connect(f)
    f.connect(g)
    g.connect(this.master)
    src.start()
  }

  punch(): void {
    this.noise(0.12, 0.5, 1200)
    this.blip(180, 0.1, 'square', 0.25, 90)
  }
  hit(): void {
    this.noise(0.18, 0.7, 2200)
    this.blip(120, 0.16, 'sawtooth', 0.3, 60)
  }
  crash(): void {
    this.noise(0.5, 0.8, 3000)
    this.blip(90, 0.5, 'sawtooth', 0.4, 40)
  }
  beep(high = false): void {
    this.blip(high ? 880 : 440, 0.16, 'square', 0.3)
  }
  fanfare(): void {
    const notes = [523, 659, 784, 1047]
    notes.forEach((n, i) => setTimeout(() => this.blip(n, 0.22, 'square', 0.28), i * 130))
  }
  pickup(): void {
    this.blip(660, 0.1, 'square', 0.3, 1320)
  }
}

export const audio = new AudioEngine()
