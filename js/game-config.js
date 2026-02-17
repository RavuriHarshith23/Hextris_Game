// ═══════════════════════════════════════════════════════════════
// Hextris - Game Configuration System
// Allows players to customize colors, speed, shape, etc.
// ═══════════════════════════════════════════════════════════════

(function() {
    'use strict';

    window.GameConfig = {};

    var STORAGE_KEY = 'hextris_config';

    // ─── Color presets ──────────────────────────────────────
    var COLOR_PRESETS = {
        classic:   { name: 'Classic',    colors: ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71'] },
        neon:      { name: 'Neon',       colors: ['#ff006e', '#fb5607', '#8338ec', '#06d6a0'] },
        pastel:    { name: 'Pastel',     colors: ['#ffadad', '#ffd6a5', '#caffbf', '#a0c4ff'] },
        ocean:     { name: 'Ocean',      colors: ['#023e8a', '#0077b6', '#00b4d8', '#90e0ef'] },
        sunset:    { name: 'Sunset',     colors: ['#ff6b6b', '#ffa502', '#ff6348', '#ff4757'] },
        forest:    { name: 'Forest',     colors: ['#2d6a4f', '#52b788', '#95d5b2', '#b7e4c7'] },
        cyberpunk: { name: 'Cyberpunk',  colors: ['#f72585', '#7209b7', '#4361ee', '#4cc9f0'] },
        monochrome:{ name: 'Monochrome', colors: ['#ffffff', '#a0a0a0', '#606060', '#303030'] }
    };

    // ─── Default config ─────────────────────────────────────
    var _defaults = {
        colorPreset: 'classic',
        customColors: null,
        hexSides: 6,
        startSpeed: 'normal',     // 'slow', 'normal', 'fast', 'insane'
        blockSize: 'normal',      // 'small', 'normal', 'large'
        livesCount: 3,
        enablePowerUps: true,
        enableLevels: true,
        enableComboTimer: true,
        bgPattern: 'default',     // 'default', 'stars', 'minimal'
        hexShape: 'hexagon'       // 'hexagon', 'pentagon', 'octagon'
    };

    var _config = {};

    // Speed presets
    var SPEED_MAP = {
        slow:   { speedMod: 0.45, creationMod: 0.45 },
        normal: { speedMod: null, creationMod: null },  // Use platform defaults
        fast:   { speedMod: 0.9,  creationMod: 0.9  },
        insane: { speedMod: 1.2,  creationMod: 1.2  }
    };

    // Block size presets
    var BLOCKSIZE_MAP = {
        small:  { height: 14, rows: 10 },
        normal: { height: null, rows: null }, // Platform defaults
        large:  { height: 26, rows: 6 }
    };

    // Shape presets
    var SHAPE_MAP = {
        pentagon: 5,
        hexagon:  6,
        octagon:  8
    };

    // ─── Load config from localStorage ──────────────────────
    GameConfig.load = function() {
        try {
            var saved = localStorage.getItem(STORAGE_KEY);
            if (saved) {
                _config = JSON.parse(saved);
            }
        } catch (e) {
            _config = {};
        }

        // Merge with defaults
        for (var key in _defaults) {
            if (_config[key] === undefined) {
                _config[key] = _defaults[key];
            }
        }
    };

    // ─── Save config to localStorage ────────────────────────
    GameConfig.save = function() {
        try {
            localStorage.setItem(STORAGE_KEY, JSON.stringify(_config));
        } catch (e) {}
    };

    // ─── Get / Set ──────────────────────────────────────────
    GameConfig.get = function(key) {
        return _config[key] !== undefined ? _config[key] : _defaults[key];
    };

    GameConfig.set = function(key, value) {
        _config[key] = value;
        GameConfig.save();
    };

    // ─── Apply config to game settings ──────────────────────
    GameConfig.apply = function() {
        if (typeof settings === 'undefined' || typeof window.colors === 'undefined') return;

        // Apply colors
        var preset = _config.colorPreset || 'classic';
        if (preset === 'custom' && _config.customColors && _config.customColors.length === 4) {
            window.colors = _config.customColors.slice();
        } else if (COLOR_PRESETS[preset]) {
            window.colors = COLOR_PRESETS[preset].colors.slice();
        }

        // Rebuild color maps
        GameConfig.rebuildColorMaps();

        // Apply speed — for 'normal', reset to platform defaults
        var speedKey = _config.startSpeed || 'normal';
        var speedPreset = SPEED_MAP[speedKey];
        if (speedPreset) {
            if (speedPreset.speedMod !== null) {
                settings.speedModifier = speedPreset.speedMod;
                settings.creationSpeedModifier = speedPreset.creationMod;
            } else {
                // 'normal' — use platform defaults
                if (settings.platform === 'mobile') {
                    settings.speedModifier = 0.73;
                    settings.creationSpeedModifier = 0.73;
                } else {
                    settings.speedModifier = 0.65;
                    settings.creationSpeedModifier = 0.65;
                }
            }
        }

        // Apply block size
        var sizeKey = _config.blockSize || 'normal';
        var sizePreset = BLOCKSIZE_MAP[sizeKey];
        if (sizePreset) {
            if (sizePreset.height !== null) {
                settings.baseBlockHeight = sizePreset.height;
                settings.blockHeight = sizePreset.height * settings.scale;
                settings.rows = sizePreset.rows;
            } else {
                // 'normal' — platform defaults
                if (settings.platform === 'mobile') {
                    settings.baseBlockHeight = 20;
                    settings.blockHeight = 20 * settings.scale;
                    settings.rows = 7;
                } else {
                    settings.baseBlockHeight = 20;
                    settings.blockHeight = 15 * settings.scale;
                    settings.rows = 8;
                }
            }
        }

        // Apply lives
        if (_config.livesCount) {
            window.lives = _config.livesCount;
            // Update lives display hearts
            GameConfig.rebuildHearts(_config.livesCount);
        }

        // Log applied config
        console.log('[Config] Applied:', preset, speedKey, sizeKey, 'lives:', _config.livesCount, 'shape:', _config.hexShape);
    };

    // ─── Apply hex shape (must be called BEFORE creating MainHex) ─
    GameConfig.getHexSides = function() {
        var shape = _config.hexShape || 'hexagon';
        return SHAPE_MAP[shape] || 6;
    };

    // ─── Rebuild color lookup maps ──────────────────────────
    GameConfig.rebuildColorMaps = function() {
        // Generate tinted colors for the current palette
        window.hexColorsToTintedColors = {};
        window.rgbToHex = {};
        window.rgbColorsToTintedColors = {};

        for (var i = 0; i < window.colors.length; i++) {
            var hex = window.colors[i];
            var tinted = GameConfig.tintColor(hex, 0.6);
            window.hexColorsToTintedColors[hex] = tinted;

            // Also build rgb mappings
            var rgb = GameConfig.hexToRgbString(hex);
            if (rgb) {
                window.rgbToHex[rgb] = hex;
                window.rgbColorsToTintedColors[rgb] = tinted;
            }
        }
    };

    // ─── Utilities ──────────────────────────────────────────
    GameConfig.hexToRgb = function(hex) {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        return {
            r: parseInt(hex.substr(0, 2), 16),
            g: parseInt(hex.substr(2, 2), 16),
            b: parseInt(hex.substr(4, 2), 16)
        };
    };

    GameConfig.hexToRgbString = function(hex) {
        var c = GameConfig.hexToRgb(hex);
        return 'rgb(' + c.r + ',' + c.g + ',' + c.b + ')';
    };

    GameConfig.tintColor = function(hex, factor) {
        var c = GameConfig.hexToRgb(hex);
        var r = Math.round(c.r + (255 - c.r) * factor);
        var g = Math.round(c.g + (255 - c.g) * factor);
        var b = Math.round(c.b + (255 - c.b) * factor);
        return 'rgb(' + r + ',' + g + ',' + b + ')';
    };

    // ─── Rebuild hearts in the HUD for custom lives count ───
    GameConfig.rebuildHearts = function(count) {
        var container = document.getElementById('livesDisplay');
        if (!container) return;
        container.innerHTML = '';
        for (var i = 0; i < count; i++) {
            var span = document.createElement('span');
            span.className = 'heart';
            span.setAttribute('data-index', i);
            span.innerHTML = '&#10084;&#65039;';
            container.appendChild(span);
        }
    };

    // ─── Populate the settings screen UI ────────────────────
    GameConfig.populateUI = function() {
        // Color preset buttons
        var colorGrid = document.getElementById('cfgColorGrid');
        if (colorGrid) {
            colorGrid.innerHTML = '';
            for (var key in COLOR_PRESETS) {
                var preset = COLOR_PRESETS[key];
                var div = document.createElement('div');
                div.className = 'cfg-color-option' + (_config.colorPreset === key ? ' active' : '');
                div.dataset.preset = key;

                var swatches = '';
                for (var c = 0; c < preset.colors.length; c++) {
                    swatches += '<span class="cfg-swatch" style="background:' + preset.colors[c] + '"></span>';
                }
                div.innerHTML = '<div class="cfg-swatches">' + swatches + '</div>' +
                    '<div class="cfg-preset-name">' + preset.name + '</div>';
                colorGrid.appendChild(div);
            }
        }

        // Speed select
        var speedSel = document.getElementById('cfgSpeed');
        if (speedSel) speedSel.value = _config.startSpeed || 'normal';

        // Block size
        var sizeSel = document.getElementById('cfgBlockSize');
        if (sizeSel) sizeSel.value = _config.blockSize || 'normal';

        // Shape
        var shapeSel = document.getElementById('cfgShape');
        if (shapeSel) shapeSel.value = _config.hexShape || 'hexagon';

        // Lives
        var livesSel = document.getElementById('cfgLives');
        if (livesSel) livesSel.value = _config.livesCount || 3;

        // Toggles
        var puToggle = document.getElementById('cfgPowerUps');
        if (puToggle) puToggle.checked = _config.enablePowerUps !== false;

        var lvlToggle = document.getElementById('cfgLevels');
        if (lvlToggle) lvlToggle.checked = _config.enableLevels !== false;
    };

    // ─── Read from UI and save ──────────────────────────────
    GameConfig.readFromUI = function() {
        // Color preset
        var activeColor = document.querySelector('.cfg-color-option.active');
        if (activeColor) _config.colorPreset = activeColor.dataset.preset;

        // Selects
        var speedSel = document.getElementById('cfgSpeed');
        if (speedSel) _config.startSpeed = speedSel.value;

        var sizeSel = document.getElementById('cfgBlockSize');
        if (sizeSel) _config.blockSize = sizeSel.value;

        var shapeSel = document.getElementById('cfgShape');
        if (shapeSel) _config.hexShape = shapeSel.value;

        var livesSel = document.getElementById('cfgLives');
        if (livesSel) _config.livesCount = parseInt(livesSel.value) || 3;

        // Toggles
        var puToggle = document.getElementById('cfgPowerUps');
        if (puToggle) _config.enablePowerUps = puToggle.checked;

        var lvlToggle = document.getElementById('cfgLevels');
        if (lvlToggle) _config.enableLevels = lvlToggle.checked;

        GameConfig.save();
    };

    // ─── Bind events ────────────────────────────────────────
    GameConfig.bindUI = function() {
        // Color preset selection
        $(document).on('click', '.cfg-color-option', function() {
            $('.cfg-color-option').removeClass('active');
            $(this).addClass('active');
        });

        // Save & Apply button
        $('#cfgBtnSave').on('click', function(e) {
            e.preventDefault();
            GameConfig.readFromUI();
            GameConfig.apply();

            // Show confirmation
            var toast = document.createElement('div');
            toast.className = 'mp-toast';
            toast.textContent = '✓ Settings saved & applied!';
            document.body.appendChild(toast);
            setTimeout(function() { toast.style.opacity = '1'; }, 10);
            setTimeout(function() {
                toast.style.opacity = '0';
                setTimeout(function() { toast.remove(); }, 300);
            }, 2000);
        });

        // Reset to defaults
        $('#cfgBtnReset').on('click', function(e) {
            e.preventDefault();
            _config = JSON.parse(JSON.stringify(_defaults));
            GameConfig.save();
            GameConfig.populateUI();
            GameConfig.apply();
        });
    };

    // ─── Initialize ─────────────────────────────────────────
    GameConfig.init = function() {
        GameConfig.load();
        GameConfig.bindUI();
        GameConfig.populateUI();
    };

    // ─── Get available presets for external use ─────────────
    GameConfig.getColorPresets = function() { return COLOR_PRESETS; };
    GameConfig.getCurrentConfig = function() { return JSON.parse(JSON.stringify(_config)); };

})();
