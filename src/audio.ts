let audioCtx: AudioContext | null = null;
let bgmStarted = false;

const initAudio = () => {
    if (!audioCtx) {
        audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
};

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

// Play a single soft bell/pad tone
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

    // Add a slight second harmonic for richness
    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.value = freq * 2.01; // very slightly detuned 2nd harmonic

    const envGain = ctx.createGain();
    envGain.gain.setValueAtTime(0, startTime);
    envGain.gain.linearRampToValueAtTime(volume, startTime + 0.5);          // attack
    envGain.gain.setValueAtTime(volume, startTime + duration - 1.5);        // sustain
    envGain.gain.exponentialRampToValueAtTime(0.0001, startTime + duration); // release

    const osc2Gain = ctx.createGain();
    osc2Gain.gain.value = 0.3; // harmonics are quieter

    osc.connect(envGain);
    osc2.connect(osc2Gain);
    osc2Gain.connect(envGain);

    // Dry + wet signal (reverb)
    envGain.connect(masterGain);
    envGain.connect(reverb);

    osc.start(startTime);
    osc.stop(startTime + duration + 0.1);
    osc2.start(startTime);
    osc2.stop(startTime + duration + 0.1);
};

// Schedule a full looping ambient piece
const scheduleAmbient = (ctx: AudioContext) => {
    const masterGain = ctx.createGain();
    masterGain.gain.value = 0.15;
    masterGain.connect(ctx.destination);

    const reverb = createReverb(ctx, 3.5, 3.0);
    const reverbGain = ctx.createGain();
    reverbGain.gain.value = 0.4;
    reverb.connect(reverbGain);
    reverbGain.connect(ctx.destination);

    // Mysterious pentatonic-ish scale: A, C, D, E, G (A minor pentatonic)
    // Using octave 2 and 3 for haunting depth
    const scale = [
        55.0,   // A2
        65.41,  // C3
        73.42,  // D3
        82.41,  // E3
        98.00,  // G3
        110.00, // A3
        130.81, // C4
        146.83, // D4
    ];

    const now = ctx.currentTime;
    const totalDuration = 32; // Each "phrase" is 32 seconds

    // Build a sparse, mysterious sequence of long notes
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
        playTone(ctx, masterGain, reverb, scale[step.noteIdx], now + step.start, step.dur);
        // Sometimes add an octave above at lower volume for shimmer
        if (Math.random() > 0.5) {
            playTone(ctx, masterGain, reverb, scale[step.noteIdx] * 2, now + step.start + 0.3, step.dur * 0.7, 0.03);
        }
    }

    // Schedule next loop just before this one ends
    setTimeout(() => {
        if (audioCtx) scheduleAmbient(audioCtx);
    }, (totalDuration - 4) * 1000); // overlap by 4s for smooth transition
};

export const playBGM = () => {
    initAudio();
    if (!audioCtx || bgmStarted) return;
    bgmStarted = true;
    scheduleAmbient(audioCtx);
};

export const playSquelch = () => {
    initAudio();
    if (!audioCtx) return;

    const t = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(180, t);
    osc.frequency.exponentialRampToValueAtTime(35, t + 0.12);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.4, t + 0.015);
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);

    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start(t);
    osc.stop(t + 0.15);
};

export const playTear = () => {
    initAudio();
    if (!audioCtx) return;

    const t = audioCtx.currentTime;
    const duration = 0.4;

    const bufferSize = Math.floor(audioCtx.sampleRate * duration);
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    const filter = audioCtx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.Q.value = 5;
    filter.frequency.setValueAtTime(4000, t);
    filter.frequency.exponentialRampToValueAtTime(400, t + duration);

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0, t);
    gain.gain.linearRampToValueAtTime(0.25, t + 0.08);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);
    noise.start(t);
};

