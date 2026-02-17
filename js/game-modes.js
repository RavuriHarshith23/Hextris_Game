// ═══════════════════════════════════════════════════════════════
// Hextris - Game Modes System
// Endless Mode, Challenge Mode, Timer Mode
// ═══════════════════════════════════════════════════════════════

(function () {
    'use strict';

    window.GameModes = {};

    var _activeMode = null;   // 'endless', 'challenge', 'timer', null
    var _modeState = {};

    // ─── Mode Definitions ───────────────────────────────────
    var MODES = {
        endless: {
            name: 'Endless Mode',
            icon: '♾️',
            desc: 'No target, no time limit. Play until you drop!',
            color: '#2ecc71'
        },
        challenge: {
            name: 'Challenge Mode',
            icon: '🏆',
            desc: 'Complete objectives to earn bonus coins!',
            color: '#e67e22'
        },
        timer: {
            name: 'Timer Mode',
            icon: '⏱️',
            desc: 'Score as high as you can in 90 seconds!',
            color: '#e74c3c'
        }
    };

    // ─── Challenge objectives ───────────────────────────────
    var CHALLENGES = [
        { id: 1, desc: 'Score 200 points', check: function (s) { return s.score >= 200; }, reward: 50 },
        { id: 2, desc: 'Score 500 points', check: function (s) { return s.score >= 500; }, reward: 100 },
        { id: 3, desc: 'Clear 20 blocks', check: function (s) { return s.blocksCleared >= 20; }, reward: 75 },
        { id: 4, desc: 'Get a 5x combo', check: function (s) { return s.maxCombo >= 5; }, reward: 120 },
        { id: 5, desc: 'Score 1000 points', check: function (s) { return s.score >= 1000; }, reward: 200 },
        { id: 6, desc: 'Clear 50 blocks', check: function (s) { return s.blocksCleared >= 50; }, reward: 150 },
        { id: 7, desc: 'Survive 60 seconds', check: function (s) { return s.timeAlive >= 60; }, reward: 100 },
        { id: 8, desc: 'Score 2000 points', check: function (s) { return s.score >= 2000; }, reward: 300 },
    ];

    // ─── Getters ────────────────────────────────────────────
    GameModes.getActiveMode = function () { return _activeMode; };
    GameModes.getModeState = function () { return _modeState; };
    GameModes.getModes = function () { return MODES; };

    // ─── Start a mode ───────────────────────────────────────
    GameModes.start = function (mode) {
        _activeMode = mode;
        _modeState = {
            score: 0,
            blocksCleared: 0,
            maxCombo: 0,
            currentCombo: 0,
            timeAlive: 0,
            startTime: Date.now(),
            timerDuration: 90,      // seconds for timer mode
            timerRemaining: 90,
            challengeIndex: 0,
            challengesDone: [],
            coinsEarned: 0,
            speedMultiplier: 1
        };

        // Hide all screens
        $('.mp-screen').hide();
        $('#gameoverscreen').fadeOut(100);
        document.getElementById('canvas').className = '';

        // Reset game-level mode flags
        window.gameMode = mode;
        window.dailyTargetScore = null;
        if (typeof GameLevels !== 'undefined') GameLevels.clearActive();

        if (typeof MP !== 'undefined') {
            MP.isMultiplayer = false;
            MP.mode = mode;
        }
        $('#opponentPanel').hide();
        $('#canvas').removeClass('mp-canvas');

        // Show mode HUD
        GameModes.showModeHUD(mode);

        // Start game
        clearSaveState();
        init(1);

        // Mode-specific setup
        if (mode === 'endless') {
            // Endless: progressive difficulty
            _modeState.speedMultiplier = 1;
        } else if (mode === 'challenge') {
            // Challenge: show first objective
            GameModes.showChallengeObjective();
        } else if (mode === 'timer') {
            // Timer: start countdown
            _modeState.timerInterval = setInterval(function () {
                if (typeof gameState !== 'undefined' && gameState === 1) {
                    _modeState.timerRemaining--;
                    GameModes.updateTimerHUD();
                    if (_modeState.timerRemaining <= 0) {
                        GameModes.onTimerEnd();
                    }
                }
            }, 1000);
        }

        console.log('[Modes] Started:', mode);
    };

    // ─── Update (called each frame from animLoop) ───────────
    GameModes.update = function (currentScore) {
        if (!_activeMode) return;

        _modeState.score = currentScore;
        _modeState.timeAlive = (Date.now() - _modeState.startTime) / 1000;

        if (_activeMode === 'endless') {
            // Progressive difficulty: speed increases every 500 pts
            var newMult = 1 + Math.floor(currentScore / 500) * 0.05;
            if (newMult !== _modeState.speedMultiplier) {
                _modeState.speedMultiplier = newMult;
                var speedEl = document.getElementById('modeSpeedVal');
                if (speedEl) speedEl.textContent = newMult.toFixed(2) + 'x';
            }
        } else if (_activeMode === 'challenge') {
            // Check current challenge completion
            var ci = _modeState.challengeIndex;
            if (ci < CHALLENGES.length) {
                var ch = CHALLENGES[ci];
                if (ch.check(_modeState)) {
                    _modeState.challengesDone.push(ci);
                    _modeState.coinsEarned += ch.reward;
                    // Award coins
                    if (typeof CoinShop !== 'undefined') CoinShop.addCoins(ch.reward);
                    GameModes.showChallengeComplete(ch);
                    _modeState.challengeIndex++;
                    setTimeout(function () {
                        GameModes.showChallengeObjective();
                    }, 2000);
                }
            }
        }
    };

    // ─── Track block clears for challenges ──────────────────
    GameModes.onBlockCleared = function () {
        if (_activeMode) _modeState.blocksCleared++;
    };

    GameModes.onCombo = function (comboCount) {
        if (_activeMode) {
            _modeState.currentCombo = comboCount;
            if (comboCount > _modeState.maxCombo) _modeState.maxCombo = comboCount;
        }
    };

    // ─── Timer end ──────────────────────────────────────────
    GameModes.onTimerEnd = function () {
        if (_modeState.timerInterval) clearInterval(_modeState.timerInterval);
        _modeState.timerRemaining = 0;
        gameState = 2;
        clearSaveState();

        // Coin reward based on score
        var coinsEarned = Math.floor(_modeState.score / 10);
        _modeState.coinsEarned = coinsEarned;
        if (typeof CoinShop !== 'undefined') CoinShop.addCoins(coinsEarned);

        if ($('#pauseBtn').is(':visible')) $('#pauseBtn').fadeOut(150);

        setTimeout(function () {
            GameModes.showModeResults();
        }, 600);
    };

    // ─── On game over (called from checkGameOver) ───────────
    GameModes.onGameOver = function (finalScore) {
        if (!_activeMode) return false;

        if (_modeState.timerInterval) clearInterval(_modeState.timerInterval);
        _modeState.score = finalScore;

        // Coin rewards
        var coinsEarned = 0;
        if (_activeMode === 'endless') {
            coinsEarned = Math.floor(finalScore / 10);
        } else if (_activeMode === 'challenge') {
            coinsEarned = _modeState.coinsEarned; // already awarded per challenge
        } else if (_activeMode === 'timer') {
            coinsEarned = Math.floor(finalScore / 10);
        }
        _modeState.coinsEarned = coinsEarned;
        if (typeof CoinShop !== 'undefined' && _activeMode !== 'challenge') {
            CoinShop.addCoins(coinsEarned);
        }

        setTimeout(function () {
            GameModes.showModeResults();
        }, 800);

        return true; // indicates we handled the game-over display
    };

    // ─── Show mode HUD ─────────────────────────────────────
    GameModes.showModeHUD = function (mode) {
        var el = document.getElementById('modeHUD');
        if (!el) return;

        var info = MODES[mode];
        el.innerHTML = '';

        if (mode === 'endless') {
            el.innerHTML = '<div class="mode-hud-title">' + info.icon + ' ENDLESS</div>' +
                '<div class="mode-hud-stat">Speed: <span id="modeSpeedVal">1.00x</span></div>';
        } else if (mode === 'challenge') {
            el.innerHTML = '<div class="mode-hud-title">' + info.icon + ' CHALLENGE</div>' +
                '<div id="modeObjective" class="mode-hud-obj">Loading...</div>';
        } else if (mode === 'timer') {
            el.innerHTML = '<div class="mode-hud-title">' + info.icon + ' TIMER</div>' +
                '<div id="modeTimer" class="mode-hud-timer">1:30</div>';
        }

        el.style.borderColor = info.color;
        el.classList.add('visible');
    };

    GameModes.hideModeHUD = function () {
        var el = document.getElementById('modeHUD');
        if (el) el.classList.remove('visible');
    };

    // ─── Timer HUD update ───────────────────────────────────
    GameModes.updateTimerHUD = function () {
        var el = document.getElementById('modeTimer');
        if (!el) return;
        var s = Math.max(0, _modeState.timerRemaining);
        var m = Math.floor(s / 60);
        var sec = s % 60;
        el.textContent = m + ':' + (sec < 10 ? '0' : '') + sec;

        // Flash when low
        if (s <= 10) {
            el.classList.add('timer-low');
        }
    };

    // ─── Challenge objectives ───────────────────────────────
    GameModes.showChallengeObjective = function () {
        var ci = _modeState.challengeIndex;
        var el = document.getElementById('modeObjective');
        if (!el) return;
        if (ci >= CHALLENGES.length) {
            el.textContent = '✅ All challenges done!';
            return;
        }
        var ch = CHALLENGES[ci];
        el.textContent = '🎯 ' + ch.desc + ' (+' + ch.reward + ' coins)';
        el.classList.remove('obj-complete');
    };

    GameModes.showChallengeComplete = function (ch) {
        var el = document.getElementById('modeObjective');
        if (el) {
            el.textContent = '✅ ' + ch.desc + ' — +' + ch.reward + ' coins!';
            el.classList.add('obj-complete');
        }
        if (typeof PowerUps !== 'undefined') {
            PowerUps.showEffect('🎯 +' + ch.reward + ' COINS!', '#f1c40f');
        }
    };

    // ─── Mode Results Overlay ───────────────────────────────
    GameModes.showModeResults = function () {
        var overlay = document.getElementById('modeResultOverlay');
        if (!overlay) return;

        var info = MODES[_activeMode] || { name: 'Game', icon: '🎮', color: '#3498db' };

        var html = '<div class="mode-result-panel">' +
            '<div class="mode-result-icon">' + info.icon + '</div>' +
            '<div class="mode-result-title">' + info.name.toUpperCase() + '</div>' +
            '<div class="mode-result-score">' + _modeState.score + '</div>' +
            '<div class="mode-result-label">POINTS</div>' +
            '<div class="mode-result-stats">' +
                '<div class="mrs"><span>🧱</span> ' + _modeState.blocksCleared + ' blocks</div>' +
                '<div class="mrs"><span>⏱️</span> ' + Math.floor(_modeState.timeAlive) + 's survived</div>' +
                '<div class="mrs"><span>🔥</span> ' + _modeState.maxCombo + 'x max combo</div>' +
                '<div class="mrs coins"><span>🪙</span> +' + _modeState.coinsEarned + ' coins earned</div>' +
            '</div>' +
            '<div class="mode-result-btns">' +
                '<button class="mp-btn mode-home-btn">🏠 Home</button>' +
                '<button class="mp-btn accent mode-retry-btn" data-mode="' + _activeMode + '">🔄 Retry</button>' +
            '</div>' +
        '</div>';

        overlay.innerHTML = html;
        overlay.classList.add('show');

        // Hide standard game over
        $('#gameoverscreen').fadeOut(100);
    };

    // ─── Clean up ───────────────────────────────────────────
    GameModes.clear = function () {
        if (_modeState.timerInterval) clearInterval(_modeState.timerInterval);
        _activeMode = null;
        _modeState = {};
        GameModes.hideModeHUD();
        var overlay = document.getElementById('modeResultOverlay');
        if (overlay) overlay.classList.remove('show');
    };

    // ─── Bind UI ────────────────────────────────────────────
    GameModes.bindUI = function () {
        $(document).on('click', '.mode-home-btn', function (e) {
            e.preventDefault();
            GameModes.clear();
            $('#gameoverscreen').fadeOut(100);
            document.getElementById('canvas').className = '';
            window.gameMode = null;
            if (typeof LobbyUI !== 'undefined') LobbyUI.showMainMenu();
        });

        $(document).on('click', '.mode-retry-btn', function (e) {
            e.preventDefault();
            var mode = this.dataset.mode;
            GameModes.clear();
            $('#gameoverscreen').fadeOut(100);
            document.getElementById('canvas').className = '';
            GameModes.start(mode);
        });
    };

    // ─── Auto-init ──────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { GameModes.bindUI(); });
    } else {
        GameModes.bindUI();
    }

})();
