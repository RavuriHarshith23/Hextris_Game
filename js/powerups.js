// ═══════════════════════════════════════════════════════════════
// Hextris - Power-Up System
// Hammer, Freeze, Color Bomb abilities
// ═══════════════════════════════════════════════════════════════

(function() {
    'use strict';

    window.PowerUps = {};

    // Power-up inventory
    var _charges = {
        hammer:    1,   // Start with 1 of each
        freeze:    1,
        colorBomb: 1
    };

    var _cooldowns = {
        hammer:    false,
        freeze:    false,
        colorBomb: false
    };

    var _freezeActive = false;
    var _freezeTimer = null;
    var _originalSpeeds = {};

    // ─── Power-up definitions ───────────────────────────────
    var POWER_DEFS = {
        hammer: {
            name: 'Hammer',
            icon: '🔨',
            desc: 'Clear all blocks from one side',
            cooldown: 2000
        },
        freeze: {
            name: 'Freeze',
            icon: '❄️',
            desc: 'Freeze all blocks for 5 seconds',
            cooldown: 3000
        },
        colorBomb: {
            name: 'Color Bomb',
            icon: '💣',
            desc: 'Remove all blocks of one color',
            cooldown: 2500
        }
    };

    // ─── Use a power-up ─────────────────────────────────────
    PowerUps.use = function(type) {
        if (!_charges[type] || _charges[type] <= 0) {
            PowerUps.showToast('No ' + POWER_DEFS[type].name + ' charges left!');
            return false;
        }
        if (_cooldowns[type]) {
            PowerUps.showToast(POWER_DEFS[type].name + ' is on cooldown!');
            return false;
        }
        if (typeof gameState === 'undefined' || gameState !== 1) return false;

        var success = false;
        switch (type) {
            case 'hammer':
                success = PowerUps.activateHammer();
                break;
            case 'freeze':
                success = PowerUps.activateFreeze();
                break;
            case 'colorBomb':
                success = PowerUps.activateColorBomb();
                break;
        }

        if (success) {
            _charges[type]--;
            _cooldowns[type] = true;
            PowerUps.updateUI();

            // Cooldown
            var btn = document.getElementById('pu_' + type);
            if (btn) btn.classList.add('on-cooldown');

            setTimeout(function() {
                _cooldowns[type] = false;
                if (btn) btn.classList.remove('on-cooldown');
            }, POWER_DEFS[type].cooldown);
        }

        return success;
    };

    // ─── Hammer: Clear all blocks from the side with the most blocks ─
    PowerUps.activateHammer = function() {
        if (!window.MainHex) return false;

        // Find the side with the most blocks
        var maxBlocks = 0;
        var targetSide = 0;
        for (var i = 0; i < MainHex.sides; i++) {
            var count = 0;
            for (var j = 0; j < MainHex.blocks[i].length; j++) {
                if (!MainHex.blocks[i][j].deleted) count++;
            }
            if (count > maxBlocks) {
                maxBlocks = count;
                targetSide = i;
            }
        }

        if (maxBlocks === 0) return false;

        // Score bonus for cleared blocks
        var cleared = 0;
        for (var j = 0; j < MainHex.blocks[targetSide].length; j++) {
            if (!MainHex.blocks[targetSide][j].deleted) {
                MainHex.blocks[targetSide][j].deleted = 2;
                cleared++;
            }
        }

        score += cleared * 5;

        // Visual effect — flash the side
        PowerUps.showEffect('🔨 HAMMER!', '#e74c3c');

        // Shake effect
        MainHex.shakes.push({
            lane: targetSide,
            magnitude: 12 * (window.devicePixelRatio || 1) * (settings.scale || 1)
        });

        return true;
    };

    // ─── Freeze: Stop all blocks for 5 seconds ─────────────
    PowerUps.activateFreeze = function() {
        if (_freezeActive) return false;
        _freezeActive = true;

        // Save original speed and set to near-zero
        _originalSpeeds.speedModifier = settings.speedModifier;
        _originalSpeeds.rush = window.rush;
        settings.speedModifier = 0.01;
        window.rush = 0.05;

        // Also freeze falling blocks
        if (window.blocks) {
            for (var i = 0; i < blocks.length; i++) {
                blocks[i]._frozenIter = blocks[i].iter;
                blocks[i].iter = 0.01;
            }
        }

        PowerUps.showEffect('❄️ FREEZE!', '#3498db');

        // Add visual frost tint
        var overlay = document.getElementById('freezeOverlay');
        if (overlay) overlay.classList.add('active');

        // Unfreeze after 5 seconds
        _freezeTimer = setTimeout(function() {
            _freezeActive = false;
            settings.speedModifier = _originalSpeeds.speedModifier;
            window.rush = _originalSpeeds.rush;

            // Restore block speeds
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

    // ─── Color Bomb: Remove all blocks of the most common color ─
    PowerUps.activateColorBomb = function() {
        if (!window.MainHex) return false;

        // Count blocks per color
        var colorCounts = {};
        for (var i = 0; i < MainHex.sides; i++) {
            for (var j = 0; j < MainHex.blocks[i].length; j++) {
                var b = MainHex.blocks[i][j];
                if (!b.deleted) {
                    colorCounts[b.color] = (colorCounts[b.color] || 0) + 1;
                }
            }
        }

        // Find the most common color
        var maxColor = null;
        var maxCount = 0;
        for (var c in colorCounts) {
            if (colorCounts[c] > maxCount) {
                maxCount = colorCounts[c];
                maxColor = c;
            }
        }

        if (!maxColor || maxCount === 0) return false;

        // Delete all blocks of that color
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

        PowerUps.showEffect('💣 COLOR BOMB!', maxColor);

        // Shake everything
        for (var i = 0; i < MainHex.sides; i++) {
            MainHex.shakes.push({
                lane: i,
                magnitude: 6 * (window.devicePixelRatio || 1) * (settings.scale || 1)
            });
        }

        return true;
    };

    // ─── Add charges ────────────────────────────────────────
    PowerUps.addCharge = function(type) {
        if (_charges[type] !== undefined) {
            _charges[type]++;
            PowerUps.updateUI();
            PowerUps.showToast('+1 ' + POWER_DEFS[type].name + '! (' + _charges[type] + ')');

            // Animate the button glow
            var btn = document.getElementById('pu_' + type);
            if (btn) {
                btn.classList.add('pu-earned');
                setTimeout(function() { btn.classList.remove('pu-earned'); }, 1200);
            }
        }
    };

    // ─── Reward a random power-up ───────────────────────────
    PowerUps.rewardRandom = function() {
        var types = ['hammer', 'freeze', 'colorBomb'];
        var pick = types[Math.floor(Math.random() * types.length)];
        PowerUps.addCharge(pick);
    };

    // ─── Score milestone rewards ────────────────────────────
    var _lastMilestone = 0;
    PowerUps.checkScoreMilestone = function(currentScore) {
        // Every 500 points, earn a random powerup
        var milestone = Math.floor(currentScore / 500);
        if (milestone > _lastMilestone) {
            _lastMilestone = milestone;
            PowerUps.rewardRandom();
        }
    };

    PowerUps.resetMilestones = function() {
        _lastMilestone = 0;
    };

    // ─── UI ─────────────────────────────────────────────────
    PowerUps.updateUI = function() {
        for (var type in POWER_DEFS) {
            var btn = document.getElementById('pu_' + type);
            if (btn) {
                var badge = btn.querySelector('.pu-count');
                if (badge) badge.textContent = _charges[type] || 0;

                if (_charges[type] <= 0) {
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

    // ─── Reset ──────────────────────────────────────────────
    PowerUps.reset = function() {
        _charges.hammer = 1;
        _charges.freeze = 1;
        _charges.colorBomb = 1;
        _cooldowns.hammer = false;
        _cooldowns.freeze = false;
        _cooldowns.colorBomb = false;

        if (_freezeActive) {
            _freezeActive = false;
            clearTimeout(_freezeTimer);
            settings.speedModifier = _originalSpeeds.speedModifier || settings.speedModifier;
            window.rush = _originalSpeeds.rush || 1;
            var overlay = document.getElementById('freezeOverlay');
            if (overlay) overlay.classList.remove('active');
        }

        PowerUps.updateUI();
    };

    // ─── Is Frozen? ─────────────────────────────────────────
    PowerUps.isFrozen = function() { return _freezeActive; };

    // ─── Bind buttons ───────────────────────────────────────
    PowerUps.init = function() {
        document.addEventListener('click', function(e) {
            var btn = e.target.closest('.pu-btn');
            if (btn) {
                var type = btn.dataset.power;
                if (type) PowerUps.use(type);
            }
        });

        // Keyboard shortcuts: 1, 2, 3
        document.addEventListener('keydown', function(e) {
            if (typeof gameState !== 'undefined' && gameState !== 1) return;
            if (e.key === '1') PowerUps.use('hammer');
            else if (e.key === '2') PowerUps.use('freeze');
            else if (e.key === '3') PowerUps.use('colorBomb');
        });

        PowerUps.updateUI();
    };

    // Auto-init when DOM ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', PowerUps.init);
    } else {
        PowerUps.init();
    }

})();