// Card swipe: a smooth paper-slide sound — shaped noise with a falling frequency sweep
export const playSwipe = () => {
    initAudio();
    if (!audioCtx) return;

    const t = audioCtx.currentTime;
    const duration = 0.35;

    const bufferSize = Math.floor(audioCtx.sampleRate * duration);
    const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        // Bell-curve amplitude shape: soft start, peak at 30%, soft end
        const pos = i / bufferSize;
        const shape = Math.pow(Math.sin(pos * Math.PI), 0.5) * (1 - pos * 0.5);
        data[i] = (Math.random() * 2 - 1) * shape;
    }

    const noise = audioCtx.createBufferSource();
    noise.buffer = buffer;

    // Bandpass sweeping DOWN like a card brushing across a surface
    const bpf = audioCtx.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.Q.value = 1.5; // wider band = warmer, more papery
    bpf.frequency.setValueAtTime(1800, t);
    bpf.frequency.exponentialRampToValueAtTime(600, t + duration); // sweep down

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.18, t);
    gain.gain.exponentialRampToValueAtTime(0.001, t + duration);

    noise.connect(bpf);
    bpf.connect(gain);
    gain.connect(audioCtx.destination);
    noise.start(t);
};

// Melding ritual: three rising tones that converge into a dark chord
export const playMeld = () => {
    initAudio();
    if (!audioCtx) return;

    const t = audioCtx.currentTime;

    // Three staggered tones rising and resolving into a dark chord (A minor)
    const tones = [
        { startFreq: 110, endFreq: 220, delay: 0,    vol: 0.25, dur: 1.0 },
        { startFreq: 146, endFreq: 294, delay: 0.15, vol: 0.2,  dur: 0.9 },
        { startFreq: 82,  endFreq: 165, delay: 0.3,  vol: 0.3,  dur: 1.2 },
    ];

    tones.forEach(({ startFreq, endFreq, delay, vol, dur }) => {
        const osc = audioCtx!.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(startFreq, t + delay);
        osc.frequency.exponentialRampToValueAtTime(endFreq, t + delay + dur * 0.6);

        // Low-pass to take the harshness off the sawtooth
        const lpf = audioCtx!.createBiquadFilter();
        lpf.type = 'lowpass';
        lpf.frequency.setValueAtTime(800, t + delay);
        lpf.frequency.linearRampToValueAtTime(300, t + delay + dur);

        const gain = audioCtx!.createGain();
        gain.gain.setValueAtTime(0, t + delay);
        gain.gain.linearRampToValueAtTime(vol, t + delay + 0.04);
        gain.gain.exponentialRampToValueAtTime(0.001, t + delay + dur);

        osc.connect(lpf);
        lpf.connect(gain);
        gain.connect(audioCtx!.destination);
        osc.start(t + delay);
        osc.stop(t + delay + dur + 0.05);
    });

    // Final deep thud at the end
    const thud = audioCtx.createOscillator();
    thud.type = 'sine';
    thud.frequency.setValueAtTime(80, t + 0.4);
    thud.frequency.exponentialRampToValueAtTime(30, t + 0.9);

    const thudGain = audioCtx.createGain();
    thudGain.gain.setValueAtTime(0, t + 0.4);
    thudGain.gain.linearRampToValueAtTime(0.5, t + 0.42);
    thudGain.gain.exponentialRampToValueAtTime(0.001, t + 0.9);

    thud.connect(thudGain);
    thudGain.connect(audioCtx.destination);
    thud.start(t + 0.4);
    thud.stop(t + 1.0);
};

// Typewriter key click: a short, clicky noise burst with a slight pitch
export const playTypeKey = () => {
    initAudio();
    if (!audioCtx) return;

    const t = audioCtx.currentTime;

    // Mechanical click body: a very short noise click
    const bufSize = Math.floor(audioCtx.sampleRate * 0.04);
    const buf = audioCtx.createBuffer(1, bufSize, audioCtx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < bufSize; i++) d[i] = Math.random() * 2 - 1;

    const noise = audioCtx.createBufferSource();
    noise.buffer = buf;

    const bpf = audioCtx.createBiquadFilter();
    bpf.type = 'bandpass';
    bpf.frequency.value = 3500 + Math.random() * 800; // slight random pitch each key
    bpf.Q.value = 2;

    const gain = audioCtx.createGain();
    gain.gain.setValueAtTime(0.035, t);  // much quieter — subtle mechanical tick
    gain.gain.exponentialRampToValueAtTime(0.001, t + 0.04);

    noise.connect(bpf);
    bpf.connect(gain);
    gain.connect(audioCtx.destination);
    noise.start(t);
};

