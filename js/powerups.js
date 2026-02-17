// ═══════════════════════════════════════════════════════════════
// Hextris - Power-Up System (v2)
// Hammer, Freeze, Color Bomb, Shield, Slow Time
// 20-second cooldowns with visual countdown
// ═══════════════════════════════════════════════════════════════

(function() {
    'use strict';

    window.PowerUps = {};

    var _charges = {
        hammer:    1,
        freeze:    1,
        colorBomb: 1,
        shield:    0,
        slowTime:  0
    };

    var _cooldowns = {
        hammer: false, freeze: false, colorBomb: false,
        shield: false, slowTime: false
    };

    var _cooldownTimers = {};
    var _cooldownEnds = {};
    var COOLDOWN_DURATION = 20000; // 20 seconds

    var _freezeActive = false;
    var _freezeTimer = null;
    var _originalSpeeds = {};

    var _slowActive = false;
    var _slowTimer = null;
    var _slowOriginalSpeeds = {};

    var _shieldActive = false;

    var POWER_DEFS = {
        hammer:   { name: 'Hammer',    icon: '🔨', desc: 'Clear all blocks from one side', key: '1' },
        freeze:   { name: 'Freeze',    icon: '❄️', desc: 'Freeze all blocks for 5 seconds', key: '2' },
        colorBomb:{ name: 'Bomb',      icon: '💣', desc: 'Remove all blocks of one color', key: '3' },
        shield:   { name: 'Shield',    icon: '🛡️', desc: 'Block next overflow (saves a life)', key: '4' },
        slowTime: { name: 'Slow Time', icon: '⏳', desc: 'Slow blocks for 8 seconds', key: '5' }
    };

    PowerUps.getCharges = function(type) { return _charges[type] || 0; };

    PowerUps.use = function(type) {
        if (!POWER_DEFS[type]) return false;
        if (!_charges[type] || _charges[type] <= 0) {
            PowerUps.showToast('No ' + POWER_DEFS[type].name + ' charges! Buy in Shop 🪙');
            return false;
        }
        if (_cooldowns[type]) {
            var remaining = Math.ceil((_cooldownEnds[type] - Date.now()) / 1000);
            PowerUps.showToast(POWER_DEFS[type].name + ' on cooldown! ' + remaining + 's');
            return false;
        }
        if (typeof gameState === 'undefined' || gameState !== 1) return false;

        var success = false;
        switch (type) {
            case 'hammer':    success = PowerUps.activateHammer(); break;
            case 'freeze':    success = PowerUps.activateFreeze(); break;
            case 'colorBomb': success = PowerUps.activateColorBomb(); break;
            case 'shield':    success = PowerUps.activateShield(); break;
            case 'slowTime':  success = PowerUps.activateSlowTime(); break;
        }

        if (success) {
            _charges[type]--;
            _cooldowns[type] = true;
            _cooldownEnds[type] = Date.now() + COOLDOWN_DURATION;
            PowerUps.updateUI();
            PowerUps.startCooldownVisual(type);
        }
        return success;
    };

    PowerUps.startCooldownVisual = function(type) {
        var btn = document.getElementById('pu_' + type);
        if (!btn) return;
        btn.classList.add('on-cooldown');
        var cdEl = btn.querySelector('.pu-cd');
        if (!cdEl) {
            cdEl = document.createElement('span');
            cdEl.className = 'pu-cd';
            btn.appendChild(cdEl);
        }
        var updateCD = function() {
            var rem = Math.ceil((_cooldownEnds[type] - Date.now()) / 1000);
            if (rem <= 0) {
                _cooldowns[type] = false;
                btn.classList.remove('on-cooldown');
                if (cdEl) cdEl.textContent = '';
                clearInterval(_cooldownTimers[type]);
                PowerUps.updateUI();
                return;
            }
            cdEl.textContent = rem + 's';
        };
        updateCD();
        _cooldownTimers[type] = setInterval(updateCD, 500);
    };

    PowerUps.activateHammer = function() {
        if (!window.MainHex) return false;
        var maxBlocks = 0, targetSide = 0;
        for (var i = 0; i < MainHex.sides; i++) {
            var count = 0;
            for (var j = 0; j < MainHex.blocks[i].length; j++) {
                if (!MainHex.blocks[i][j].deleted) count++;
            }
            if (count > maxBlocks) { maxBlocks = count; targetSide = i; }
        }
        if (maxBlocks === 0) return false;
        var cleared = 0;
        for (var j = 0; j < MainHex.blocks[targetSide].length; j++) {
            if (!MainHex.blocks[targetSide][j].deleted) {
                MainHex.blocks[targetSide][j].deleted = 2;
                cleared++;
            }
        }
        score += cleared * 5;
        if (typeof GameModes !== 'undefined' && GameModes.getActiveMode()) {
            for (var c = 0; c < cleared; c++) GameModes.onBlockCleared();
        }
        PowerUps.showEffect('🔨 HAMMER!', '#e74c3c');
        MainHex.shakes.push({ lane: targetSide, magnitude: 12 * (window.devicePixelRatio || 1) * (settings.scale || 1) });
        return true;
    };

    PowerUps.activateFreeze = function() {
        if (_freezeActive) return false;
        _freezeActive = true;
        _originalSpeeds.speedModifier = settings.speedModifier;
        _originalSpeeds.rush = window.rush;
        settings.speedModifier = 0.01;
        window.rush = 0.05;
        if (window.blocks) {
            for (var i = 0; i < blocks.length; i++) {
                blocks[i]._frozenIter = blocks[i].iter;
                blocks[i].iter = 0.01;
            }
        }
        PowerUps.showEffect('❄️ FREEZE!', '#3498db');
        var overlay = document.getElementById('freezeOverlay');
        if (overlay) overlay.classList.add('active');
        _freezeTimer = setTimeout(function() {
            _freezeActive = false;
            settings.speedModifier = _originalSpeeds.speedModifier;
            window.rush = _originalSpeeds.rush;
            if (window.blocks) {
                for (var i = 0; i < blocks.length; i++) {
                    if (blocks[i]._frozenIter !== undefined) {
                        blocks[i].iter = blocks[i]._frozenIter;
                        delete blocks[i]._frozenIter;
                    }
                }
            }
            if (overlay) overlay.classList.remove('active');
        }, 5000);
        return true;
    };

    PowerUps.activateColorBomb = function() {
        if (!window.MainHex) return false;
        var colorCounts = {};
        for (var i = 0; i < MainHex.sides; i++) {
            for (var j = 0; j < MainHex.blocks[i].length; j++) {
                var b = MainHex.blocks[i][j];
                if (!b.deleted) colorCounts[b.color] = (colorCounts[b.color] || 0) + 1;
            }
        }
        var maxColor = null, maxCount = 0;
        for (var c in colorCounts) {
            if (colorCounts[c] > maxCount) { maxCount = colorCounts[c]; maxColor = c; }
        }
        if (!maxColor || maxCount === 0) return false;
        var cleared = 0;
        for (var i = 0; i < MainHex.sides; i++) {
            for (var j = 0; j < MainHex.blocks[i].length; j++) {
                if (MainHex.blocks[i][j].color === maxColor && !MainHex.blocks[i][j].deleted) {
                    MainHex.blocks[i][j].deleted = 2;
                    cleared++;
                }
            }
        }
        score += cleared * 8;
        if (typeof GameModes !== 'undefined' && GameModes.getActiveMode()) {
            for (var c2 = 0; c2 < cleared; c2++) GameModes.onBlockCleared();
        }
        PowerUps.showEffect('💣 COLOR BOMB!', maxColor);
        for (var i = 0; i < MainHex.sides; i++) {
            MainHex.shakes.push({ lane: i, magnitude: 6 * (window.devicePixelRatio || 1) * (settings.scale || 1) });
        }
        return true;
    };

    PowerUps.activateShield = function() {
        if (_shieldActive) { PowerUps.showToast('Shield already active!'); return false; }
        _shieldActive = true;
        PowerUps.showEffect('🛡️ SHIELD!', '#2ecc71');
        var indicator = document.getElementById('shieldIndicator');
        if (indicator) indicator.classList.add('active');
        return true;
    };

    PowerUps.tryShield = function() {
        if (_shieldActive) {
            _shieldActive = false;
            var indicator = document.getElementById('shieldIndicator');
            if (indicator) indicator.classList.remove('active');
            PowerUps.showEffect('🛡️ Shield Blocked!', '#2ecc71');
            PowerUps.showToast('Shield absorbed the overflow!');
            return true;
        }
        return false;
    };

    PowerUps.isShieldActive = function() { return _shieldActive; };

    PowerUps.activateSlowTime = function() {
        if (_slowActive) return false;
        _slowActive = true;
        _slowOriginalSpeeds.speedModifier = settings.speedModifier;
        _slowOriginalSpeeds.rush = window.rush;
        settings.speedModifier *= 0.4;
        window.rush *= 0.5;
        PowerUps.showEffect('⏳ SLOW TIME!', '#9b59b6');
        var overlay = document.getElementById('slowOverlay');
        if (overlay) overlay.classList.add('active');
        _slowTimer = setTimeout(function() {
            _slowActive = false;
            settings.speedModifier = _slowOriginalSpeeds.speedModifier;
            window.rush = _slowOriginalSpeeds.rush;
            if (overlay) overlay.classList.remove('active');
        }, 8000);
        return true;
    };

    PowerUps.addCharge = function(type) {
        if (_charges[type] !== undefined) {
            _charges[type]++;
            PowerUps.updateUI();
            PowerUps.showToast('+1 ' + POWER_DEFS[type].name + '! (' + _charges[type] + ')');
            var btn = document.getElementById('pu_' + type);
            if (btn) {
                btn.classList.add('pu-earned');
                setTimeout(function() { btn.classList.remove('pu-earned'); }, 1200);
            }
        }
    };

    PowerUps.rewardRandom = function() {
        var types = ['hammer', 'freeze', 'colorBomb', 'shield', 'slowTime'];
        var pick = types[Math.floor(Math.random() * types.length)];
        PowerUps.addCharge(pick);
    };

    var _lastMilestone = 0;
    PowerUps.checkScoreMilestone = function(currentScore) {
        var milestone = Math.floor(currentScore / 500);
        if (milestone > _lastMilestone) {
            _lastMilestone = milestone;
            PowerUps.rewardRandom();
        }
    };

    PowerUps.resetMilestones = function() { _lastMilestone = 0; };

    PowerUps.updateUI = function() {
        for (var type in POWER_DEFS) {
            var btn = document.getElementById('pu_' + type);
            if (btn) {
                var badge = btn.querySelector('.pu-count');
                if (badge) badge.textContent = _charges[type] || 0;
                if (_charges[type] <= 0 && !_cooldowns[type]) {
                    btn.classList.add('empty');
                } else {
                    btn.classList.remove('empty');
                }
            }
        }
    };

    PowerUps.showEffect = function(text, color) {
        var el = document.getElementById('powerUpEffect');
        if (!el) return;
        el.textContent = text;
        el.style.color = color;
        el.classList.remove('show');
        void el.offsetWidth;
        el.classList.add('show');
        setTimeout(function() { el.classList.remove('show'); }, 1500);
    };

    PowerUps.showToast = function(msg) {
        var toast = document.createElement('div');
        toast.className = 'mp-toast';
        toast.textContent = msg;
        document.body.appendChild(toast);
        setTimeout(function() { toast.style.opacity = '1'; }, 10);
        setTimeout(function() {
            toast.style.opacity = '0';
            setTimeout(function() { toast.remove(); }, 300);
        }, 2000);
    };

    PowerUps.reset = function() {
        _charges.hammer = 1;
        _charges.freeze = 1;
        _charges.colorBomb = 1;
        if (!_charges.shield) _charges.shield = 0;
        if (!_charges.slowTime) _charges.slowTime = 0;

        for (var type in _cooldowns) {
            _cooldowns[type] = false;
            if (_cooldownTimers[type]) clearInterval(_cooldownTimers[type]);
            var btn = document.getElementById('pu_' + type);
            if (btn) {
                btn.classList.remove('on-cooldown');
                var cdEl = btn.querySelector('.pu-cd');
                if (cdEl) cdEl.textContent = '';
            }
        }

        if (_freezeActive) {
            _freezeActive = false; clearTimeout(_freezeTimer);
            settings.speedModifier = _originalSpeeds.speedModifier || settings.speedModifier;
            window.rush = _originalSpeeds.rush || 1;
            var fOverlay = document.getElementById('freezeOverlay');
            if (fOverlay) fOverlay.classList.remove('active');
        }
        if (_slowActive) {
            _slowActive = false; clearTimeout(_slowTimer);
            settings.speedModifier = _slowOriginalSpeeds.speedModifier || settings.speedModifier;
            window.rush = _slowOriginalSpeeds.rush || 1;
            var sOverlay = document.getElementById('slowOverlay');
            if (sOverlay) sOverlay.classList.remove('active');
        }
        _shieldActive = false;
        var shieldInd = document.getElementById('shieldIndicator');
        if (shieldInd) shieldInd.classList.remove('active');
        PowerUps.updateUI();
    };

    PowerUps.isFrozen = function() { return _freezeActive; };

    PowerUps.init = function() {
        document.addEventListener('click', function(e) {
            var btn = e.target.closest('.pu-btn');
            if (btn) {
                var type = btn.dataset.power;
                if (type) PowerUps.use(type);
            }
        });
        document.addEventListener('keydown', function(e) {
            if (typeof gameState !== 'undefined' && gameState !== 1) return;
            if (e.key === '1') PowerUps.use('hammer');
            else if (e.key === '2') PowerUps.use('freeze');
            else if (e.key === '3') PowerUps.use('colorBomb');
            else if (e.key === '4') PowerUps.use('shield');
            else if (e.key === '5') PowerUps.use('slowTime');
        });
        PowerUps.updateUI();
    };

    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', PowerUps.init);
    } else {
        PowerUps.init();
    }

})();
