const GLOBAL_KEY = '__HOLLOW_SOMNIUM_AUDIO_STATE__';

interface AudioState {
    ctx: AudioContext | null;
    bgmMaster: GainNode | null;
    bgmStarted: boolean;
    sfxMuted: boolean;
    musicMuted: boolean;
}

const getGlobalState = (): AudioState => {
    if (!(window as any)[GLOBAL_KEY]) {
        (window as any)[GLOBAL_KEY] = {
            ctx: null,
            bgmMaster: null,
            bgmStarted: false,
            sfxMuted: false,
            musicMuted: false
        };
    }
    return (window as any)[GLOBAL_KEY];
};

const state = getGlobalState();

const initAudio = () => {
    if (!state.ctx) {
        state.ctx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (state.ctx.state === 'suspended') {
        state.ctx.resume();
    }
    return state.ctx;
};

export const setSfxMuted = (v: boolean) => { state.sfxMuted = v; };
export const setMusicMuted = (v: boolean) => {
    state.musicMuted = v;
    if (state.bgmMaster) {
        // Use a quicker ramp for instant feedback
        state.bgmMaster.gain.setTargetAtTime(v ? 0 : 0.15, state.ctx?.currentTime || 0, 0.03);
    }
};
export const getSfxMuted = () => state.sfxMuted;
export const getMusicMuted = () => state.musicMuted;

// Simple reverb via convolver filled with exponentially-decaying noise
const createReverb = (ctx: AudioContext, duration = 2.5, decay = 2.0): ConvolverNode => {
    const rate = ctx.sampleRate;
    const length = rate * duration;
    const buffer = ctx.createBuffer(2, length, rate);
    for (let ch = 0; ch < 2; ch++) {
        const data = buffer.getChannelData(ch);
        for (let i = 0; i < length; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, decay);
        }
    }
    const convolver = ctx.createConvolver();
    convolver.buffer = buffer;
    return convolver;
};

const playTone = (
    ctx: AudioContext,
    masterGain: GainNode,
    reverb: ConvolverNode,
    freq: number,
    startTime: number,
    duration: number,
    volume = 0.08
) => {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = freq;

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = freq * 2.01;

    const envGain = ctx.createGain();
    envGain.gain.setValueAtTime(0, startTime);
    envGain.gain.linearRampToValueAtTime(volume, startTime + 0.5);
    envGain.gain.setValueAtTime(volume, startTime + duration - 1.5);
    envGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration);

    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0.3;

    osc.connect(envGain);
    osc2.connect(osc2Gain);
    osc2Gain.connect(envGain);

    envGain.connect(masterGain);
    envGain.connect(reverb);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.1);
    osc2.start(startTime);
    osc2.stop(startTime + duration + 0.1);
};

const scheduleAmbient = (ctx: AudioContext) => {
    // Only schedule if this call matches our current state's master gain to avoid HMR zombies
    if (!state.bgmMaster) {
        state.bgmMaster = ctx.createGain();
        state.bgmMaster.gain.value = state.musicMuted ? 0 : 0.15;
        state.bgmMaster.connect(ctx.destination);
    }
    
    const phraseGain = ctx.createGain();
    phraseGain.connect(state.bgmMaster);

    const reverb = createReverb(ctx, 4.0, 3.5);
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.5;
    reverb.connect(reverbGain);
    reverbGain.connect(phraseGain); 

    const scale = [55.0, 65.41, 73.42, 82.41, 98.00, 110.00, 130.81, 146.83];
    const now = ctx.currentTime;
    const totalDuration = 32;

    const sequence = [
        { noteIdx: 0, start: 0,    dur: 12 },
        { noteIdx: 2, start: 4,    dur: 10 },
        { noteIdx: 4, start: 9,    dur: 8  },
        { noteIdx: 1, start: 14,   dur: 10 },
        { noteIdx: 5, start: 16,   dur: 12 },
        { noteIdx: 3, start: 20,   dur: 8  },
        { noteIdx: 6, start: 24,   dur: 10 },
        { noteIdx: 0, start: 28,   dur: 8  },
    ];

    for (const step of sequence) {
        playTone(ctx, phraseGain, reverb, scale[step.noteIdx], now + step.start, step.dur);
        if (Math.random() > 0.5) {
            playTone(ctx, phraseGain, reverb, scale[step.noteIdx] * 2, now + step.start + 0.3, step.dur * 0.7, 0.03);
        }
    }

    setTimeout(() => {
        // Double check state.ctx hasn't changed? Wait, it shouldn't.
        // But importantly, only keep looping if this is the active context.
        if (state.ctx === ctx) scheduleAmbient(ctx);
    }, (totalDuration - 4) * 1000);
};

export const playBGM = () => {
    const ctx = initAudio();
    if (state.bgmStarted) return;
    state.bgmStarted = true;
    scheduleAmbient(ctx);
};

// SFX play helpers
const playSFX = (setup: (ctx: AudioContext) => { source: AudioNode | AudioBufferSourceNode, gain: GainNode, duration: number }) => {
    if (state.sfxMuted) return;
    const ctx = initAudio();
    const { source, gain, duration } = setup(ctx);
    gain.connect(ctx.destination);
    const t = ctx.currentTime;
    if (source instanceof AudioBufferSourceNode) {
        source.start(t);
    } else if (source instanceof OscillatorNode) {
        source.start(t);
        source.stop(t + duration);
    }
};

