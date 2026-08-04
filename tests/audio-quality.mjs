import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const engineSource = fs.readFileSync(new URL('../audio-engine.js', import.meta.url), 'utf8');
const sandbox = { Float32Array, Math };
vm.createContext(sandbox);
vm.runInContext(engineSource, sandbox);
const { renderSongSamples } = sandbox.AudioLabEngine;

function signature(channel) {
  let hash = 2166136261;
  const stride = Math.max(1, Math.floor(channel.length / 12000));
  for (let i = 0; i < channel.length; i += stride) {
    hash ^= Math.round(channel[i] * 32767) & 0xffff;
    hash = Math.imul(hash, 16777619);
  }
  return (hash >>> 0).toString(16).padStart(8, '0');
}

function encodeWav(render) {
  const channels = render.channels.length;
  const frames = render.channels[0].length;
  const output = Buffer.allocUnsafe(44 + frames * channels * 2);
  output.write('RIFF', 0);
  output.writeUInt32LE(36 + frames * channels * 2, 4);
  output.write('WAVE', 8);
  output.write('fmt ', 12);
  output.writeUInt32LE(16, 16);
  output.writeUInt16LE(1, 20);
  output.writeUInt16LE(channels, 22);
  output.writeUInt32LE(render.sampleRate, 24);
  output.writeUInt32LE(render.sampleRate * channels * 2, 28);
  output.writeUInt16LE(channels * 2, 32);
  output.writeUInt16LE(16, 34);
  output.write('data', 36);
  output.writeUInt32LE(frames * channels * 2, 40);
  let offset = 44;
  for (let frame = 0; frame < frames; frame++) {
    for (const channel of render.channels) {
      const sample = Math.max(-1, Math.min(1, channel[frame]));
      output.writeInt16LE(Math.round(sample < 0 ? sample * 32768 : sample * 32767), offset);
      offset += 2;
    }
  }
  return output;
}

function analyze(render) {
  const [left, right] = render.channels;
  let energy = 0, peak = 0, clipped = 0, silence = 0;
  let cross = 0, leftEnergy = 0, rightEnergy = 0, correlation = 0, differenceEnergy = 0;
  const frameSize = Math.round(render.sampleRate * 0.05);
  const frameEnergy = [];
  for (let i = 0; i < left.length; i++) {
    const l = left[i], r = right[i];
    energy += (l * l + r * r) / 2;
    leftEnergy += l * l; rightEnergy += r * r; correlation += l * r;
    differenceEnergy += (l - r) * (l - r);
    peak = Math.max(peak, Math.abs(l), Math.abs(r));
    if (Math.abs(l) >= 0.999 || Math.abs(r) >= 0.999) clipped++;
    if (Math.abs(l) < 0.001 && Math.abs(r) < 0.001) silence++;
    if (i && Math.sign(left[i - 1]) !== Math.sign(l)) cross++;
  }
  for (let offset = 0; offset < left.length; offset += frameSize) {
    let sum = 0;
    const end = Math.min(left.length, offset + frameSize);
    for (let i = offset; i < end; i++) sum += (left[i] * left[i] + right[i] * right[i]) / 2;
    frameEnergy.push(Math.sqrt(sum / (end - offset)));
  }
  let onsets = 0;
  for (let i = 2; i < frameEnergy.length; i++) {
    const floor = Math.max(0.004, (frameEnergy[i - 1] + frameEnergy[i - 2]) / 2);
    if (frameEnergy[i] > floor * 1.32 && frameEnergy[i] - frameEnergy[i - 1] > 0.006) onsets++;
  }
  const frameMean = frameEnergy.reduce((a, b) => a + b, 0) / frameEnergy.length;
  const frameSd = Math.sqrt(frameEnergy.reduce((a, b) => a + (b - frameMean) ** 2, 0) / frameEnergy.length);
  return {
    duration: render.duration,
    sampleRate: render.sampleRate,
    rmsDb: 20 * Math.log10(Math.sqrt(energy / left.length)),
    peakDb: 20 * Math.log10(peak),
    clippedPercent: clipped / left.length * 100,
    silencePercent: silence / left.length * 100,
    stereoCorrelation: correlation / Math.sqrt(leftEnergy * rightEnergy),
    stereoDifferenceRms: Math.sqrt(differenceEnergy / left.length),
    zeroCrossingsPerSecond: cross / render.duration,
    temporalVariation: frameSd / frameMean,
    onsets,
    signature: signature(left),
  };
}

function requireQuality(name, render) {
  const metrics = analyze(render);
  assert.equal(render.channels.length, 2, `${name}: stereo output`);
  assert.equal(render.channels[0].length, render.channels[1].length, `${name}: balanced channels`);
  assert.ok(metrics.rmsDb > -24 && metrics.rmsDb < -5, `${name}: usable loudness (${metrics.rmsDb.toFixed(2)} dBFS)`);
  assert.ok(metrics.peakDb > -2 && metrics.peakDb < -0.2, `${name}: safe peak (${metrics.peakDb.toFixed(2)} dBFS)`);
  assert.ok(metrics.clippedPercent < 0.01, `${name}: no clipping`);
  assert.ok(metrics.stereoCorrelation < 0.995, `${name}: real stereo image (${metrics.stereoCorrelation.toFixed(4)})`);
  assert.ok(metrics.stereoDifferenceRms > 0.008, `${name}: audible stereo separation`);
  assert.ok(metrics.onsets >= 8, `${name}: rhythmic articulation (${metrics.onsets})`);
  assert.ok(metrics.temporalVariation > 0.16, `${name}: arrangement dynamics`);
  assert.ok(render.arrangement.sections.length >= 4, `${name}: multi-section structure`);
  assert.ok(render.arrangement.uniqueNotes >= 8, `${name}: melodic variety`);
  assert.ok(render.arrangement.chordChanges >= 5, `${name}: harmonic movement`);
  assert.ok(render.arrangement.drumHits >= 20, `${name}: rhythmic content`);
  return metrics;
}

const requests = [
  { name: 'cinematic', prompt: 'Cinematic electronic score with a restrained opening, rising percussion, glassy synths, and a confident finale', genre: 'Cinematic', mood: 'Epic', vocals: 'Instrumental', duration: 30 },
  { name: 'lofi', prompt: 'Warm late-night lo-fi beat with dusty drums, mellow keys, tape softness, and an unhurried hook', genre: 'Hip-hop', mood: 'Calm', vocals: 'Instrumental', duration: 30 },
  { name: 'future-pop', prompt: 'Bright future-pop song with crisp drums, playful arpeggios, clean bass, and an optimistic vocal hook', genre: 'Pop', mood: 'Hopeful', vocals: 'Lead vocals', duration: 30 },
];

const results = [];
for (const request of requests) {
  const render = renderSongSamples(request);
  if (results.length === 0 && process.env.AUDIO_SAMPLE_OUT) {
    fs.writeFileSync(process.env.AUDIO_SAMPLE_OUT, encodeWav(render));
  }
  results.push({ name: request.name, arrangement: render.arrangement, metrics: requireQuality(request.name, render) });
}

assert.equal(new Set(results.map((result) => result.metrics.signature)).size, requests.length, 'different briefs create different audio');
assert.ok(new Set(results.map((result) => result.arrangement.bpm)).size >= 2, 'genre and mood alter tempo');
const repeat = renderSongSamples(requests[0]);
assert.equal(signature(repeat.channels[0]), results[0].metrics.signature, 'same brief is deterministic');

console.log(JSON.stringify({ passed: true, cases: results }, null, 2));
