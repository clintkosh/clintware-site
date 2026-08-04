(function (root) {
  'use strict';

  const GENRES = {
    Electronic: { bpm: 116, swing: 0.02, kick: 1.00, snare: 0.72, hat: 0.58, bass: 0.82, pad: 0.46, lead: 0.58, brightness: 0.72 },
    Cinematic:  { bpm: 92,  swing: 0.00, kick: 0.82, snare: 0.48, hat: 0.30, bass: 0.72, pad: 0.78, lead: 0.52, brightness: 0.50 },
    'Hip-hop': { bpm: 88,  swing: 0.10, kick: 1.00, snare: 0.90, hat: 0.64, bass: 0.94, pad: 0.38, lead: 0.38, brightness: 0.46 },
    Rock:       { bpm: 124, swing: 0.01, kick: 0.94, snare: 1.00, hat: 0.70, bass: 0.78, pad: 0.42, lead: 0.64, brightness: 0.68 },
    Ambient:    { bpm: 74,  swing: 0.00, kick: 0.30, snare: 0.18, hat: 0.16, bass: 0.46, pad: 1.00, lead: 0.42, brightness: 0.40 },
    Pop:        { bpm: 112, swing: 0.02, kick: 0.90, snare: 0.82, hat: 0.60, bass: 0.70, pad: 0.56, lead: 0.76, brightness: 0.76 },
    Experimental:{bpm: 104, swing: 0.07, kick: 0.76, snare: 0.62, hat: 0.52, bass: 0.72, pad: 0.60, lead: 0.66, brightness: 0.62 },
  };

  function hashString(value) {
    let hash = 2166136261;
    for (let i = 0; i < value.length; i++) {
      hash ^= value.charCodeAt(i);
      hash = Math.imul(hash, 16777619);
    }
    return hash >>> 0;
  }

  function mulberry32(seed) {
    return function random() {
      let t = seed += 0x6d2b79f5;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function midiToHz(note) {
    return 440 * Math.pow(2, (note - 69) / 12);
  }

  function clamp(value, low, high) {
    return Math.max(low, Math.min(high, value));
  }

  function renderSongSamples(payload) {
    const sampleRate = 32000;
    const duration = clamp(Number(payload.duration) || 30, 8, 45);
    const length = Math.floor(duration * sampleRate);
    const left = new Float32Array(length);
    const right = new Float32Array(length);
    const vocalMode = String(payload.vocals || 'instrumental').toLowerCase();
    const seed = hashString(`${payload.prompt || ''}|${payload.genre || ''}|${payload.mood || ''}|${vocalMode}`);
    const random = mulberry32(seed);
    const preset = { ...(GENRES[payload.genre] || GENRES.Electronic) };
    const mood = String(payload.mood || 'Driven').toLowerCase();
    if (mood === 'calm') preset.bpm -= 12;
    if (mood === 'epic') { preset.bpm -= 4; preset.pad *= 1.14; preset.kick *= 1.08; }
    if (mood === 'playful') { preset.bpm += 8; preset.swing += 0.03; }
    if (mood === 'dark') { preset.brightness *= 0.72; preset.bass *= 1.12; }
    if (mood === 'hopeful') { preset.brightness *= 1.12; preset.lead *= 1.12; }
    if (mood === 'melancholic') { preset.bpm -= 8; preset.pad *= 1.12; }
    const bpm = clamp(Math.round(preset.bpm + (seed % 5) - 2), 66, 132);
    const beat = 60 / bpm;
    const barDuration = beat * 4;
    const barCount = Math.max(2, Math.ceil(duration / barDuration));
    const isMinor = ['dark', 'melancholic', 'driven'].includes(mood);
    const scale = isMinor ? [0, 2, 3, 5, 7, 8, 10, 12] : [0, 2, 4, 5, 7, 9, 11, 12];
    const progression = isMinor ? [0, 5, 3, 6] : [0, 4, 5, 3];
    const rootMidi = 36 + (seed % 8);
    const stats = { noteEvents: 0, uniqueNotes: new Set(), drumHits: 0, chordChanges: 0, sections: new Set(), bpm };

    function add(i, value, pan) {
      if (i < 0 || i >= length) return;
      const angle = (clamp(pan, -1, 1) + 1) * Math.PI / 4;
      left[i] += value * Math.cos(angle);
      right[i] += value * Math.sin(angle);
    }

    function envelope(t, total, attack, release, curve) {
      if (t < 0 || t >= total) return 0;
      const a = attack > 0 ? Math.min(1, t / attack) : 1;
      const r = release > 0 ? Math.min(1, (total - t) / release) : 1;
      return Math.pow(Math.min(a, r), curve || 1);
    }

    function tone(start, seconds, midi, amp, voice, pan) {
      if (start >= duration || seconds <= 0) return;
      const startSample = Math.max(0, Math.floor(start * sampleRate));
      const endSample = Math.min(length, Math.ceil((start + seconds) * sampleRate));
      const frequency = midiToHz(midi);
      const attack = voice === 'pad' ? Math.min(0.32, seconds * 0.22) : voice === 'bass' ? 0.014 : 0.008;
      const release = voice === 'pad' ? Math.min(0.70, seconds * 0.36) : voice === 'bass' ? 0.12 : 0.18;
      const phaseOffset = random() * Math.PI * 2;
      for (let i = startSample; i < endSample; i++) {
        const t = i / sampleRate - start;
        const phase = Math.PI * 2 * frequency * t + phaseOffset;
        let sample;
        if (voice === 'bass') {
          sample = Math.sin(phase) * 0.76 + Math.sin(phase * 2) * 0.16 + Math.sin(phase * 3) * 0.08;
        } else if (voice === 'pad') {
          sample = Math.sin(phase) * 0.64 + Math.sin(phase * 2.003) * 0.17 + Math.sin(phase * 0.501) * 0.19;
        } else if (voice === 'pluck') {
          sample = Math.sin(phase) * 0.58 + Math.sin(phase * 2) * 0.25 + Math.sin(phase * 3) * 0.11 + Math.sin(phase * 5) * 0.06;
        } else {
          sample = Math.sin(phase) * 0.72 + Math.sin(phase * 2) * 0.18 + Math.sin(phase * 4) * 0.10;
        }
        const decay = voice === 'pluck' ? Math.exp(-4.4 * t / Math.max(seconds, 0.01)) : 1;
        add(i, sample * amp * envelope(t, seconds, attack, release, voice === 'pad' ? 1.35 : 0.72) * decay, pan);
      }
      stats.noteEvents++;
      stats.uniqueNotes.add(midi);
    }

    function kick(start, amp) {
      const samples = Math.floor(0.32 * sampleRate);
      const begin = Math.floor(start * sampleRate);
      let phase = 0;
      for (let n = 0; n < samples && begin + n < length; n++) {
        const t = n / sampleRate;
        const frequency = 45 + 105 * Math.exp(-28 * t);
        phase += Math.PI * 2 * frequency / sampleRate;
        const body = Math.sin(phase) * Math.exp(-13 * t);
        const click = (random() * 2 - 1) * Math.exp(-90 * t) * 0.12;
        add(begin + n, (body + click) * amp, 0);
      }
      stats.drumHits++;
    }

    function snare(start, amp, pan) {
      const samples = Math.floor(0.24 * sampleRate);
      const begin = Math.floor(start * sampleRate);
      let previousNoise = 0;
      for (let n = 0; n < samples && begin + n < length; n++) {
        const t = n / sampleRate;
        const noise = random() * 2 - 1;
        const high = noise - previousNoise * 0.72;
        previousNoise = noise;
        const body = Math.sin(Math.PI * 2 * 185 * t) * 0.28;
        add(begin + n, (high * 0.62 + body) * Math.exp(-18 * t) * amp, pan);
      }
      stats.drumHits++;
    }

    function hat(start, amp, pan, open) {
      const seconds = open ? 0.18 : 0.055;
      const samples = Math.floor(seconds * sampleRate);
      const begin = Math.floor(start * sampleRate);
      let a = 0, b = 0;
      for (let n = 0; n < samples && begin + n < length; n++) {
        const t = n / sampleRate;
        const noise = random() * 2 - 1;
        const high = noise - a * 0.82 + b * 0.18;
        b = a; a = noise;
        add(begin + n, high * Math.exp(-(open ? 20 : 55) * t) * amp, pan);
      }
      stats.drumHits++;
    }

    function vocalTexture(start, seconds, midi, amp, pan) {
      const begin = Math.floor(start * sampleRate);
      const end = Math.min(length, Math.floor((start + seconds) * sampleRate));
      const f0 = midiToHz(midi);
      const formants = mood === 'dark' ? [520, 1050, 2450] : [700, 1220, 2600];
      for (let i = begin; i < end; i++) {
        const t = i / sampleRate - start;
        let sample = Math.sin(Math.PI * 2 * f0 * t) * 0.36;
        for (let h = 2; h <= 18; h++) {
          const harmonic = f0 * h;
          let weight = 0;
          for (const formant of formants) weight += Math.exp(-Math.pow((harmonic - formant) / 190, 2));
          sample += Math.sin(Math.PI * 2 * harmonic * t + h * 0.13) * weight * 0.052;
        }
        const vibrato = 0.88 + Math.sin(Math.PI * 2 * 5.2 * t) * 0.12;
        add(i, sample * amp * vibrato * envelope(t, seconds, 0.06, 0.24, 0.8), pan);
      }
      stats.noteEvents++;
      stats.uniqueNotes.add(midi);
    }

    function sectionFor(bar) {
      const ratio = bar / Math.max(1, barCount - 1);
      if (bar === 0) return 'intro';
      if (bar === barCount - 1) return 'outro';
      if (ratio < 0.34) return 'verse';
      if (ratio < 0.60) return 'chorus';
      if (ratio < 0.74) return 'break';
      return 'final-chorus';
    }

    for (let bar = 0; bar < barCount; bar++) {
      const barStart = bar * barDuration;
      const section = sectionFor(bar);
      stats.sections.add(section);
      const intensity = section === 'intro' ? 0.56 : section === 'break' ? 0.48 : section === 'outro' ? 0.44 : section.includes('chorus') ? 1 : 0.76;
      const degree = progression[bar % progression.length];
      const chordRoot = rootMidi + scale[degree];
      stats.chordChanges++;

      const chord = isMinor ? [0, 3, 7] : [0, 4, 7];
      for (let c = 0; c < chord.length; c++) {
        tone(barStart, Math.min(barDuration * 1.03, duration - barStart), chordRoot + 12 + chord[c], 0.075 * preset.pad * intensity, 'pad', (c - 1) * 0.58);
      }

      for (let step = 0; step < 8; step++) {
        const swung = step % 2 ? preset.swing * beat : 0;
        const time = barStart + step * beat / 2 + swung;
        if (time >= duration) continue;
        const beatIndex = Math.floor(step / 2);
        if (section !== 'intro' || barStart > barDuration * 0.5) {
          if (step === 0 || step === 4 || (section.includes('chorus') && step === 6)) kick(time, 0.34 * preset.kick * intensity);
          if (step === 2 || step === 6) snare(time, 0.22 * preset.snare * intensity, step === 2 ? -0.08 : 0.08);
          if (section !== 'break' || step % 2 === 0) hat(time, 0.055 * preset.hat * intensity, step % 2 ? 0.34 : -0.30, step === 7);
        }
        if (step % 2 === 0) {
          const bassDegree = step === 6 ? scale[(degree + 4) % 7] : scale[degree];
          tone(time, beat * 0.82, rootMidi - 12 + bassDegree, 0.19 * preset.bass * intensity, 'bass', step === 0 ? -0.08 : 0.08);
        }
        const melodyActive = section !== 'intro' && section !== 'break' && section !== 'outro';
        if (melodyActive && (step % 2 === 0 || (section.includes('chorus') && step % 2 === 1))) {
          const melodyIndex = (bar * 3 + step + (seed % 5)) % scale.length;
          const melodyMidi = rootMidi + 24 + scale[melodyIndex];
          const pan = -0.46 + ((bar + step) % 5) * 0.23;
          tone(time, beat * (section.includes('chorus') ? 0.46 : 0.34), melodyMidi, 0.105 * preset.lead * intensity, 'pluck', pan);
          if (vocalMode === 'vocal-texture' || vocalMode === 'lead-vocals') {
            const vocalEvery = vocalMode === 'lead-vocals' ? 2 : 4;
            if (step % vocalEvery === 0) vocalTexture(time, beat * 0.82, melodyMidi - 12, 0.055 * intensity, -pan * 0.55);
          }
        }
      }
    }

    const delayA = Math.floor((0.11 + (seed % 4) * 0.013) * sampleRate);
    const delayB = Math.floor((0.19 + (seed % 3) * 0.017) * sampleRate);
    for (let i = Math.max(delayA, delayB); i < length; i++) {
      left[i] += right[i - delayA] * 0.105 + left[i - delayB] * 0.055;
      right[i] += left[i - delayB] * 0.105 + right[i - delayA] * 0.055;
    }

    let meanL = 0, meanR = 0;
    for (let i = 0; i < length; i++) { meanL += left[i]; meanR += right[i]; }
    meanL /= length; meanR /= length;
    let peak = 0;
    for (let i = 0; i < length; i++) {
      const fadeIn = Math.min(1, i / (sampleRate * 0.035));
      const fadeOut = Math.min(1, (length - 1 - i) / (sampleRate * 0.65));
      const fade = Math.max(0, Math.min(fadeIn, fadeOut));
      left[i] = Math.tanh((left[i] - meanL) * 1.18) * fade;
      right[i] = Math.tanh((right[i] - meanR) * 1.18) * fade;
      peak = Math.max(peak, Math.abs(left[i]), Math.abs(right[i]));
    }
    const gain = peak > 0 ? 0.92 / peak : 1;
    for (let i = 0; i < length; i++) { left[i] *= gain; right[i] *= gain; }

    return {
      sampleRate,
      duration,
      channels: [left, right],
      arrangement: {
        bpm,
        bars: barCount,
        sections: [...stats.sections],
        noteEvents: stats.noteEvents,
        uniqueNotes: stats.uniqueNotes.size,
        drumHits: stats.drumHits,
        chordChanges: stats.chordChanges,
        seed,
      },
    };
  }

  root.AudioLabEngine = { renderSongSamples };
})(typeof globalThis !== 'undefined' ? globalThis : window);
