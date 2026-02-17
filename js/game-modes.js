// ═══════════════════════════════════════════════════════════════
// Hextris - Game Modes System (Timer Only)
// ═══════════════════════════════════════════════════════════════

(function () {
    'use strict';

    window.GameModes = {};

    var _activeMode = null;   // 'timer' or null
    var _modeState = {};
    var _selectedDuration = 60; // default 60 seconds

    // ─── Getters ────────────────────────────────────────────
    GameModes.getActiveMode = function () { return _activeMode; };
    GameModes.getModeState = function () { return _modeState; };
    GameModes.getSelectedDuration = function () { return _selectedDuration; };
    GameModes.setSelectedDuration = function (d) { _selectedDuration = d; };

    // ─── Start Timer Mode ───────────────────────────────────
    GameModes.start = function (mode, duration) {
        _activeMode = 'timer';
        var dur = duration || _selectedDuration || 60;
        _modeState = {
            score: 0,
            blocksCleared: 0,
            maxCombo: 0,
            currentCombo: 0,
            timeAlive: 0,
            startTime: Date.now(),
            timerDuration: dur,
            timerRemaining: dur,
            coinsEarned: 0
        };

        // Hide all screens
        $('.mp-screen').hide();
        $('#gameoverscreen').fadeOut(100);
        document.getElementById('canvas').className = '';

        // Reset game-level mode flags
        window.gameMode = 'timer';
        window.dailyTargetScore = null;
        if (typeof GameLevels !== 'undefined') GameLevels.clearActive();

        if (typeof MP !== 'undefined') {
            MP.isMultiplayer = false;
            MP.mode = 'timer';
        }
        $('#opponentPanel').hide();
        $('#canvas').removeClass('mp-canvas');

        // Show timer HUD
        GameModes.showModeHUD();

        // Start game
        clearSaveState();
        init(1);

        // Start countdown
        _modeState.timerInterval = setInterval(function () {
            if (typeof gameState !== 'undefined' && gameState === 1) {
                _modeState.timerRemaining--;
                GameModes.updateTimerHUD();
                if (_modeState.timerRemaining <= 0) {
                    GameModes.onTimerEnd();
                }
            }
        }, 1000);

        console.log('[Modes] Timer started:', dur + 's');
    };

    // ─── Update (called each frame from animLoop) ───────────
    GameModes.update = function (currentScore) {
        if (!_activeMode) return;
        _modeState.score = currentScore;
        _modeState.timeAlive = (Date.now() - _modeState.startTime) / 1000;
    };

    // ─── Track block clears ─────────────────────────────────
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
            GameModes.showModeResults('timeup');
        }, 600);
    };

    // ─── On game over (lives ran out during timer) ──────────
    GameModes.onGameOver = function (finalScore) {
        if (!_activeMode) return false;

        if (_modeState.timerInterval) clearInterval(_modeState.timerInterval);
        _modeState.score = finalScore;

        var coinsEarned = Math.floor(finalScore / 10);
        _modeState.coinsEarned = coinsEarned;
        if (typeof CoinShop !== 'undefined') CoinShop.addCoins(coinsEarned);

        setTimeout(function () {
            GameModes.showModeResults('gameover');
        }, 800);

        return true;
    };

    // ─── Show mode HUD ─────────────────────────────────────
    GameModes.showModeHUD = function () {
        var el = document.getElementById('modeHUD');
        if (!el) return;

        var dur = _modeState.timerDuration || _selectedDuration;
        var m = Math.floor(dur / 60);
        var s = dur % 60;
        var timeStr = m + ':' + (s < 10 ? '0' : '') + s;

        el.innerHTML = '<div class="mode-hud-title">⏱️ TIMER</div>' +
            '<div id="modeTimer" class="mode-hud-timer">' + timeStr + '</div>';

        el.style.borderColor = '#e74c3c';
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

        if (s <= 10) {
            el.classList.add('timer-low');
        } else {
            el.classList.remove('timer-low');
        }
    };

    // ─── Mode Results Overlay ───────────────────────────────
    GameModes.showModeResults = function (reason) {
        var overlay = document.getElementById('modeResultOverlay');
        if (!overlay) return;

        var title = reason === 'timeup' ? 'TIME OVER' : 'GAME OVER';
        var icon = reason === 'timeup' ? '⏱️' : '💀';
        var dur = _modeState.timerDuration || 60;

        var html = '<div class="mode-result-panel">' +
            '<div class="mode-result-icon">' + icon + '</div>' +
            '<div class="mode-result-title">' + title + '</div>' +
            '<div class="mode-result-score">' + _modeState.score + '</div>' +
            '<div class="mode-result-label">POINTS</div>' +
            '<div class="mode-result-stats">' +
                '<div class="mrs"><span>⏱️</span> ' + dur + 's duration</div>' +
                '<div class="mrs"><span>🧱</span> ' + _modeState.blocksCleared + ' blocks cleared</div>' +
                '<div class="mrs"><span>🔥</span> ' + _modeState.maxCombo + 'x max combo</div>' +
                '<div class="mrs"><span>⏳</span> ' + Math.floor(_modeState.timeAlive) + 's survived</div>' +
                '<div class="mrs coins"><span>🪙</span> +' + _modeState.coinsEarned + ' coins earned</div>' +
            '</div>' +
            '<div class="mode-result-btns">' +
                '<button class="mp-btn mode-home-btn">🏠 Home</button>' +
                '<button class="mp-btn accent mode-retry-btn" data-mode="timer">🔄 Retry</button>' +
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
        // Home button from results
        $(document).on('click', '.mode-home-btn', function (e) {
            e.preventDefault();
            GameModes.clear();
            $('#gameoverscreen').fadeOut(100);
            document.getElementById('canvas').className = '';
            window.gameMode = null;
            if (typeof LobbyUI !== 'undefined') LobbyUI.showMainMenu();
        });

        // Retry button from results
        $(document).on('click', '.mode-retry-btn', function (e) {
            e.preventDefault();
            GameModes.clear();
            $('#gameoverscreen').fadeOut(100);
            document.getElementById('canvas').className = '';
            GameModes.start('timer', _selectedDuration);
        });

        // Timer selection screen: duration buttons
        $(document).on('click', '.timer-option-btn', function (e) {
            e.preventDefault();
            $('.timer-option-btn').removeClass('selected');
            $(this).addClass('selected');
            _selectedDuration = parseInt(this.dataset.time) || 60;
        });

        // Timer mode: Start button
        $('#timerStartBtn').on('click', function (e) {
            e.preventDefault();
            GameModes.start('timer', _selectedDuration);
        });

        // Timer card on main menu
        $('#mpBtnTimer').on('click', function (e) {
            e.preventDefault();
            if (typeof LobbyUI !== 'undefined') LobbyUI.showScreen('timerSelectScreen');
        });

        // Shop button on main menu
        $('#mpBtnShop').on('click', function (e) {
            e.preventDefault();
            if (typeof CoinShop !== 'undefined') CoinShop.buildShopUI();
            if (typeof LobbyUI !== 'undefined') LobbyUI.showScreen('mpShopScreen');
        });
    };

    // ─── Auto-init ──────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { GameModes.bindUI(); });
    } else {
        GameModes.bindUI();
    }

})();
