/**
 * Generates two short, original chime sounds (start.wav / stop.wav) for the
 * tray panel - no samples, no copyrighted material, just synthesized sine
 * waves. The note choice (an augmented-2nd interval, like E-F-G#) gives it
 * a playful "hora/manea" flavor without copying any real melody.
 *
 * Run: node build/make-sounds.js
 */

'use strict';

const fs = require('fs');
const path = require('path');

const SAMPLE_RATE = 44100;

function noteBuffer(freq, durationMs, { volume = 0.5, vibrato = 6, vibratoDepth = 6 } = {}) {
  const n = Math.round((SAMPLE_RATE * durationMs) / 1000);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const vibratoOffset = vibratoDepth * Math.sin(2 * Math.PI * vibrato * t);
    const instFreq = freq + vibratoOffset;
    // quick pluck envelope: fast attack, exponential decay
    const attack = Math.min(1, i / (SAMPLE_RATE * 0.005));
    const decay = Math.exp(-3.5 * (i / n));
    const envelope = attack * decay;
    samples[i] = Math.sin(2 * Math.PI * instFreq * t) * volume * envelope;
  }
  return samples;
}

function chordBuffer(freqs, durationMs, { volume = 0.4, vibrato = 6, vibratoDepth = 4 } = {}) {
  const n = Math.round((SAMPLE_RATE * durationMs) / 1000);
  const samples = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const t = i / SAMPLE_RATE;
    const vibratoOffset = vibratoDepth * Math.sin(2 * Math.PI * vibrato * t);
    const attack = Math.min(1, i / (SAMPLE_RATE * 0.01));
    const decay = Math.exp(-2.2 * (i / n));
    const envelope = attack * decay;
    let sum = 0;
    for (const freq of freqs) sum += Math.sin(2 * Math.PI * (freq + vibratoOffset) * t);
    samples[i] = (sum / freqs.length) * volume * envelope;
  }
  return samples;
}

function concat(buffers, gapMs = 8) {
  const gapSamples = Math.round((SAMPLE_RATE * gapMs) / 1000);
  const total = buffers.reduce((sum, b) => sum + b.length, 0) + gapSamples * (buffers.length - 1);
  const out = new Float32Array(total);
  let offset = 0;
  buffers.forEach((b, i) => {
    out.set(b, offset);
    offset += b.length;
    if (i < buffers.length - 1) offset += gapSamples;
  });
  return out;
}

function writeWav(filePath, floatSamples) {
  const n = floatSamples.length;
  const buffer = Buffer.alloc(44 + n * 2);

  buffer.write('RIFF', 0);
  buffer.writeUInt32LE(36 + n * 2, 4);
  buffer.write('WAVE', 8);
  buffer.write('fmt ', 12);
  buffer.writeUInt32LE(16, 16); // fmt chunk size
  buffer.writeUInt16LE(1, 20); // PCM
  buffer.writeUInt16LE(1, 22); // mono
  buffer.writeUInt32LE(SAMPLE_RATE, 24);
  buffer.writeUInt32LE(SAMPLE_RATE * 2, 28); // byte rate
  buffer.writeUInt16LE(2, 32); // block align
  buffer.writeUInt16LE(16, 34); // bits per sample
  buffer.write('data', 36);
  buffer.writeUInt32LE(n * 2, 40);

  for (let i = 0; i < n; i++) {
    const s = Math.max(-1, Math.min(1, floatSamples[i]));
    buffer.writeInt16LE(Math.round(s * 32767), 44 + i * 2);
  }

  fs.writeFileSync(filePath, buffer);
}

// E4 - F4 - G#4 - B4: augmented-2nd (F -> G#) gives the "hora" flavor.
const NOTES = {
  E4: 329.63,
  F4: 349.23,
  GS4: 415.3,
  B4: 493.88,
  E5: 659.25,
  GS5: 830.61,
  B5: 987.77,
};

const outDir = path.join(__dirname, '..', 'assets', 'sounds');
fs.mkdirSync(outDir, { recursive: true });

const startSeq = concat([
  noteBuffer(NOTES.E4, 70),
  noteBuffer(NOTES.F4, 70),
  noteBuffer(NOTES.GS4, 70),
  noteBuffer(NOTES.B4, 160, { volume: 0.55 }),
]);
writeWav(path.join(outDir, 'start.wav'), startSeq);

const stopSeq = concat([
  noteBuffer(NOTES.B4, 70),
  noteBuffer(NOTES.GS4, 70),
  noteBuffer(NOTES.F4, 70),
  noteBuffer(NOTES.E4, 160, { volume: 0.5 }),
]);
writeWav(path.join(outDir, 'stop.wav'), stopSeq);

// Level up: the same run continued a full octave higher, landing on a bright
// three-note chord - more of a "fanfare" than the plain Start/Stop chimes.
const levelUpSeq = concat([
  noteBuffer(NOTES.E4, 55),
  noteBuffer(NOTES.F4, 55),
  noteBuffer(NOTES.GS4, 55),
  noteBuffer(NOTES.B4, 55),
  noteBuffer(NOTES.E5, 70, { volume: 0.55 }),
  chordBuffer([NOTES.E5, NOTES.GS5, NOTES.B5], 420, { volume: 0.45 }),
]);
writeWav(path.join(outDir, 'level-up.wav'), levelUpSeq);

console.log('Wrote start.wav, stop.wav, and level-up.wav in', outDir);