// Rebirth: a massive, dramatic void-collapse sound sequence
export const playRebirth = () => {
    initAudio();
    if (!audioCtx) return;

    const t = audioCtx.currentTime;

    // 1. Heavy sub-bass IMPACT thud at the start
    const impactOsc = audioCtx.createOscillator();
    impactOsc.type = 'sine';
    impactOsc.frequency.setValueAtTime(120, t);
    impactOsc.frequency.exponentialRampToValueAtTime(18, t + 1.2);

    const impactGain = audioCtx.createGain();
    impactGain.gain.setValueAtTime(0, t);
    impactGain.gain.linearRampToValueAtTime(0.9, t + 0.03); // instant slam
    impactGain.gain.exponentialRampToValueAtTime(0.001, t + 1.5);

    impactOsc.connect(impactGain);
    impactGain.connect(audioCtx.destination);
    impactOsc.start(t);
    impactOsc.stop(t + 1.6);

    // 2. Mid-range hollow scream tone, falling fast — the "mind being erased"
    const screamOsc = audioCtx.createOscillator();
    screamOsc.type = 'sawtooth';
    screamOsc.frequency.setValueAtTime(440, t + 0.05);
    screamOsc.frequency.exponentialRampToValueAtTime(55, t + 1.8);

    const screamLpf = audioCtx.createBiquadFilter();
    screamLpf.type = 'lowpass';
    screamLpf.frequency.setValueAtTime(1200, t + 0.05);
    screamLpf.frequency.exponentialRampToValueAtTime(200, t + 1.8);

    const screamGain = audioCtx.createGain();
    screamGain.gain.setValueAtTime(0, t);
    screamGain.gain.linearRampToValueAtTime(0.3, t + 0.1);
    screamGain.gain.setValueAtTime(0.3, t + 0.5);
    screamGain.gain.exponentialRampToValueAtTime(0.001, t + 2.0);

    screamOsc.connect(screamLpf);
    screamLpf.connect(screamGain);
    screamGain.connect(audioCtx.destination);
    screamOsc.start(t + 0.05);
    screamOsc.stop(t + 2.1);

    // 3. Burst of static — a distorted void tearing open
    const noiseLen = audioCtx.sampleRate * 1.5;
    const noiseBuf = audioCtx.createBuffer(1, noiseLen, audioCtx.sampleRate);
    const nd = noiseBuf.getChannelData(0);
    for (let i = 0; i < noiseLen; i++) {
        // Fades in then out
        const env = Math.sin((i / noiseLen) * Math.PI);
        nd[i] = (Math.random() * 2 - 1) * env;
    }

    const noiseNode = audioCtx.createBufferSource();
    noiseNode.buffer = noiseBuf;

    const noiseBpf = audioCtx.createBiquadFilter();
    noiseBpf.type = 'bandpass';
    noiseBpf.Q.value = 0.5;
    noiseBpf.frequency.setValueAtTime(600, t + 0.2);
    noiseBpf.frequency.exponentialRampToValueAtTime(80, t + 1.7);

    const noiseGain = audioCtx.createGain();
    noiseGain.gain.setValueAtTime(0, t + 0.2);
    noiseGain.gain.linearRampToValueAtTime(0.4, t + 0.4);
    noiseGain.gain.exponentialRampToValueAtTime(0.001, t + 1.8);

    noiseNode.connect(noiseBpf);
    noiseBpf.connect(noiseGain);
    noiseGain.connect(audioCtx.destination);
    noiseNode.start(t + 0.2);

    // 4. Final silence whisper — a faint high-pitched tone that lingers
    const whisper = audioCtx.createOscillator();
    whisper.type = 'sine';
    whisper.frequency.value = 880;

    const whisperGain = audioCtx.createGain();
    whisperGain.gain.setValueAtTime(0, t + 1.2);
    whisperGain.gain.linearRampToValueAtTime(0.06, t + 1.8);
    whisperGain.gain.exponentialRampToValueAtTime(0.001, t + 3.5);

    whisper.connect(whisperGain);
    whisperGain.connect(audioCtx.destination);
    whisper.start(t + 1.2);
    whisper.stop(t + 3.6);
};
