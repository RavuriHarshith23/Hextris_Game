// ═══════════════════════════════════════════════════════════════
// Hextris Multiplayer - AI Opponent
// ═══════════════════════════════════════════════════════════════

(function() {
    'use strict';

    window.AIOpponent = {};

    var _aiState = {
        running: false,
        difficulty: 'medium',  // easy | medium | hard
        score: 0,
        lives: 3,
        blocks: [[], [], [], [], [], []],
        hexRotation: 0,
        alive: true,
        tickInterval: null,
        decisionInterval: null,
        blockSpawnInterval: null,
        ct: 0
    };

    var _difficulties = {
        easy: {
            reactionTime: 2000,     // ms between decisions
            accuracy: 0.5,          // chance of making optimal move
            blockSpawnRate: 3000,   // ms between spawns
            clearChance: 0.3,       // chance blocks get cleared naturally
            maxStackHeight: 5,
            scoreMultiplier: 0.5
        },
        medium: {
            reactionTime: 1200,
            accuracy: 0.7,
            blockSpawnRate: 2000,
            clearChance: 0.5,
            maxStackHeight: 6,
            scoreMultiplier: 1
        },
        hard: {
            reactionTime: 600,
            accuracy: 0.9,
            blockSpawnRate: 1500,
            clearChance: 0.7,
            maxStackHeight: 7,
            scoreMultiplier: 1.5
        }
    };

    var _aiColors = ['#e74c3c', '#f1c40f', '#3498db', '#2ecc71'];

    // ─── Start AI ───────────────────────────────────────────
    AIOpponent.start = function(difficulty) {
        AIOpponent.stop();
        _aiState.difficulty = difficulty || 'medium';
        _aiState.running = true;
        _aiState.score = 0;
        _aiState.lives = 3;
        _aiState.alive = true;
        _aiState.ct = 0;
        _aiState.blocks = [[], [], [], [], [], []];
        _aiState.hexRotation = 0;

        var diff = _difficulties[_aiState.difficulty];

        // Tick: update AI game state
        _aiState.tickInterval = setInterval(function() {
            _aiTick();
        }, 100);

        // Decisions: AI makes moves
        _aiState.decisionInterval = setInterval(function() {
            _aiDecision();
        }, diff.reactionTime);

        // Block spawning
        _aiState.blockSpawnInterval = setInterval(function() {
            _spawnAIBlock();
        }, diff.blockSpawnRate);

        console.log('[AI] Started with difficulty:', difficulty);
    };

    // ─── Stop AI ────────────────────────────────────────────
    AIOpponent.stop = function() {
        _aiState.running = false;
        if (_aiState.tickInterval) clearInterval(_aiState.tickInterval);
        if (_aiState.decisionInterval) clearInterval(_aiState.decisionInterval);
        if (_aiState.blockSpawnInterval) clearInterval(_aiState.blockSpawnInterval);
        _aiState.tickInterval = null;
        _aiState.decisionInterval = null;
        _aiState.blockSpawnInterval = null;
    };

    // ─── Get AI State ───────────────────────────────────────
    AIOpponent.getState = function() {
        return {
            name: 'AI Bot (' + _aiState.difficulty + ')',
            score: _aiState.score,
            lives: _aiState.lives,
            blocks: _aiState.blocks,
            hexRotation: _aiState.hexRotation,
            alive: _aiState.alive,
            gameState: _aiState.alive ? 1 : 2
        };
    };

    AIOpponent.isAlive = function() {
        return _aiState.alive;
    };

    // ─── AI Tick (runs every 100ms) ─────────────────────────
    function _aiTick() {
        if (!_aiState.running || !_aiState.alive) return;
        _aiState.ct++;

        // Gradually increase score
        var diff = _difficulties[_aiState.difficulty];
        _aiState.score += Math.floor(Math.random() * 2 * diff.scoreMultiplier);

        // Check for overflow (life loss)
        for (var i = 0; i < 6; i++) {
            if (_aiState.blocks[i].length > diff.maxStackHeight) {
                _aiState.lives--;
                // Clear overflowing side
                _aiState.blocks[i] = _aiState.blocks[i].slice(0, Math.max(diff.maxStackHeight - 2, 0));

                if (_aiState.lives <= 0) {
                    _aiState.alive = false;
                    AIOpponent.stop();

                    // Notify game that AI lost
                    if (typeof LobbyUI !== 'undefined') {
                        LobbyUI.updateOpponentLives(0);
                        setTimeout(function() {
                            // Player wins!
                            if (typeof MP !== 'undefined' && MP.mode === 'ai_battle') {
                                var results = {
                                    results: [
                                        { playerId: MP.playerId, name: MP.playerName, score: window.score || 0, isWinner: true },
                                        { playerId: 'ai', name: 'AI Bot', score: _aiState.score, isWinner: false }
                                    ],
                                    winnerId: MP.playerId,
                                    winnerName: MP.playerName
                                };
                                LobbyUI.showResults(results);
                            }
                        }, 1000);
                    }
                    return;
                }
            }
        }

        // Broadcast state to battle renderer
        if (typeof BattleRender !== 'undefined') {
            BattleRender.updateOpponent('ai', AIOpponent.getState());
        }

        // Update opponent panel
        if (typeof LobbyUI !== 'undefined') {
            LobbyUI.updateOpponentPanel(AIOpponent.getState());
        }
    }

    // ─── AI Decision ────────────────────────────────────────
    function _aiDecision() {
        if (!_aiState.running || !_aiState.alive) return;

        var diff = _difficulties[_aiState.difficulty];

        // Try to clear matching blocks
        for (var side = 0; side < 6; side++) {
            if (_aiState.blocks[side].length >= 3) {
                // Check for 3+ same color at top
                var topColor = _aiState.blocks[side][_aiState.blocks[side].length - 1];
                var matchCount = 0;
                for (var j = _aiState.blocks[side].length - 1; j >= 0; j--) {
                    if (_aiState.blocks[side][j] === topColor) matchCount++;
                    else break;
                }

                if (matchCount >= 3 && Math.random() < diff.accuracy) {
                    // Clear matched blocks
                    var pointsEarned = matchCount * matchCount;
                    _aiState.score += Math.floor(pointsEarned * diff.scoreMultiplier);
                    _aiState.blocks[side].splice(_aiState.blocks[side].length - matchCount, matchCount);

                    // Send penalty to player (if in multiplayer)
                    if (matchCount >= 4 && typeof MP !== 'undefined' && MP.mode === 'ai_battle') {
                        var penaltyBlocks = Math.floor(matchCount * 0.5);
                        if (penaltyBlocks > 0) {
                            MP.pendingPenalties.push({
                                senderId: 'ai',
                                senderName: 'AI Bot',
                                blocksCleared: matchCount,
                                comboMultiplier: 1,
                                penaltyBlocks: penaltyBlocks
                            });
                        }
                    }
                }
            }
        }

        // Random clear chance (simulates AI matching blocks we don't model)
        if (Math.random() < diff.clearChance * 0.3) {
            var randomSide = Math.floor(Math.random() * 6);
            if (_aiState.blocks[randomSide].length >= 3) {
                var clearCount = Math.min(3, _aiState.blocks[randomSide].length);
                _aiState.blocks[randomSide].splice(_aiState.blocks[randomSide].length - clearCount, clearCount);
                _aiState.score += Math.floor(clearCount * clearCount * diff.scoreMultiplier);
            }
        }

        // Rotate hex randomly
        if (Math.random() < 0.3) {
            _aiState.hexRotation += (Math.random() < 0.5 ? 1 : -1) * (Math.PI / 3);
        }
    }

    // ─── Spawn Block on AI Board ────────────────────────────
    function _spawnAIBlock() {
        if (!_aiState.running || !_aiState.alive) return;

        var lane = Math.floor(Math.random() * 6);
        var color = _aiColors[Math.floor(Math.random() * _aiColors.length)];

        // Smarter AI places matching colors more often
        var diff = _difficulties[_aiState.difficulty];
        if (Math.random() < diff.accuracy * 0.5 && _aiState.blocks[lane].length > 0) {
            // Try to place same color as top block
            color = _aiState.blocks[lane][_aiState.blocks[lane].length - 1];
        }

        _aiState.blocks[lane].push(color);
    }

    // ─── Handle Penalty From Player ─────────────────────────
    AIOpponent.receivePenalty = function(numBlocks) {
        if (!_aiState.running || !_aiState.alive) return;

        for (var i = 0; i < numBlocks; i++) {
            var lane = Math.floor(Math.random() * 6);
            _aiState.blocks[lane].push('#95a5a6'); // Grey penalty blocks
        }
    };

})();
