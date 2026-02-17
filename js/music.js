// ═══════════════════════════════════════════════════════════════
// Hextris - Background Music System (Web Audio API)
// Procedural ambient/electronic music generator
// ═══════════════════════════════════════════════════════════════

(function() {
    'use strict';

    window.GameMusic = {};

    var ctx = null;
    var masterGain = null;
    var isPlaying = false;
    var isMuted = false;
    var volume = 0.35;

    // Scheduling
    var nextNoteTime = 0;
    var scheduleTimer = null;
    var tempo = 110; // BPM
    var beatCount = 0;

    // Nodes
    var bassOsc = null;
    var bassGain = null;
    var padGain = null;
    var padOscs = [];
    var melodyGain = null;
    var reverbNode = null;
    var compressor = null;
    var filterNode = null;

    // Musical data
    var scales = {
        minor:     [0, 2, 3, 5, 7, 8, 10],
        dorian:    [0, 2, 3, 5, 7, 9, 10],
        phrygian:  [0, 1, 3, 5, 7, 8, 10],
        aeolian:   [0, 2, 3, 5, 7, 8, 10]
    };

    var currentScale = scales.minor;
    var rootNote = 40; // E2 in MIDI
    var chordProgressions = [
        [0, 3, 5, 4],  // i - iv - vi - v
        [0, 5, 3, 4],  // i - vi - iv - v
        [0, 2, 3, 4],  // i - iii - iv - v
        [0, 3, 4, 2],  // i - iv - v - iii
    ];
    var currentProgression = 0;
    var currentChordIndex = 0;
    var progressionIndex = 0;

    // Melody state
    var melodyOctave = 2;
    var lastMelodyNote = 4;
    var melodyPattern = [];
    var melodyPatternIndex = 0;

    // ─── MIDI to Frequency ──────────────────────────────────
    function midiToFreq(midi) {
        return 440 * Math.pow(2, (midi - 69) / 12);
    }

    function scaleNote(degree, octaveOffset) {
        octaveOffset = octaveOffset || 0;
        var oct = Math.floor(degree / currentScale.length);
        var idx = ((degree % currentScale.length) + currentScale.length) % currentScale.length;
        return rootNote + currentScale[idx] + (oct + octaveOffset) * 12;
    }

    // ─── Initialize Audio Context ───────────────────────────
    GameMusic.init = function() {
        if (ctx) return;

        try {
            ctx = new (window.AudioContext || window.webkitAudioContext)();
        } catch (e) {
            console.warn('Web Audio API not supported');
            return;
        }

        // Master chain: compressor → master gain → destination
        compressor = ctx.createDynamicsCompressor();
        compressor.threshold.value = -20;
        compressor.knee.value = 20;
        compressor.ratio.value = 4;
        compressor.attack.value = 0.005;
        compressor.release.value = 0.1;

        masterGain = ctx.createGain();
        masterGain.gain.value = volume;

        // Simple reverb using delay + feedback
        reverbNode = createReverb();

        // Low-pass filter for warmth
        filterNode = ctx.createBiquadFilter();
        filterNode.type = 'lowpass';
        filterNode.frequency.value = 3000;
        filterNode.Q.value = 0.7;

        // Sub-groups
        bassGain = ctx.createGain();
        bassGain.gain.value = 0.3;

        padGain = ctx.createGain();
        padGain.gain.value = 0.15;

        melodyGain = ctx.createGain();
        melodyGain.gain.value = 0.12;

        // Routing
        bassGain.connect(filterNode);
        padGain.connect(reverbNode);
        padGain.connect(filterNode);
        melodyGain.connect(reverbNode);
        melodyGain.connect(filterNode);
        reverbNode.connect(compressor);
        filterNode.connect(compressor);
        compressor.connect(masterGain);
        masterGain.connect(ctx.destination);

        // Load saved preferences
        var savedMute = localStorage.getItem('hextris_musicMuted');
        if (savedMute === 'true') {
            isMuted = true;
            masterGain.gain.value = 0;
        }

        var savedVol = localStorage.getItem('hextris_musicVolume');
        if (savedVol) {
            volume = parseFloat(savedVol);
            if (!isMuted) masterGain.gain.value = volume;
        }

        updateMuteButton();
        generateMelodyPattern();
    };

    // ─── Create simple reverb ───────────────────────────────
    function createReverb() {
        var delay1 = ctx.createDelay();
        delay1.delayTime.value = 0.08;
        var delay2 = ctx.createDelay();
        delay2.delayTime.value = 0.15;
        var feedback = ctx.createGain();
        feedback.gain.value = 0.3;
        var wetGain = ctx.createGain();
        wetGain.gain.value = 0.25;

        delay1.connect(delay2);
        delay2.connect(feedback);
        feedback.connect(delay1);
        delay1.connect(wetGain);
        delay2.connect(wetGain);

        // Return a pseudo-node with connect
        var input = ctx.createGain();
        input.gain.value = 1;
        input.connect(delay1);
        input.connect(wetGain); // dry path

        input._output = wetGain;
        input.connect = function(dest) {
            wetGain.connect(dest);
            return dest;
        };

        return input;
    }

    // ─── Generate melody pattern ────────────────────────────
    function generateMelodyPattern() {
        melodyPattern = [];
        var patternLen = 8 + Math.floor(Math.random() * 8);
        for (var i = 0; i < patternLen; i++) {
            if (Math.random() < 0.25) {
                // Rest
                melodyPattern.push(null);
            } else {
                var step = Math.floor(Math.random() * 5) - 2;
                lastMelodyNote = Math.max(0, Math.min(6, lastMelodyNote + step));
                melodyPattern.push(lastMelodyNote);
            }
        }
        melodyPatternIndex = 0;
    }

    // ─── Play bass note ─────────────────────────────────────
    function playBass(time, duration) {
        var chordDegree = chordProgressions[currentProgression][currentChordIndex];
        var freq = midiToFreq(scaleNote(chordDegree, 0));

        var osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;

        var osc2 = ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.value = freq;

        var env = ctx.createGain();
        env.gain.setValueAtTime(0.001, time);
        env.gain.exponentialRampToValueAtTime(0.5, time + 0.05);
        env.gain.exponentialRampToValueAtTime(0.3, time + duration * 0.3);
        env.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.95);

        osc.connect(env);
        osc2.connect(env);
        env.connect(bassGain);

        osc.start(time);
        osc2.start(time);
        osc.stop(time + duration);
        osc2.stop(time + duration);
    }

    // ─── Play pad chord ─────────────────────────────────────
    function playPad(time, duration) {
        var chordDegree = chordProgressions[currentProgression][currentChordIndex];
        // Build a triad
        var notes = [
            scaleNote(chordDegree, 1),
            scaleNote(chordDegree + 2, 1),
            scaleNote(chordDegree + 4, 1)
        ];

        var env = ctx.createGain();
        env.gain.setValueAtTime(0.001, time);
        env.gain.linearRampToValueAtTime(0.4, time + duration * 0.3);
        env.gain.linearRampToValueAtTime(0.3, time + duration * 0.7);
        env.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.98);
        env.connect(padGain);

        for (var i = 0; i < notes.length; i++) {
            var osc = ctx.createOscillator();
            osc.type = 'sine';
            osc.frequency.value = midiToFreq(notes[i]);
            // Slight detune for warmth
            osc.detune.value = (Math.random() - 0.5) * 10;
            osc.connect(env);
            osc.start(time);
            osc.stop(time + duration);

            // Add a quiet saw for texture
            var osc2 = ctx.createOscillator();
            osc2.type = 'sawtooth';
            osc2.frequency.value = midiToFreq(notes[i]);
            osc2.detune.value = (Math.random() - 0.5) * 15;
            var sawGain = ctx.createGain();
            sawGain.gain.value = 0.05;
            osc2.connect(sawGain);
            sawGain.connect(env);
            osc2.start(time);
            osc2.stop(time + duration);
        }
    }

    // ─── Play melody note ───────────────────────────────────
    function playMelody(time, duration) {
        var noteIdx = melodyPattern[melodyPatternIndex];
        melodyPatternIndex = (melodyPatternIndex + 1) % melodyPattern.length;

        // Regenerate pattern occasionally
        if (melodyPatternIndex === 0 && Math.random() < 0.4) {
            generateMelodyPattern();
        }

        if (noteIdx === null) return; // Rest

        var midi = scaleNote(noteIdx, melodyOctave);
        var freq = midiToFreq(midi);

        var osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freq;

        var osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.value = freq * 2; // Octave harmonic
        var harmGain = ctx.createGain();
        harmGain.gain.value = 0.15;
        osc2.connect(harmGain);

        var env = ctx.createGain();
        env.gain.setValueAtTime(0.001, time);
        env.gain.exponentialRampToValueAtTime(0.35, time + 0.02);
        env.gain.exponentialRampToValueAtTime(0.2, time + duration * 0.3);
        env.gain.exponentialRampToValueAtTime(0.001, time + duration * 0.9);

        osc.connect(env);
        harmGain.connect(env);
        env.connect(melodyGain);

        osc.start(time);
        osc2.start(time);
        osc.stop(time + duration);
        osc2.stop(time + duration);
    }

    // ─── Play hi-hat / percussion ───────────────────────────
    function playHiHat(time) {
        var bufferSize = ctx.sampleRate * 0.04;
        var buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
        var data = buffer.getChannelData(0);
        for (var i = 0; i < bufferSize; i++) {
            data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / bufferSize, 8);
        }

        var source = ctx.createBufferSource();
        source.buffer = buffer;

        var hihatGain = ctx.createGain();
        hihatGain.gain.value = 0.04;

        var hihatFilter = ctx.createBiquadFilter();
        hihatFilter.type = 'highpass';
        hihatFilter.frequency.value = 7000;

        source.connect(hihatFilter);
        hihatFilter.connect(hihatGain);
        hihatGain.connect(compressor);

        source.start(time);
    }

    // ─── Scheduler ──────────────────────────────────────────
    function scheduler() {
        var beatDuration = 60.0 / tempo;
        var lookAhead = 0.15; // seconds

        while (nextNoteTime < ctx.currentTime + lookAhead) {
            var beat = beatCount % 16;

            // Bass: every 4 beats
            if (beat % 4 === 0) {
                playBass(nextNoteTime, beatDuration * 3.8);
            }

            // Pad chord: every 8 beats
            if (beat % 8 === 0) {
                playPad(nextNoteTime, beatDuration * 7.5);
            }

            // Melody: every beat with some variation
            if (beat % 2 === 0 || Math.random() < 0.3) {
                playMelody(nextNoteTime, beatDuration * (Math.random() < 0.3 ? 2 : 1));
            }

            // Hi-hat: most eighth notes
            if (Math.random() < 0.6) {
                playHiHat(nextNoteTime);
            }

            // Advance chord every 8 beats
            if (beat === 0 && beatCount > 0) {
                currentChordIndex = (currentChordIndex + 1) % chordProgressions[currentProgression].length;
                // Change progression occasionally
                if (currentChordIndex === 0 && Math.random() < 0.25) {
                    currentProgression = Math.floor(Math.random() * chordProgressions.length);
                }
            }

            // Advance time
            nextNoteTime += beatDuration / 2; // Eighth notes
            beatCount++;

            // Vary melody octave occasionally
            if (beatCount % 64 === 0) {
                melodyOctave = Math.random() < 0.5 ? 2 : 3;
            }

            // Change scale occasionally
            if (beatCount % 128 === 0 && Math.random() < 0.3) {
                var scaleNames = Object.keys(scales);
                currentScale = scales[scaleNames[Math.floor(Math.random() * scaleNames.length)]];
            }
        }
    }

    // ─── Start / Stop ───────────────────────────────────────
    GameMusic.start = function() {
        if (isPlaying) return;
        if (!ctx) GameMusic.init();
        if (!ctx) return;

        if (ctx.state === 'suspended') {
            ctx.resume();
        }

        isPlaying = true;
        beatCount = 0;
        currentChordIndex = 0;
        nextNoteTime = ctx.currentTime + 0.1;

        scheduleTimer = setInterval(scheduler, 80);
    };

    GameMusic.stop = function() {
        if (!isPlaying) return;
        isPlaying = false;
        if (scheduleTimer) {
            clearInterval(scheduleTimer);
            scheduleTimer = null;
        }
    };

    // ─── Mute / Unmute ──────────────────────────────────────
    GameMusic.toggleMute = function() {
        if (!ctx) {
            GameMusic.init();
            if (!ctx) return;
        }
        isMuted = !isMuted;

        if (isMuted) {
            masterGain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
        } else {
            masterGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.3);
            // Auto-start music if not playing
            if (!isPlaying) GameMusic.start();
        }

        localStorage.setItem('hextris_musicMuted', isMuted.toString());
        updateMuteButton();
    };

    GameMusic.setVolume = function(v) {
        volume = Math.max(0, Math.min(1, v));
        localStorage.setItem('hextris_musicVolume', volume.toString());
        if (!isMuted && masterGain) {
            masterGain.gain.linearRampToValueAtTime(volume, ctx.currentTime + 0.1);
        }
    };

    GameMusic.isMuted = function() {
        return isMuted;
    };

    // ─── Intensity control (speeds up during gameplay) ──────
    GameMusic.setIntensity = function(level) {
        // level: 0-1, affects tempo and filter
        if (!ctx) return;
        var newTempo = 100 + level * 40; // 100-140 BPM
        tempo = newTempo;
        if (filterNode) {
            filterNode.frequency.linearRampToValueAtTime(
                2000 + level * 4000, ctx.currentTime + 0.5
            );
        }
        if (melodyGain) {
            melodyGain.gain.linearRampToValueAtTime(
                0.08 + level * 0.12, ctx.currentTime + 0.5
            );
        }
    };

    // ─── Update mute button UI ──────────────────────────────
    function updateMuteButton() {
        var btn = document.getElementById('musicToggleBtn');
        if (!btn) return;
        if (isMuted) {
            btn.innerHTML = '<i class="fa fa-volume-off"></i>';
            btn.title = 'Unmute Music';
            btn.classList.add('muted');
        } else {
            btn.innerHTML = '<i class="fa fa-volume-up"></i>';
            btn.title = 'Mute Music';
            btn.classList.remove('muted');
        }
    }

    // ─── Auto-start on first user interaction ───────────────
    function autoStartOnInteraction() {
        function startOnce() {
            if (!isPlaying && !isMuted) {
                GameMusic.init();
                GameMusic.start();
            }
            document.removeEventListener('click', startOnce);
            document.removeEventListener('touchstart', startOnce);
            document.removeEventListener('keydown', startOnce);
        }
        document.addEventListener('click', startOnce);
        document.addEventListener('touchstart', startOnce);
        document.addEventListener('keydown', startOnce);
    }

    // Initialize on DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function() {
            autoStartOnInteraction();
        });
    } else {
        autoStartOnInteraction();
    }

})();
