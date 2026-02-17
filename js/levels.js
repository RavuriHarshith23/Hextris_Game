// ═══════════════════════════════════════════════════════════════
// Hextris - Campaign Level System
// 20 unique levels to unlock and master — each with its own
// speed, colors, shape, and target score
// ═══════════════════════════════════════════════════════════════

(function () {
    'use strict';

    window.GameLevels = {};

    var STORAGE_KEY = 'hextris_levels';

    // ─── Level Definitions ──────────────────────────────────
    var LEVELS = [
        {
            id: 1, name: 'First Steps',
            desc: 'Learn the basics with slow blocks and 3 colors.',
            icon: '🌱', target: 300,
            colors: ['#e74c3c', '#3498db', '#2ecc71'],
            speed: 0.5, sides: 6, blockSize: 'normal',
            bgColor: '#0d0d1a'
        },
        {
            id: 2, name: 'Four Colors',
            desc: 'A new color enters the mix. Stay sharp!',
            icon: '🎨', target: 500,
            colors: ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71'],
            speed: 0.6, sides: 6, blockSize: 'normal',
            bgColor: '#0d1a0d'
        },
        {
            id: 3, name: 'Neon Nights',
            desc: 'Vibrant neon blocks light up the hex.',
            icon: '💜', target: 700,
            colors: ['#ff006e', '#fb5607', '#8338ec', '#06d6a0'],
            speed: 0.65, sides: 6, blockSize: 'normal',
            bgColor: '#0a0014'
        },
        {
            id: 4, name: 'Speed Up!',
            desc: 'Blocks fall a bit faster now. React quickly!',
            icon: '⚡', target: 900,
            colors: ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71'],
            speed: 0.8, sides: 6, blockSize: 'normal',
            bgColor: '#1a0d0d'
        },
        {
            id: 5, name: 'Deep Ocean',
            desc: 'Dive into cool ocean blues.',
            icon: '🌊', target: 1200,
            colors: ['#023e8a', '#0077b6', '#00b4d8', '#90e0ef'],
            speed: 0.75, sides: 6, blockSize: 'normal',
            bgColor: '#001224'
        },
        {
            id: 6, name: 'Pentagon',
            desc: 'Five sides change everything. Adapt!',
            icon: '⬠', target: 1000,
            colors: ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71'],
            speed: 0.65, sides: 5, blockSize: 'normal',
            bgColor: '#14140d'
        },
        {
            id: 7, name: 'Sunset Blaze',
            desc: 'Warm sunset tones at higher speed.',
            icon: '🌅', target: 1500,
            colors: ['#ff6b6b', '#ffa502', '#ff6348', '#ff4757'],
            speed: 0.85, sides: 6, blockSize: 'normal',
            bgColor: '#1a0f05'
        },
        {
            id: 8, name: 'Tight Spaces',
            desc: 'Smaller blocks, more rows to fill.',
            icon: '🔬', target: 1800,
            colors: ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71'],
            speed: 0.7, sides: 6, blockSize: 'small',
            bgColor: '#0d0d1a'
        },
        {
            id: 9, name: 'Cyber Grid',
            desc: 'Cyberpunk vibes with speedy blocks.',
            icon: '🤖', target: 2000,
            colors: ['#f72585', '#7209b7', '#4361ee', '#4cc9f0'],
            speed: 0.9, sides: 6, blockSize: 'normal',
            bgColor: '#0a0020'
        },
        {
            id: 10, name: 'Forest Trail',
            desc: 'Peaceful forest greens, quick reflexes needed.',
            icon: '🌲', target: 2500,
            colors: ['#2d6a4f', '#52b788', '#95d5b2', '#b7e4c7'],
            speed: 0.85, sides: 6, blockSize: 'normal',
            bgColor: '#0a1a0d'
        },
        {
            id: 11, name: 'Big Blocks',
            desc: 'Chunky blocks fill up fast!',
            icon: '📦', target: 2000,
            colors: ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71'],
            speed: 0.8, sides: 6, blockSize: 'large',
            bgColor: '#1a1a0d'
        },
        {
            id: 12, name: 'Pastel Dream',
            desc: 'Soft pastel shades at serious speed.',
            icon: '🦋', target: 3000,
            colors: ['#ffadad', '#ffd6a5', '#caffbf', '#a0c4ff'],
            speed: 0.95, sides: 6, blockSize: 'normal',
            bgColor: '#14101a'
        },
        {
            id: 13, name: 'Octagon',
            desc: 'Eight sides — maximum chaos!',
            icon: '🛑', target: 2500,
            colors: ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71', '#9b59b6'],
            speed: 0.75, sides: 8, blockSize: 'normal',
            bgColor: '#0d0d1a'
        },
        {
            id: 14, name: 'Monochrome',
            desc: 'Shades of gray test your focus.',
            icon: '🖤', target: 3500,
            colors: ['#ffffff', '#a0a0a0', '#606060', '#303030'],
            speed: 0.95, sides: 6, blockSize: 'normal',
            bgColor: '#0a0a0a'
        },
        {
            id: 15, name: 'Speed Demon',
            desc: 'Blocks rain down at frightening speed.',
            icon: '👹', target: 4000,
            colors: ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71'],
            speed: 1.1, sides: 6, blockSize: 'normal',
            bgColor: '#1a0000'
        },
        {
            id: 16, name: 'Rainbow Road',
            desc: 'Five colors, fast pace, pure skill.',
            icon: '🌈', target: 4500,
            colors: ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71', '#9b59b6'],
            speed: 1.0, sides: 6, blockSize: 'normal',
            bgColor: '#100d1a'
        },
        {
            id: 17, name: 'Tiny Terror',
            desc: 'Tiny blocks, crazy speed. Good luck!',
            icon: '🐜', target: 5000,
            colors: ['#ff006e', '#fb5607', '#8338ec', '#06d6a0'],
            speed: 1.15, sides: 6, blockSize: 'small',
            bgColor: '#0d0a14'
        },
        {
            id: 18, name: 'Pentagon Rush',
            desc: 'Pentagon at insane speed.',
            icon: '🔥', target: 6000,
            colors: ['#ff6b6b', '#ffa502', '#ff6348', '#ff4757', '#e74c3c'],
            speed: 1.2, sides: 5, blockSize: 'normal',
            bgColor: '#1a0500'
        },
        {
            id: 19, name: 'Octagon Fury',
            desc: 'Eight sides, five colors, max speed.',
            icon: '💀', target: 7000,
            colors: ['#f72585', '#7209b7', '#4361ee', '#4cc9f0', '#06d6a0'],
            speed: 1.25, sides: 8, blockSize: 'normal',
            bgColor: '#14001a'
        },
        {
            id: 20, name: 'SUPREME',
            desc: 'The ultimate challenge. Only legends survive.',
            icon: '👑', target: 10000,
            colors: ['#f1c40f', '#e74c3c', '#9b59b6', '#3498db', '#2ecc71'],
            speed: 1.4, sides: 6, blockSize: 'normal',
            bgColor: '#1a1400'
        }
    ];

    // Block size configs
    var BLOCKSIZE_MAP = {
        small: { height: 14, rows: 10 },
        normal: null,
        large: { height: 26, rows: 6 }
    };

    // ─── State ──────────────────────────────────────────────
    var _progress = {};
    var _activeLevel = null;
    var _activeLevelId = null;

    // ─── Load / Save ────────────────────────────────────────
    function loadProgress() {
        try {
            var saved = localStorage.getItem(STORAGE_KEY);
            if (saved) _progress = JSON.parse(saved);
        } catch (e) { _progress = {}; }
        if (!_progress[1]) {
            _progress[1] = { unlocked: true, bestScore: 0, stars: 0 };
        }
    }

    function saveProgress() {
        try { localStorage.setItem(STORAGE_KEY, JSON.stringify(_progress)); } catch (e) {}
    }

    function calcStars(level, score) {
        if (score < level.target) return 0;
        if (score >= level.target * 2) return 3;
        if (score >= level.target * 1.5) return 2;
        return 1;
    }

    // ─── Public Getters ─────────────────────────────────────
    GameLevels.getLevels = function () { return LEVELS; };
    GameLevels.getProgress = function () { return _progress; };
    GameLevels.getActiveLevel = function () { return _activeLevel; };
    GameLevels.isUnlocked = function (id) { return _progress[id] && _progress[id].unlocked; };
    GameLevels.getBestScore = function (id) { return (_progress[id] && _progress[id].bestScore) || 0; };
    GameLevels.getStars = function (id) { return (_progress[id] && _progress[id].stars) || 0; };

    GameLevels.getTotalStars = function () {
        var t = 0;
        for (var k in _progress) t += (_progress[k].stars || 0);
        return t;
    };

    GameLevels.getActiveSides = function () {
        return _activeLevel ? _activeLevel.sides : null;
    };

    // ─── Init ───────────────────────────────────────────────
    GameLevels.init = function () {
        loadProgress();
    };

    // ─── Apply level config to game settings ────────────────
    GameLevels.applyLevel = function (levelId) {
        var level = null;
        for (var i = 0; i < LEVELS.length; i++) {
            if (LEVELS[i].id === levelId) { level = LEVELS[i]; break; }
        }
        if (!level) return;

        _activeLevel = level;
        _activeLevelId = levelId;

        // Colors
        window.colors = level.colors.slice();
        if (typeof GameConfig !== 'undefined') {
            GameConfig.rebuildColorMaps();
        } else {
            window.hexColorsToTintedColors = {};
            window.rgbToHex = {};
            window.rgbColorsToTintedColors = {};
            for (var c = 0; c < window.colors.length; c++) {
                var hx = window.colors[c];
                var ob = _hexToRgb(hx);
                var r2 = Math.round(ob.r + (255 - ob.r) * 0.6);
                var g2 = Math.round(ob.g + (255 - ob.g) * 0.6);
                var b2 = Math.round(ob.b + (255 - ob.b) * 0.6);
                var tinted = 'rgb(' + r2 + ',' + g2 + ',' + b2 + ')';
                window.hexColorsToTintedColors[hx] = tinted;
                var rgb = 'rgb(' + ob.r + ',' + ob.g + ',' + ob.b + ')';
                window.rgbToHex[rgb] = hx;
                window.rgbColorsToTintedColors[rgb] = tinted;
            }
        }

        // Speed
        settings.speedModifier = level.speed;
        settings.creationSpeedModifier = level.speed;

        // Block size
        var bs = BLOCKSIZE_MAP[level.blockSize];
        if (bs) {
            settings.baseBlockHeight = bs.height;
            settings.blockHeight = bs.height * settings.scale;
            settings.rows = bs.rows;
        }

        // Background
        if (level.bgColor) {
            window.hexagonBackgroundColor = level.bgColor;
            window.hexagonBackgroundColorClear = level.bgColor + '80';
        }

        console.log('[Levels] Applied Level', levelId, level.name);
    };

    // ─── Complete level ─────────────────────────────────────
    GameLevels.completeLevel = function (finalScore) {
        if (!_activeLevel) return null;
        var lvl = _activeLevel;
        var stars = calcStars(lvl, finalScore);
        var passed = stars > 0;

        if (!_progress[lvl.id]) {
            _progress[lvl.id] = { unlocked: true, bestScore: 0, stars: 0 };
        }
        if (finalScore > _progress[lvl.id].bestScore) {
            _progress[lvl.id].bestScore = finalScore;
        }
        if (stars > _progress[lvl.id].stars) {
            _progress[lvl.id].stars = stars;
        }

        // Unlock next
        var nextId = lvl.id + 1;
        if (passed && nextId <= LEVELS.length) {
            if (!_progress[nextId]) {
                _progress[nextId] = { unlocked: true, bestScore: 0, stars: 0 };
            } else {
                _progress[nextId].unlocked = true;
            }
        }

        saveProgress();
        return { level: lvl, score: finalScore, stars: stars, passed: passed, nextUnlocked: passed && nextId <= LEVELS.length };
    };

    // ─── Clear active level ─────────────────────────────────
    GameLevels.clearActive = function () {
        _activeLevel = null;
        _activeLevelId = null;
        window.hexagonBackgroundColor = 'rgb(26, 26, 46)';
        window.hexagonBackgroundColorClear = 'rgba(26, 26, 46, 0.5)';
    };

    GameLevels.resetProgress = function () {
        _progress = { 1: { unlocked: true, bestScore: 0, stars: 0 } };
        saveProgress();
    };

    // ─── Build Level Select Grid ────────────────────────────
    GameLevels.buildLevelSelectUI = function () {
        var grid = document.getElementById('levelGrid');
        if (!grid) return;
        grid.innerHTML = '';

        var totalStars = GameLevels.getTotalStars();
        var starHeader = document.getElementById('lvlTotalStars');
        if (starHeader) starHeader.textContent = '⭐ ' + totalStars + ' / ' + (LEVELS.length * 3);

        LEVELS.forEach(function (lvl) {
            var unlocked = GameLevels.isUnlocked(lvl.id);
            var stars = GameLevels.getStars(lvl.id);
            var best = GameLevels.getBestScore(lvl.id);

            var card = document.createElement('div');
            card.className = 'lvl-card' + (unlocked ? '' : ' locked');
            card.dataset.levelId = lvl.id;

            var colorBar = '<div class="lvl-color-bar">';
            for (var c = 0; c < lvl.colors.length; c++) {
                colorBar += '<span style="background:' + lvl.colors[c] + '"></span>';
            }
            colorBar += '</div>';

            var starsHtml = '<div class="lvl-stars">';
            for (var s = 0; s < 3; s++) {
                starsHtml += '<span class="lvl-star ' + (s < stars ? 'earned' : '') + '">★</span>';
            }
            starsHtml += '</div>';

            var shapeIcon = lvl.sides === 5 ? '⬠' : (lvl.sides === 8 ? '⯃' : '⬡');

            card.innerHTML =
                colorBar +
                '<div class="lvl-icon">' + (unlocked ? lvl.icon : '🔒') + '</div>' +
                '<div class="lvl-num">Level ' + lvl.id + '</div>' +
                '<div class="lvl-name">' + lvl.name + '</div>' +
                starsHtml +
                (unlocked && best > 0 ? '<div class="lvl-best">Best: ' + best + '</div>' : '') +
                '<div class="lvl-meta">' +
                    '<span class="lvl-shape">' + shapeIcon + '</span>' +
                    '<span class="lvl-target">🎯 ' + lvl.target + '</span>' +
                '</div>';

            grid.appendChild(card);
        });
    };

    // ─── Show Level Results ─────────────────────────────────
    GameLevels.showLevelResults = function (scr) {
        var result = GameLevels.completeLevel(scr);
        if (!result) return;

        // Level win particles & stats
        if (result.passed) {
            if (typeof Particles !== 'undefined') {
                var cx = (typeof trueCanvas !== 'undefined') ? trueCanvas.width / 2 : 400;
                var cy = (typeof trueCanvas !== 'undefined') ? trueCanvas.height / 2 : 400;
                Particles.levelWin(cx, cy, result.level.colors || window.colors || ['#f1c40f']);
            }
            if (typeof GameStats !== 'undefined') GameStats.onLevelComplete();
        }

        var overlay = document.getElementById('levelResultOverlay');
        if (!overlay) return;

        var lvl = result.level;
        var starsHtml = '';
        for (var s = 0; s < 3; s++) {
            var delay = s * 0.3;
            starsHtml += '<span class="lvl-result-star ' + (s < result.stars ? 'earned' : '') + '" style="animation-delay:' + delay + 's">★</span>';
        }

        var nextBtn = '';
        if (result.passed && lvl.id < LEVELS.length) {
            nextBtn = '<button class="mp-btn primary lvl-next-btn" data-next="' + (lvl.id + 1) + '">▶ Next Level</button>';
        }

        overlay.innerHTML =
            '<div class="lvl-result-panel">' +
                '<div class="lvl-result-title">' + (result.passed ? '🎉 LEVEL COMPLETE!' : '💔 NOT QUITE...') + '</div>' +
                '<div class="lvl-result-level">Level ' + lvl.id + ' — ' + lvl.name + '</div>' +
                '<div class="lvl-result-score">' + scr + '</div>' +
                '<div class="lvl-result-target">' + (result.passed ? 'Target: ' + lvl.target + ' ✓' : 'Need ' + (lvl.target - scr) + ' more to pass') + '</div>' +
                '<div class="lvl-result-stars-row">' + starsHtml + '</div>' +
                '<div class="lvl-result-btns">' +
                    '<button class="mp-btn lvl-menu-btn">📋 Levels</button>' +
                    '<button class="mp-btn accent lvl-retry-btn" data-level="' + lvl.id + '">🔄 Retry</button>' +
                    nextBtn +
                '</div>' +
            '</div>';

        overlay.classList.add('show');
    };

    // ─── Start a level ──────────────────────────────────────
    GameLevels.startLevel = function (levelId) {
        $('.mp-screen').hide();
        var resultOv = document.getElementById('levelResultOverlay');
        if (resultOv) resultOv.classList.remove('show');
        $('#gameoverscreen').fadeOut(100);
        document.getElementById('canvas').className = '';

        // Apply level config AFTER initialize() resets settings
        // We call init(1) which calls initialize internally, then we override
        GameLevels.applyLevel(levelId);

        // Update HUD
        var hud = document.getElementById('levelDisplay');
        if (hud) {
            document.getElementById('levelNumber').textContent = 'LVL ' + levelId;
            document.getElementById('levelName').textContent = _activeLevel.name;
            document.getElementById('levelProgressFill').style.width = '0%';
            document.getElementById('levelProgressFill').style.background = _activeLevel.colors[0];
            hud.classList.add('visible');
        }

        if (typeof GameConfig !== 'undefined' && GameConfig.get('enablePowerUps')) {
            $('#powerUpBar').addClass('visible');
        }

        if (typeof MP !== 'undefined') {
            MP.isMultiplayer = false;
            MP.mode = 'level';
        }
        $('#opponentPanel').hide();
        $('#canvas').removeClass('mp-canvas');

        clearSaveState();
        init(1);

        // Re-apply level config AFTER init (since init calls GameConfig.apply which may override)
        GameLevels.applyLevel(levelId);
    };

    // ─── Update HUD during gameplay ─────────────────────────
    GameLevels.updateHUD = function (currentScore) {
        if (!_activeLevel) return;
        var pct = Math.min(100, (currentScore / _activeLevel.target) * 100);
        var bar = document.getElementById('levelProgressFill');
        if (bar) {
            bar.style.width = pct + '%';
            bar.style.background = pct >= 100 ? '#2ecc71' : _activeLevel.colors[0];
        }
    };

    // ─── Bind UI events ─────────────────────────────────────
    GameLevels.bindUI = function () {
        $(document).on('click', '.lvl-card:not(.locked)', function () {
            var levelId = parseInt(this.dataset.levelId);
            GameLevels.startLevel(levelId);
        });

        $(document).on('click', '.lvl-next-btn', function (e) {
            e.preventDefault();
            document.getElementById('levelResultOverlay').classList.remove('show');
            GameLevels.startLevel(parseInt(this.dataset.next));
        });

        $(document).on('click', '.lvl-retry-btn', function (e) {
            e.preventDefault();
            document.getElementById('levelResultOverlay').classList.remove('show');
            GameLevels.startLevel(parseInt(this.dataset.level));
        });

        $(document).on('click', '.lvl-menu-btn', function (e) {
            e.preventDefault();
            document.getElementById('levelResultOverlay').classList.remove('show');
            $('#gameoverscreen').fadeOut();
            document.getElementById('canvas').className = '';
            GameLevels.clearActive();
            if (typeof LobbyUI !== 'undefined') {
                LobbyUI.showScreen('mpLevelSelectScreen');
            }
            GameLevels.buildLevelSelectUI();
        });
    };

    // ─── Reset (compatibility stub) ─────────────────────────
    GameLevels.reset = function () {
        // No-op for campaign mode — active level persists across retries
    };

    // ─── Helpers ────────────────────────────────────────────
    function _hexToRgb(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        return {
            r: parseInt(hex.substr(0, 2), 16),
            g: parseInt(hex.substr(2, 2), 16),
            b: parseInt(hex.substr(4, 2), 16)
        };
    }

    // ─── Auto-init ──────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () {
            GameLevels.init();
            GameLevels.bindUI();
        });
    } else {
        GameLevels.init();
        GameLevels.bindUI();
    }

})();
