// ═══════════════════════════════════════════════════════════════
// Hextris - Achievements & Statistics System
// Track player stats & unlock achievement badges
// ═══════════════════════════════════════════════════════════════

(function () {
    'use strict';

    window.GameStats = {};

    var STATS_KEY = 'hextris_stats';
    var ACHIEVE_KEY = 'hextris_achievements';

    // ─── Default stats ──────────────────────────────────────
    var _defaultStats = {
        totalGames: 0,
        totalScore: 0,
        highScore: 0,
        totalBlocksCleared: 0,
        totalCombos: 0,
        bestCombo: 0,
        totalTimePlayed: 0,    // seconds
        levelsCompleted: 0,
        totalStarsEarned: 0,
        gamesWon: 0            // level completions
    };

    var _stats = {};

    // ─── Achievement definitions ────────────────────────────
    var ACHIEVEMENTS = [
        { id: 'first_game',     name: 'Baby Steps',       icon: '👶', desc: 'Play your first game',                      check: function (s) { return s.totalGames >= 1; } },
        { id: 'score_500',      name: 'Getting Started',  icon: '🎯', desc: 'Score 500 points in a single game',         check: function (s) { return s.highScore >= 500; } },
        { id: 'score_1000',     name: 'On Fire',          icon: '🔥', desc: 'Score 1,000 points in a single game',       check: function (s) { return s.highScore >= 1000; } },
        { id: 'score_5000',     name: 'Hex Master',       icon: '⭐', desc: 'Score 5,000 points in a single game',       check: function (s) { return s.highScore >= 5000; } },
        { id: 'score_10000',    name: 'Legend',            icon: '👑', desc: 'Score 10,000 points in a single game',      check: function (s) { return s.highScore >= 10000; } },
        { id: 'combo_3',        name: 'Combo Starter',     icon: '💫', desc: 'Get a 3x combo streak',                    check: function (s) { return s.bestCombo >= 3; } },
        { id: 'combo_5',        name: 'Combo King',        icon: '🌟', desc: 'Get a 5x combo streak',                    check: function (s) { return s.bestCombo >= 5; } },
        { id: 'combo_10',       name: 'Unstoppable',       icon: '💥', desc: 'Get a 10x combo streak',                   check: function (s) { return s.bestCombo >= 10; } },
        { id: 'blocks_100',     name: 'Block Buster',      icon: '🧱', desc: 'Clear 100 total blocks',                   check: function (s) { return s.totalBlocksCleared >= 100; } },
        { id: 'blocks_1000',    name: 'Demolition Expert', icon: '💣', desc: 'Clear 1,000 total blocks',                 check: function (s) { return s.totalBlocksCleared >= 1000; } },
        { id: 'blocks_10000',   name: 'Block Annihilator', icon: '☢️', desc: 'Clear 10,000 total blocks',                check: function (s) { return s.totalBlocksCleared >= 10000; } },
        { id: 'games_10',       name: 'Dedicated',         icon: '🎮', desc: 'Play 10 games',                            check: function (s) { return s.totalGames >= 10; } },
        { id: 'games_50',       name: 'Addicted',          icon: '🕹️', desc: 'Play 50 games',                            check: function (s) { return s.totalGames >= 50; } },
        { id: 'games_100',      name: 'No Life',           icon: '🏆', desc: 'Play 100 games',                           check: function (s) { return s.totalGames >= 100; } },
        { id: 'level_5',        name: 'Campaigner',        icon: '🗺️', desc: 'Complete 5 campaign levels',               check: function (s) { return s.levelsCompleted >= 5; } },
        { id: 'level_10',       name: 'Veteran',           icon: '🎖️', desc: 'Complete 10 campaign levels',              check: function (s) { return s.levelsCompleted >= 10; } },
        { id: 'level_20',       name: 'Supreme Victor',    icon: '🏅', desc: 'Complete all 20 campaign levels',           check: function (s) { return s.levelsCompleted >= 20; } },
        { id: 'time_60',        name: 'Minute Man',        icon: '⏱️', desc: 'Play for 60 minutes total',                check: function (s) { return s.totalTimePlayed >= 3600; } },
        { id: 'time_300',       name: 'Time Lord',         icon: '⏰', desc: 'Play for 5 hours total',                   check: function (s) { return s.totalTimePlayed >= 18000; } },
        { id: 'score_total_50k', name: 'Point Hoarder',    icon: '💰', desc: 'Accumulate 50,000 total points',           check: function (s) { return s.totalScore >= 50000; } }
    ];

    var _unlocked = {};

    // ─── Load / Save ────────────────────────────────────────
    function loadStats() {
        try {
            var saved = localStorage.getItem(STATS_KEY);
            if (saved) _stats = JSON.parse(saved);
        } catch (e) {}
        for (var key in _defaultStats) {
            if (_stats[key] === undefined) _stats[key] = _defaultStats[key];
        }
    }

    function saveStats() {
        try { localStorage.setItem(STATS_KEY, JSON.stringify(_stats)); } catch (e) {}
    }

    function loadAchievements() {
        try {
            var saved = localStorage.getItem(ACHIEVE_KEY);
            if (saved) _unlocked = JSON.parse(saved);
        } catch (e) {}
    }

    function saveAchievements() {
        try { localStorage.setItem(ACHIEVE_KEY, JSON.stringify(_unlocked)); } catch (e) {}
    }

    // ─── Init ───────────────────────────────────────────────
    GameStats.init = function () {
        loadStats();
        loadAchievements();
    };

    // ─── Game session tracking ──────────────────────────────
    var _sessionStart = 0;

    GameStats.onGameStart = function () {
        _sessionStart = Date.now();
    };

    GameStats.onGameEnd = function (finalScore) {
        _stats.totalGames++;
        _stats.totalScore += finalScore;
        if (finalScore > _stats.highScore) _stats.highScore = finalScore;
        if (_sessionStart > 0) {
            _stats.totalTimePlayed += Math.floor((Date.now() - _sessionStart) / 1000);
        }
        _sessionStart = 0;
        saveStats();
        GameStats.checkAchievements();
    };

    GameStats.onBlocksCleared = function (count) {
        _stats.totalBlocksCleared += count;
        saveStats();
    };

    GameStats.onCombo = function (multiplier) {
        _stats.totalCombos++;
        if (multiplier > _stats.bestCombo) _stats.bestCombo = multiplier;
        saveStats();
    };

    GameStats.onLevelComplete = function () {
        _stats.levelsCompleted++;
        _stats.gamesWon++;
        saveStats();
        GameStats.checkAchievements();
    };

    // ─── Check achievements ─────────────────────────────────
    GameStats.checkAchievements = function () {
        var newlyUnlocked = [];
        for (var i = 0; i < ACHIEVEMENTS.length; i++) {
            var a = ACHIEVEMENTS[i];
            if (!_unlocked[a.id] && a.check(_stats)) {
                _unlocked[a.id] = { time: Date.now() };
                newlyUnlocked.push(a);
            }
        }
        if (newlyUnlocked.length > 0) {
            saveAchievements();
            // Show toast for each new achievement
            newlyUnlocked.forEach(function (a, idx) {
                setTimeout(function () {
                    GameStats.showAchievementToast(a);
                }, idx * 1200);
            });
        }
    };

    // ─── Show achievement toast ─────────────────────────────
    GameStats.showAchievementToast = function (achievement) {
        var toast = document.createElement('div');
        toast.className = 'achievement-toast';
        toast.innerHTML =
            '<div class="ach-toast-icon">' + achievement.icon + '</div>' +
            '<div class="ach-toast-info">' +
                '<div class="ach-toast-title">🏆 Achievement Unlocked!</div>' +
                '<div class="ach-toast-name">' + achievement.name + '</div>' +
                '<div class="ach-toast-desc">' + achievement.desc + '</div>' +
            '</div>';

        document.body.appendChild(toast);

        // Animate in
        setTimeout(function () { toast.classList.add('show'); }, 50);

        // Animate out
        setTimeout(function () {
            toast.classList.remove('show');
            setTimeout(function () { toast.remove(); }, 500);
        }, 3500);
    };

    // ─── Build stats dashboard ──────────────────────────────
    GameStats.buildStatsUI = function () {
        var container = document.getElementById('statsContent');
        if (!container) return;

        // Stats section
        var timeStr = _formatTime(_stats.totalTimePlayed);
        var statsHtml =
            '<div class="stats-grid">' +
                _statCard('🎮', 'Games Played', _stats.totalGames) +
                _statCard('🏆', 'High Score', _stats.highScore.toLocaleString()) +
                _statCard('📊', 'Total Score', _stats.totalScore.toLocaleString()) +
                _statCard('🧱', 'Blocks Cleared', _stats.totalBlocksCleared.toLocaleString()) +
                _statCard('💥', 'Best Combo', _stats.bestCombo + 'x') +
                _statCard('⭐', 'Levels Cleared', _stats.levelsCompleted) +
                _statCard('⏱️', 'Time Played', timeStr) +
                _statCard('🔥', 'Total Combos', _stats.totalCombos) +
            '</div>';

        // Achievements section
        var achHtml = '<div class="ach-section-title">🏅 ACHIEVEMENTS (' + _countUnlocked() + '/' + ACHIEVEMENTS.length + ')</div>';
        achHtml += '<div class="ach-grid">';
        for (var i = 0; i < ACHIEVEMENTS.length; i++) {
            var a = ACHIEVEMENTS[i];
            var unlocked = !!_unlocked[a.id];
            achHtml += '<div class="ach-card ' + (unlocked ? 'unlocked' : 'locked') + '">' +
                '<div class="ach-icon">' + (unlocked ? a.icon : '🔒') + '</div>' +
                '<div class="ach-name">' + a.name + '</div>' +
                '<div class="ach-desc">' + a.desc + '</div>' +
            '</div>';
        }
        achHtml += '</div>';

        container.innerHTML = statsHtml + achHtml;
    };

    // ─── Get stats for display ──────────────────────────────
    GameStats.getStats = function () { return JSON.parse(JSON.stringify(_stats)); };
    GameStats.getUnlockedCount = function () { return _countUnlocked(); };
    GameStats.getTotalAchievements = function () { return ACHIEVEMENTS.length; };

    // ─── Reset ──────────────────────────────────────────────
    GameStats.resetAll = function () {
        _stats = JSON.parse(JSON.stringify(_defaultStats));
        _unlocked = {};
        saveStats();
        saveAchievements();
    };

    // ─── Helpers ────────────────────────────────────────────
    function _statCard(icon, label, value) {
        return '<div class="stat-card">' +
            '<div class="stat-icon">' + icon + '</div>' +
            '<div class="stat-value">' + value + '</div>' +
            '<div class="stat-label">' + label + '</div>' +
        '</div>';
    }

    function _formatTime(seconds) {
        var h = Math.floor(seconds / 3600);
        var m = Math.floor((seconds % 3600) / 60);
        if (h > 0) return h + 'h ' + m + 'm';
        return m + 'm';
    }

    function _countUnlocked() {
        var c = 0;
        for (var k in _unlocked) c++;
        return c;
    }

    // ─── Auto-init ──────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', function () { GameStats.init(); });
    } else {
        GameStats.init();
    }

})();
