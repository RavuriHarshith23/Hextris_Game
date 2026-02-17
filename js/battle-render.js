// ═══════════════════════════════════════════════════════════════
// Hextris Multiplayer - Battle Renderer (Opponent Mini-Board)
// ═══════════════════════════════════════════════════════════════

(function() {
    'use strict';

    window.BattleRender = {};

    var _oppCanvas = null;
    var _oppCtx = null;
    var _opponents = {};    // playerId -> latest state
    var _animFrame = null;
    var _miniScale = 0.4;   // Scale factor for opponent board

    // Block colors
    var _colors = {
        '#e74c3c': '#e74c3c',
        '#f1c40f': '#f1c40f',
        '#3498db': '#3498db',
        '#2ecc71': '#2ecc71',
        '#95a5a6': '#95a5a6'    // Penalty block color
    };

    // ─── Init ───────────────────────────────────────────────
    BattleRender.init = function() {
        _oppCanvas = document.getElementById('opponentCanvas');
        if (!_oppCanvas) return;
        _oppCtx = _oppCanvas.getContext('2d');
        BattleRender.resize();
        window.addEventListener('resize', BattleRender.resize);
    };

    BattleRender.resize = function() {
        if (!_oppCanvas) return;
        var panel = document.getElementById('opponentPanel');
        if (!panel) return;

        var w = panel.clientWidth - 20;
        var h = Math.min(w, 280);
        _oppCanvas.width = w * (window.devicePixelRatio || 1);
        _oppCanvas.height = h * (window.devicePixelRatio || 1);
        _oppCanvas.style.width = w + 'px';
        _oppCanvas.style.height = h + 'px';
        _oppCtx.scale(window.devicePixelRatio || 1, window.devicePixelRatio || 1);

        _miniScale = Math.min(w, h) / 450;
    };

    // ─── Update Opponent State ──────────────────────────────
    BattleRender.updateOpponent = function(playerId, data) {
        _opponents[playerId] = {
            name: data.name,
            score: data.score,
            lives: data.lives,
            blocks: data.blocks,    // Array of 6 arrays of block objects
            hexRotation: data.hexRotation || 0,
            alive: data.gameState !== 2,
            lastUpdate: Date.now()
        };
    };

    // ─── Start/Stop Rendering ───────────────────────────────
    BattleRender.start = function() {
        if (_animFrame) return;
        BattleRender.init();
        _renderLoop();
    };

    BattleRender.stop = function() {
        if (_animFrame) {
            cancelAnimationFrame(_animFrame);
            _animFrame = null;
        }
    };

    function _renderLoop() {
        _animFrame = requestAnimationFrame(_renderLoop);
        BattleRender.render();
    }

    // ─── Main Render ────────────────────────────────────────
    BattleRender.render = function() {
        if (!_oppCtx || !_oppCanvas) return;

        var w = _oppCanvas.width / (window.devicePixelRatio || 1);
        var h = _oppCanvas.height / (window.devicePixelRatio || 1);

        _oppCtx.clearRect(0, 0, w, h);

        // Background
        _oppCtx.fillStyle = 'rgba(20, 20, 40, 0.6)';
        _oppCtx.fillRect(0, 0, w, h);

        var keys = Object.keys(_opponents);
        if (keys.length === 0) {
            // No opponent connected yet
            _oppCtx.fillStyle = 'rgba(255, 255, 255, 0.3)';
            _oppCtx.font = (14 * _miniScale / 0.4) + 'px Exo';
            _oppCtx.textAlign = 'center';
            _oppCtx.fillText('Waiting for opponent...', w / 2, h / 2);
            return;
        }

        // Render first opponent (1v1)
        var opp = _opponents[keys[0]];
        if (!opp) return;

        var cx = w / 2;
        var cy = h / 2;

        _oppCtx.save();
        _oppCtx.translate(cx, cy);

        // Draw outer hexagon (grey border)
        var hexWidth = 65 * _miniScale;
        var blockHeight = 15 * _miniScale;
        var rows = 8;
        var outerRadius = (rows * blockHeight) * (2 / Math.sqrt(3)) + hexWidth;

        _drawHexagon(0, 0, outerRadius, '#2d2d4a', 0);

        // Draw blocks
        if (opp.blocks && opp.blocks.length > 0) {
            var sides = opp.blocks.length;
            for (var i = 0; i < sides; i++) {
                var sideBlocks = opp.blocks[i];
                if (!sideBlocks) continue;
                for (var j = 0; j < sideBlocks.length; j++) {
                    var block = sideBlocks[j];
                    _drawMiniBlock(i, j, sides, hexWidth, blockHeight, block.color, opp.hexRotation);
                }
            }
        }

        // Draw center hexagon
        _drawHexagon(0, 0, hexWidth, 'rgb(30, 30, 55)', 2);

        // Score in center
        _oppCtx.fillStyle = 'rgba(255, 255, 255, 0.9)';
        _oppCtx.font = 'bold ' + (16 * _miniScale / 0.4) + 'px Exo';
        _oppCtx.textAlign = 'center';
        _oppCtx.textBaseline = 'middle';
        _oppCtx.fillText(opp.score || 0, 0, 0);

        // Eliminated overlay
        if (!opp.alive) {
            _oppCtx.fillStyle = 'rgba(231, 76, 60, 0.5)';
            _drawHexagon(0, 0, outerRadius, 'rgba(231, 76, 60, 0.5)', 0);
            _oppCtx.fillStyle = '#fff';
            _oppCtx.font = 'bold ' + (20 * _miniScale / 0.4) + 'px Exo';
            _oppCtx.fillText('ELIMINATED', 0, 0);
        }

        _oppCtx.restore();
    };

    // ─── Draw Mini Block ────────────────────────────────────
    function _drawMiniBlock(side, index, totalSides, hexWidth, blockHeight, color, rotation) {
        var angle = (Math.PI * 2 / totalSides) * side + (rotation || 0);
        var dist = hexWidth + (index * blockHeight) + blockHeight / 2;

        var x1Angle = angle - Math.PI / totalSides;
        var x2Angle = angle + Math.PI / totalSides;

        var innerDist = hexWidth + index * blockHeight;
        var outerDist = innerDist + blockHeight;

        var points = [
            { x: Math.cos(x1Angle) * innerDist, y: Math.sin(x1Angle) * innerDist },
            { x: Math.cos(x2Angle) * innerDist, y: Math.sin(x2Angle) * innerDist },
            { x: Math.cos(x2Angle) * outerDist, y: Math.sin(x2Angle) * outerDist },
            { x: Math.cos(x1Angle) * outerDist, y: Math.sin(x1Angle) * outerDist }
        ];

        _oppCtx.fillStyle = color || '#e74c3c';
        _oppCtx.globalAlpha = 0.85;
        _oppCtx.beginPath();
        _oppCtx.moveTo(points[0].x, points[0].y);
        for (var i = 1; i < points.length; i++) {
            _oppCtx.lineTo(points[i].x, points[i].y);
        }
        _oppCtx.closePath();
        _oppCtx.fill();

        // Block border
        _oppCtx.strokeStyle = 'rgba(0, 0, 0, 0.2)';
        _oppCtx.lineWidth = 1;
        _oppCtx.stroke();

        _oppCtx.globalAlpha = 1;
    }

    // ─── Draw Hexagon ───────────────────────────────────────
    function _drawHexagon(x, y, radius, fillColor, lineWidth) {
        _oppCtx.fillStyle = fillColor;
        _oppCtx.beginPath();

        for (var i = 0; i < 6; i++) {
            var angle = (Math.PI / 3) * i - Math.PI / 6;
            var px = x + radius * Math.cos(angle);
            var py = y + radius * Math.sin(angle);
            if (i === 0) _oppCtx.moveTo(px, py);
            else _oppCtx.lineTo(px, py);
        }

        _oppCtx.closePath();
        _oppCtx.fill();

        if (lineWidth) {
            _oppCtx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
            _oppCtx.lineWidth = lineWidth;
            _oppCtx.stroke();
        }
    }

    // ─── Clear ──────────────────────────────────────────────
    BattleRender.clear = function() {
        _opponents = {};
        if (_oppCtx && _oppCanvas) {
            var w = _oppCanvas.width / (window.devicePixelRatio || 1);
            var h = _oppCanvas.height / (window.devicePixelRatio || 1);
            _oppCtx.clearRect(0, 0, w, h);
        }
    };

})();
