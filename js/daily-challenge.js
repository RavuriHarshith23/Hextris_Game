// ═══════════════════════════════════════════════════════════════
// Hextris - Daily Challenge System
// A unique, seeded daily level that rotates every 24 hours
// ═══════════════════════════════════════════════════════════════

(function () {
    'use strict';

    window.DailyChallenge = {};

    var DC_KEY = 'hextris_daily';

    // ─── Seeded random number generator (mulberry32) ────────
    function mulberry32(seed) {
        return function () {
            seed |= 0; seed = seed + 0x6D2B79F5 | 0;
            var t = Math.imul(seed ^ seed >>> 15, 1 | seed);
            t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t;
            return ((t ^ t >>> 14) >>> 0) / 4294967296;
        };
    }

    // ─── Get today's date seed ──────────────────────────────
    function getDaySeed() {
        var now = new Date();
        return now.getFullYear() * 10000 + (now.getMonth() + 1) * 100 + now.getDate();
    }

    function getDayString() {
        var now = new Date();
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
                      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months[now.getMonth()] + ' ' + now.getDate() + ', ' + now.getFullYear();
    }

    // ─── Generate today's challenge ─────────────────────────
    function generateChallenge() {
        var seed = getDaySeed();
        var rand = mulberry32(seed);

        // Random shape: 5 (pentagon), 6 (hex), 8 (octagon)
        var shapes = [5, 6, 6, 6, 8]; // weight hex higher
        var sides = shapes[Math.floor(rand() * shapes.length)];

        // Color palette for the day
        var palettes = [
            ['#e74c3c', '#2ecc71', '#3498db', '#f39c12', '#9b59b6', '#1abc9c'],
            ['#ff6b6b', '#ffd93d', '#6bcb77', '#4d96ff', '#ff6f91', '#845ec2'],
            ['#e84393', '#00cec9', '#fdcb6e', '#6c5ce7', '#fab1a0', '#00b894'],
            ['#ff9ff3', '#feca57', '#54a0ff', '#5f27cd', '#01a3a4', '#ee5a24'],
            ['#f368e0', '#ff6348', '#7bed9f', '#70a1ff', '#eccc68', '#a4b0be'],
            ['#fc5c65', '#fed330', '#26de81', '#2bcbba', '#4b7bec', '#a55eea']
        ];
        var colorSet = palettes[Math.floor(rand() * palettes.length)];

        // Speed (slightly challenging)
        var speed = 1.0 + rand() * 1.5; // 1.0 to 2.5

        // Target score
        var targetScore = Math.floor((200 + rand() * 800) / 50) * 50; // 200-1000 in steps of 50

        // Number of lives
        var lives = 2 + Math.floor(rand() * 2); // 2 or 3

        // Block size variation
        var blockSize = 0.8 + rand() * 0.4; // 0.8 to 1.2

        return {
            seed: seed,
            date: getDayString(),
            sides: sides,
            colors: colorSet,
            speed: Math.round(speed * 10) / 10,
            targetScore: targetScore,
            lives: lives,
            blockSize: Math.round(blockSize * 10) / 10,
            // Fun challenge name
            name: _generateChallengeName(rand)
        };
    }

    function _generateChallengeName(rand) {
        var adjectives = ['Blazing', 'Frozen', 'Electric', 'Shadow', 'Crystal',
                          'Emerald', 'Golden', 'Neon', 'Cosmic', 'Phantom',
                          'Thunder', 'Solar', 'Midnight', 'Inferno', 'Aqua'];
        var nouns = ['Storm', 'Vortex', 'Rush', 'Blitz', 'Cascade',
                     'Surge', 'Sprint', 'Fury', 'Wave', 'Dash',
                     'Pulse', 'Flash', 'Strike', 'Burst', 'Chase'];
        return adjectives[Math.floor(rand() * adjectives.length)] + ' ' +
               nouns[Math.floor(rand() * nouns.length)];
    }

    // ─── Save / Load today's result ─────────────────────────
    function loadDailyData() {
        try {
            var saved = localStorage.getItem(DC_KEY);
            if (saved) return JSON.parse(saved);
        } catch (e) {}
        return null;
    }

    function saveDailyData(data) {
        try { localStorage.setItem(DC_KEY, JSON.stringify(data)); } catch (e) {}
    }

    // ─── Public API ─────────────────────────────────────────
    DailyChallenge.getChallenge = function () {
        return generateChallenge();
    };

    DailyChallenge.hasCompletedToday = function () {
        var data = loadDailyData();
        return data && data.seed === getDaySeed() && data.completed;
    };

    DailyChallenge.getBestScore = function () {
        var data = loadDailyData();
        if (data && data.seed === getDaySeed()) return data.bestScore || 0;
        return 0;
    };

    DailyChallenge.recordScore = function (score) {
        var data = loadDailyData() || {};
        var seed = getDaySeed();
        if (data.seed !== seed) {
            data = { seed: seed, bestScore: 0, attempts: 0, completed: false };
        }
        data.attempts++;
        if (score > (data.bestScore || 0)) data.bestScore = score;
        var challenge = generateChallenge();
        if (score >= challenge.targetScore) data.completed = true;
        saveDailyData(data);
        return data;
    };

    // ─── Start daily challenge ──────────────────────────────
    DailyChallenge.start = function () {
        var challenge = generateChallenge();

        // Set game config to match the challenge
        window.gameMode = 'daily';
        window.dailyChallenge = challenge;

        // Apply settings
        if (window.settings) {
            window.settings.sides = challenge.sides;
            window.settings.speed = challenge.speed;
            window.settings.blockSize = challenge.blockSize;
            window.settings.lives = challenge.lives;
        }

        // Set colors
        window.colors = challenge.colors.slice();

        // Hide daily challenge screen
        $('#dailyChallengeScreen').fadeOut(300);

        // Set target score for win condition
        window.dailyTargetScore = challenge.targetScore;

        // Start game
        setTimeout(function () {
            if (typeof init === 'function') init();

            // Apply challenge config after init
            setTimeout(function () {
                if (window.MainHex) {
                    // Re-apply colors in case init() reset them
                    window.colors = challenge.colors.slice();
                }
                window.gameState = 1;
                if (typeof GameStats !== 'undefined') GameStats.onGameStart();
            }, 100);
        }, 200);
    };

    // ─── Build UI ───────────────────────────────────────────
    DailyChallenge.buildUI = function () {
        var container = document.getElementById('dailyChallengeContent');
        if (!container) return;

        var challenge = generateChallenge();
        var bestScore = DailyChallenge.getBestScore();
        var completed = DailyChallenge.hasCompletedToday();

        var shapeName = { 5: 'Pentagon', 6: 'Hexagon', 8: 'Octagon' };
        var shapeIcon = { 5: '⬠', 6: '⬡', 8: '⯃' };

        var html = '<div class="dc-header">' +
            '<div class="dc-date">' + challenge.date + '</div>' +
            '<div class="dc-name">' + challenge.name + '</div>' +
        '</div>';

        html += '<div class="dc-params">' +
            '<div class="dc-param"><span class="dc-param-icon">' + (shapeIcon[challenge.sides] || '⬡') + '</span><span class="dc-param-label">' + (shapeName[challenge.sides] || 'Hexagon') + '</span></div>' +
            '<div class="dc-param"><span class="dc-param-icon">⚡</span><span class="dc-param-label">Speed ' + challenge.speed + 'x</span></div>' +
            '<div class="dc-param"><span class="dc-param-icon">🎯</span><span class="dc-param-label">Target: ' + challenge.targetScore + '</span></div>' +
            '<div class="dc-param"><span class="dc-param-icon">❤️</span><span class="dc-param-label">' + challenge.lives + ' Lives</span></div>' +
        '</div>';

        // Color preview
        html += '<div class="dc-colors">';
        for (var i = 0; i < challenge.colors.length; i++) {
            html += '<div class="dc-color-dot" style="background:' + challenge.colors[i] + '"></div>';
        }
        html += '</div>';

        if (completed) {
            html += '<div class="dc-completed">✅ Completed! Best: ' + bestScore + '</div>';
        } else if (bestScore > 0) {
            html += '<div class="dc-best">Best attempt: ' + bestScore + '</div>';
        }

        html += '<button class="dc-play-btn" id="dcPlayBtn">' +
            (completed ? '🔄 PLAY AGAIN' : '🎮 START CHALLENGE') +
        '</button>';

        container.innerHTML = html;

        // Bind play button
        document.getElementById('dcPlayBtn').addEventListener('click', function () {
            DailyChallenge.start();
        });
    };

    // ─── Time until next challenge ──────────────────────────
    DailyChallenge.getTimeUntilNext = function () {
        var now = new Date();
        var tomorrow = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);
        var diff = tomorrow - now;
        var hours = Math.floor(diff / 3600000);
        var minutes = Math.floor((diff % 3600000) / 60000);
        return hours + 'h ' + minutes + 'm';
    };

})();
