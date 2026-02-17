// ═══════════════════════════════════════════════════════════════
// Hextris Multiplayer - Leaderboard Module
// ═══════════════════════════════════════════════════════════════

(function() {
    'use strict';

    window.Leaderboard = {};

    // ─── Local High Scores (offline fallback) ───────────────
    var _localScores = [];

    Leaderboard.init = function() {
        _loadLocal();
    };

    function _loadLocal() {
        try {
            var stored = localStorage.getItem('hextris_mp_leaderboard');
            if (stored) _localScores = JSON.parse(stored);
        } catch (e) {
            _localScores = [];
        }
    }

    function _saveLocal() {
        try {
            localStorage.setItem('hextris_mp_leaderboard', JSON.stringify(_localScores));
        } catch (e) {}
    }

    // ─── Submit Score ───────────────────────────────────────
    Leaderboard.submitScore = function(name, score, mode) {
        // Save locally
        _localScores.push({
            name: name,
            score: score,
            mode: mode || 'single',
            date: Date.now()
        });
        _localScores.sort(function(a, b) { return b.score - a.score; });
        _localScores = _localScores.slice(0, 50);
        _saveLocal();

        // Submit to server if connected
        if (typeof MP !== 'undefined' && MP.connected) {
            MP.getLeaderboard(null, 20);
        }
    };

    // ─── Get Local Scores ───────────────────────────────────
    Leaderboard.getLocalScores = function(mode, limit) {
        limit = limit || 20;
        var filtered = mode ? _localScores.filter(function(e) { return e.mode === mode; }) : _localScores;
        return filtered.slice(0, limit);
    };

    // ─── Format Date ────────────────────────────────────────
    Leaderboard.formatDate = function(timestamp) {
        var d = new Date(timestamp);
        var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
        return months[d.getMonth()] + ' ' + d.getDate() + ', ' + d.getFullYear();
    };

    // ─── Render Leaderboard to Element ──────────────────────
    Leaderboard.renderTo = function(elementId, entries) {
        var el = document.getElementById(elementId);
        if (!el) return;

        if (!entries || entries.length === 0) {
            el.innerHTML = '<div class="lb-empty">No scores recorded yet</div>';
            return;
        }

        var html = '<div class="lb-header-row">' +
            '<span class="lb-col-rank">RANK</span>' +
            '<span class="lb-col-name">PLAYER</span>' +
            '<span class="lb-col-score">SCORE</span>' +
            '<span class="lb-col-mode">MODE</span>' +
            '</div>';

        entries.forEach(function(entry, i) {
            var medal = '';
            var rowClass = 'lb-row';
            if (i === 0) { medal = '🥇'; rowClass += ' gold'; }
            else if (i === 1) { medal = '🥈'; rowClass += ' silver'; }
            else if (i === 2) { medal = '🥉'; rowClass += ' bronze'; }

            // Highlight current player
            if (typeof MP !== 'undefined' && entry.name === MP.playerName) {
                rowClass += ' highlight';
            }

            html += '<div class="' + rowClass + '">';
            html += '<span class="lb-col-rank">' + (medal || '#' + (i + 1)) + '</span>';
            html += '<span class="lb-col-name">' + _escapeHtml(entry.name) + '</span>';
            html += '<span class="lb-col-score">' + _formatNumber(entry.score) + '</span>';
            html += '<span class="lb-col-mode">' + _modeLabel(entry.mode) + '</span>';
            html += '</div>';
        });

        el.innerHTML = html;
    };

    function _formatNumber(num) {
        if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
        if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
        return String(num);
    }

    function _modeLabel(mode) {
        var labels = {
            'single': 'Solo',
            'battle': '⚔️ Battle',
            'survival': '🏆 Survival',
            'ai_battle': '🤖 vs AI'
        };
        return labels[mode] || mode || '-';
    }

    function _escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

})();