export const playSquelch = () => playSFX(ctx => {
    const t = ctx.currentTime;
    const osc = ctx.createOscillator();
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.12);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
    osc.connect(gain);
    return { source: osc, gain, duration: 0.15 };
});

export const playTear = () => playSFX(ctx => {
    const t = ctx.currentTime;
    const duration = 0.4;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(4000, t);
    filter.frequency.exponentialRampToValueAtTime(400, t + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    noise.connect(filter);
    filter.connect(gain);
    return { source: noise, gain, duration };
});

export const playSwipe = () => playSFX(ctx => {
    const t = ctx.currentTime;
    const duration = 0.35;
    const bufferSize = ctx.sampleRate * duration;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        const pos = i / bufferSize;
        data[i] = (Math.random() * 2 - 1) * Math.pow(Math.sin(pos * Math.PI), 0.5) * (1 - pos * 0.5);
    }
    const noise = ctx.createBufferSource();
    noise.buffer = buffer;
    const bpf = ctx.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.setValueAtTime(1800, t);
    bpf.frequency.exponentialRampToValueAtTime(600, t + duration);
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);
    noise.connect(bpf);
    bpf.connect(gain);
    return { source: noise, gain, duration };
});

export const playMeld = () => {
    if (state.sfxMuted) return;
    const ctx = initAudio();
    const t = ctx.currentTime;
    const tones = [
        { startFreq: 110, endFreq: 220, delay: 0,    vol: 0.25, dur: 1.0 },
        { startFreq: 146, endFreq: 294, delay: 0.15, vol: 0.2,  dur: 0.9 },
        { startFreq: 82,  endFreq: 165, delay: 0.3,  vol: 0.3,  dur: 1.2 },
    ];
    tones.forEach(({ startFreq, endFreq, delay, vol, dur }) => {
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(startFreq, t + delay);
        osc.frequency.exponentialRampToValueAtTime(endFreq, t + delay + dur * 0.6);
        const lpf = ctx.createBiquadFilter();
        lpf.type = 'lowpass';
        lpf.frequency.setValueAtTime(800, t + delay);
        lpf.frequency.linearRampToValueAtTime(300, t + delay + dur);
        const gain = ctx.createGain();
        gain.gain.setValueAtTime(0, t + delay);
        gain.gain.linearRampToValueAtTime(vol, t + delay + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);
        osc.connect(lpf);
        lpf.connect(gain);
        gain.connect(ctx.destination);
        osc.start(t + delay);
        osc.stop(t + delay + dur + 0.05);
    });
    // Deep thud
    const thud = ctx.createOscillator();
    thud.frequency.setValueAtTime(80, t + 0.4);
    thud.frequency.exponentialRampToValueAtTime(30, t + 0.9);
    const thudGain = ctx.createGain();
    thudGain.gain.setValueAtTime(0, t + 0.4);
    thudGain.gain.linearRampToValueAtTime(0.5, t + 0.42);
    thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);
    thud.connect(thudGain);
    thudGain.connect(ctx.destination);
    thud.start(t + 0.4);
    thud.stop(t + 1.0);
};

export const playTypeKey = () => playSFX(ctx => {
    const t = ctx.currentTime;
    const bufSize = ctx.sampleRate * 0.04;
    const buf = ctx.createBuffer(1, bufSize, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;
    const noise = ctx.createBufferSource();
    noise.buffer = buf;
    const bpf = ctx.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.value = 3500 + Math.random() * 800;
    const gain = ctx.createGain();
    gain.gain.setValueAtTime(0.035, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);
    noise.connect(bpf);
    bpf.connect(gain);
    return { source: noise, gain, duration: 0.05 };
});

export const playRebirth = () => {
    if (state.sfxMuted) return;
    const ctx = initAudio();
    const t = ctx.currentTime;
    // Impact
    const impactOsc = ctx.createOscillator();
    impactOsc.frequency.setValueAtTime(120, t);
    impactOsc.frequency.exponentialRampToValueAtTime(18, t + 1.2);
    const impactGain = ctx.createGain();
    impactGain.gain.setTargetAtTime(0.9, t, 0.01);
    impactGain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);
    impactOsc.connect(impactGain);
    impactGain.connect(ctx.destination);
    impactOsc.start(t);
    impactOsc.stop(t + 1.6);
    // Scream
    const screamOsc = ctx.createOscillator();
    screamOsc.type = 'sawtooth';
    screamOsc.frequency.setValueAtTime(440, t + 0.05);
    const screamLpf = ctx.createBiquadFilter();
    screamLpf.frequency.setValueAtTime(1200, t + 0.05);
    const screamGain = ctx.createGain();
    screamGain.gain.setValueAtTime(0, t);
    screamGain.gain.linearRampToValueAtTime(0.3, t + 0.1);
    screamGain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);
    screamOsc.connect(screamLpf);
    screamLpf.connect(screamGain);
    screamGain.connect(ctx.destination);
    screamOsc.start(t + 0.05);
    screamOsc.stop(t + 2.1);
};
