// ═══════════════════════════════════════════════════════════════
// Hextris - Particle Effects System
// Beautiful particle explosions, trails, and confetti
// ═══════════════════════════════════════════════════════════════

(function () {
    'use strict';

    window.Particles = {};

    var _particles = [];
    var _confetti = [];
    var _screenShake = { x: 0, y: 0, intensity: 0 };
    var _comboGlow = { active: false, color: '#fff', alpha: 0 };

    // ─── Particle class ─────────────────────────────────────
    function Particle(x, y, color, opts) {
        opts = opts || {};
        this.x = x;
        this.y = y;
        this.color = color;
        this.size = opts.size || (2 + Math.random() * 4);
        var speed = opts.speed || (1.5 + Math.random() * 3);
        var angle = opts.angle !== undefined ? opts.angle : (Math.random() * Math.PI * 2);
        this.vx = Math.cos(angle) * speed;
        this.vy = Math.sin(angle) * speed;
        this.gravity = opts.gravity || 0.04;
        this.friction = opts.friction || 0.98;
        this.opacity = 1;
        this.decay = opts.decay || (0.015 + Math.random() * 0.02);
        this.rotation = Math.random() * 360;
        this.rotSpeed = (Math.random() - 0.5) * 8;
        this.shape = opts.shape || 'circle'; // 'circle', 'square', 'star', 'diamond'
    }

    Particle.prototype.update = function () {
        this.vx *= this.friction;
        this.vy *= this.friction;
        this.vy += this.gravity;
        this.x += this.vx;
        this.y += this.vy;
        this.opacity -= this.decay;
        this.rotation += this.rotSpeed;
        this.size *= 0.995;
        return this.opacity > 0 && this.size > 0.3;
    };

    Particle.prototype.draw = function (ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.opacity);
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * Math.PI / 180);
        ctx.fillStyle = this.color;

        switch (this.shape) {
            case 'square':
                ctx.fillRect(-this.size / 2, -this.size / 2, this.size, this.size);
                break;
            case 'diamond':
                ctx.beginPath();
                ctx.moveTo(0, -this.size);
                ctx.lineTo(this.size * 0.6, 0);
                ctx.lineTo(0, this.size);
                ctx.lineTo(-this.size * 0.6, 0);
                ctx.closePath();
                ctx.fill();
                break;
            case 'star':
                _drawStar(ctx, 0, 0, 5, this.size, this.size * 0.4);
                break;
            default: // circle
                ctx.beginPath();
                ctx.arc(0, 0, this.size, 0, Math.PI * 2);
                ctx.fill();
        }

        // Glow
        if (this.opacity > 0.5) {
            ctx.globalAlpha = (this.opacity - 0.5) * 0.3;
            ctx.beginPath();
            ctx.arc(0, 0, this.size * 2.5, 0, Math.PI * 2);
            ctx.fill();
        }

        ctx.restore();
    };

    // ─── Confetti piece ─────────────────────────────────────
    function Confetti(x, y, color) {
        this.x = x;
        this.y = y;
        this.color = color;
        this.width = 6 + Math.random() * 6;
        this.height = 3 + Math.random() * 3;
        this.vx = (Math.random() - 0.5) * 8;
        this.vy = -(3 + Math.random() * 6);
        this.gravity = 0.12 + Math.random() * 0.05;
        this.rotation = Math.random() * 360;
        this.rotSpeed = (Math.random() - 0.5) * 15;
        this.opacity = 1;
        this.waveAmplitude = 0.5 + Math.random() * 1.5;
        this.wavePhase = Math.random() * Math.PI * 2;
        this.t = 0;
    }

    Confetti.prototype.update = function () {
        this.t += 0.05;
        this.vy += this.gravity;
        this.vx += Math.sin(this.wavePhase + this.t) * this.waveAmplitude * 0.03;
        this.x += this.vx;
        this.y += this.vy;
        this.rotation += this.rotSpeed;
        if (this.y > (window.innerHeight || 800) + 50) return false;
        if (this.t > 5) this.opacity -= 0.02;
        return this.opacity > 0;
    };

    Confetti.prototype.draw = function (ctx) {
        ctx.save();
        ctx.globalAlpha = Math.max(0, this.opacity);
        ctx.translate(this.x, this.y);
        ctx.rotate(this.rotation * Math.PI / 180);
        ctx.fillStyle = this.color;
        ctx.fillRect(-this.width / 2, -this.height / 2, this.width, this.height);
        ctx.restore();
    };

    // ─── Helper: draw a star shape ──────────────────────────
    function _drawStar(ctx, cx, cy, spikes, outerR, innerR) {
        var rot = Math.PI / 2 * 3;
        var step = Math.PI / spikes;
        ctx.beginPath();
        ctx.moveTo(cx, cy - outerR);
        for (var i = 0; i < spikes; i++) {
            ctx.lineTo(cx + Math.cos(rot) * outerR, cy + Math.sin(rot) * outerR);
            rot += step;
            ctx.lineTo(cx + Math.cos(rot) * innerR, cy + Math.sin(rot) * innerR);
            rot += step;
        }
        ctx.lineTo(cx, cy - outerR);
        ctx.closePath();
        ctx.fill();
    }

    // ─── Public: Block clear explosion ──────────────────────
    Particles.blockExplosion = function (x, y, color, count) {
        count = count || 12;
        var shapes = ['circle', 'square', 'diamond'];
        for (var i = 0; i < count; i++) {
            var shape = shapes[Math.floor(Math.random() * shapes.length)];
            _particles.push(new Particle(x, y, color, {
                speed: 2 + Math.random() * 4,
                size: 2 + Math.random() * 5,
                decay: 0.012 + Math.random() * 0.015,
                shape: shape
            }));
        }
    };

    // ─── Public: Combo burst (bigger, more particles) ───────
    Particles.comboBurst = function (x, y, color, multiplier) {
        var count = Math.min(40, 10 + multiplier * 6);
        var tintedColor = _lighten(color, 0.3);
        for (var i = 0; i < count; i++) {
            var angle = (Math.PI * 2 / count) * i + (Math.random() - 0.5) * 0.5;
            _particles.push(new Particle(x, y, i % 2 === 0 ? color : tintedColor, {
                angle: angle,
                speed: 3 + multiplier * 0.8 + Math.random() * 2,
                size: 3 + Math.random() * 4,
                decay: 0.008 + Math.random() * 0.01,
                shape: 'star'
            }));
        }

        // Screen shake based on combo
        _screenShake.intensity = Math.min(12, 3 + multiplier * 2);

        // Combo glow
        _comboGlow.active = true;
        _comboGlow.color = color;
        _comboGlow.alpha = Math.min(0.35, 0.1 + multiplier * 0.05);
    };

    // ─── Public: Confetti rain (level completion) ───────────
    Particles.confetti = function (centerX, centerY, colors) {
        colors = colors || ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71', '#9b59b6', '#ff6b6b'];
        for (var i = 0; i < 80; i++) {
            var x = centerX + (Math.random() - 0.5) * 300;
            var y = centerY - Math.random() * 100;
            var color = colors[Math.floor(Math.random() * colors.length)];
            _confetti.push(new Confetti(x, y, color));
        }
    };

    // ─── Public: Life lost ring burst ───────────────────────
    Particles.lifeLostBurst = function (x, y) {
        for (var i = 0; i < 30; i++) {
            var angle = (Math.PI * 2 / 30) * i;
            _particles.push(new Particle(x, y, '#ef5350', {
                angle: angle,
                speed: 4 + Math.random() * 3,
                size: 3 + Math.random() * 3,
                decay: 0.015,
                gravity: 0,
                friction: 0.96,
                shape: 'diamond'
            }));
        }
        _screenShake.intensity = 8;
    };

    // ─── Public: Level win celebration ──────────────────────
    Particles.levelWin = function (x, y, colors) {
        // Golden star burst from center
        for (var i = 0; i < 50; i++) {
            _particles.push(new Particle(x, y, i % 3 === 0 ? '#f1c40f' : '#ffeaa7', {
                speed: 4 + Math.random() * 6,
                size: 3 + Math.random() * 5,
                decay: 0.008,
                gravity: 0.02,
                shape: 'star'
            }));
        }
        // Waves of confetti
        setTimeout(function () { Particles.confetti(x, y, colors); }, 200);
        setTimeout(function () { Particles.confetti(x, y, colors); }, 600);
    };

    // ─── Public: Get screen shake offset ────────────────────
    Particles.getShake = function () {
        if (_screenShake.intensity > 0.3) {
            _screenShake.x = (Math.random() - 0.5) * _screenShake.intensity;
            _screenShake.y = (Math.random() - 0.5) * _screenShake.intensity;
            _screenShake.intensity *= 0.88;
        } else {
            _screenShake.x = 0;
            _screenShake.y = 0;
            _screenShake.intensity = 0;
        }
        return _screenShake;
    };

    // ─── Public: Render all particles ───────────────────────
    Particles.render = function (ctx) {
        if (!ctx) return;

        // Draw combo glow
        if (_comboGlow.active && _comboGlow.alpha > 0.01) {
            var cx = trueCanvas.width / 2;
            var cy = trueCanvas.height / 2;
            var gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, trueCanvas.width * 0.4);
            gradient.addColorStop(0, _comboGlow.color);
            gradient.addColorStop(1, 'transparent');
            ctx.save();
            ctx.globalAlpha = _comboGlow.alpha;
            ctx.fillStyle = gradient;
            ctx.fillRect(0, 0, trueCanvas.width, trueCanvas.height);
            ctx.restore();
            _comboGlow.alpha *= 0.94;
            if (_comboGlow.alpha < 0.01) _comboGlow.active = false;
        }

        // Draw particles
        for (var i = _particles.length - 1; i >= 0; i--) {
            if (!_particles[i].update()) {
                _particles.splice(i, 1);
            } else {
                _particles[i].draw(ctx);
            }
        }

        // Draw confetti
        for (var j = _confetti.length - 1; j >= 0; j--) {
            if (!_confetti[j].update()) {
                _confetti.splice(j, 1);
            } else {
                _confetti[j].draw(ctx);
            }
        }
    };

    // ─── Public: Clear all ──────────────────────────────────
    Particles.clear = function () {
        _particles = [];
        _confetti = [];
        _screenShake = { x: 0, y: 0, intensity: 0 };
        _comboGlow = { active: false, color: '#fff', alpha: 0 };
    };

    // ─── Utility ────────────────────────────────────────────
    function _lighten(hex, amt) {
        hex = hex.replace('#', '');
        if (hex.length === 3) hex = hex[0] + hex[0] + hex[1] + hex[1] + hex[2] + hex[2];
        var r = Math.min(255, parseInt(hex.substr(0, 2), 16) + Math.round(255 * amt));
        var g = Math.min(255, parseInt(hex.substr(2, 2), 16) + Math.round(255 * amt));
        var b = Math.min(255, parseInt(hex.substr(4, 2), 16) + Math.round(255 * amt));
        return 'rgb(' + r + ',' + g + ',' + b + ')';
    }

})();
