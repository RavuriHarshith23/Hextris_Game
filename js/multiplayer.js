// ═══════════════════════════════════════════════════════════════
// Hextris Multiplayer Client - Core Socket.io Communication
// ═══════════════════════════════════════════════════════════════

(function() {
    'use strict';

    // ─── State ──────────────────────────────────────────────
    window.MP = {
        socket: null,
        connected: false,
        playerName: '',
        playerId: null,
        roomId: null,
        room: null,
        mode: null,                // 'single' | 'battle' | 'survival'
        isMultiplayer: false,
        isHost: false,
        opponents: {},             // socketId -> opponent state
        profile: null,
        pendingPenalties: [],      // Queue of penalty blocks to add
        syncInterval: null,
        STATE_SYNC_MS: 200,        // Send state every 200ms
        lastSyncTime: 0
    };

    // ─── Connection ─────────────────────────────────────────
    MP.connect = function(serverUrl) {
        if (MP.socket && MP.connected) return;

        serverUrl = serverUrl || window.location.origin;
        // Fix for file:// protocol or null origin
        if (!serverUrl || serverUrl === 'null' || serverUrl === 'file://' || serverUrl.indexOf('file:') === 0) {
            serverUrl = 'http://localhost:3000';
        }
        MP.socket = io(serverUrl, {
            reconnection: true,
            reconnectionDelay: 1000,
            reconnectionAttempts: 5,
            timeout: 10000
        });

        MP.socket.on('connect', function() {
            MP.connected = true;
            MP.playerId = MP.socket.id;
            console.log('[MP] Connected:', MP.playerId);

            if (MP.playerName) {
                MP.socket.emit('setName', { name: MP.playerName });
            }

            if (typeof MP.onConnect === 'function') MP.onConnect();
        });

        MP.socket.on('disconnect', function(reason) {
            MP.connected = false;
            console.log('[MP] Disconnected:', reason);
            MP.stopSync();
            if (typeof MP.onDisconnect === 'function') MP.onDisconnect(reason);
        });

        MP.socket.on('connect_error', function(err) {
            console.error('[MP] Connection error:', err.message);
            if (typeof MP.onError === 'function') MP.onError('Connection failed: ' + err.message);
        });

        // ─── Room Events ────────────────────────────────────
        MP.socket.on('roomCreated', function(data) {
            MP.roomId = data.roomId;
            MP.room = data.room;
            MP.isHost = true;
            MP.isMultiplayer = true;
            console.log('[MP] Room created:', data.roomId);
            if (typeof MP.onRoomCreated === 'function') MP.onRoomCreated(data);
        });

        MP.socket.on('roomJoined', function(data) {
            MP.roomId = data.roomId;
            MP.room = data.room;
            MP.isHost = false;
            MP.isMultiplayer = true;
            console.log('[MP] Joined room:', data.roomId);
            if (typeof MP.onRoomJoined === 'function') MP.onRoomJoined(data);
        });

        MP.socket.on('playerJoined', function(data) {
            MP.room = data.room;
            console.log('[MP] Player joined:', data.name);
            if (typeof MP.onPlayerJoined === 'function') MP.onPlayerJoined(data);
        });

        MP.socket.on('playerLeft', function(data) {
            MP.room = data.room;
            delete MP.opponents[data.playerId];
            // Check if we became host
            if (MP.room && MP.room.players.length > 0 && MP.room.players[0].id === MP.playerId) {
                MP.isHost = true;
            }
            console.log('[MP] Player left:', data.name);
            if (typeof MP.onPlayerLeft === 'function') MP.onPlayerLeft(data);
        });

        MP.socket.on('roomUpdate', function(data) {
            MP.room = data.room;
            if (typeof MP.onRoomUpdate === 'function') MP.onRoomUpdate(data);
        });

        MP.socket.on('roomList', function(data) {
            if (typeof MP.onRoomList === 'function') MP.onRoomList(data.rooms);
        });

        // ─── Matchmaking Events ─────────────────────────────
        MP.socket.on('matchmaking', function(data) {
            if (typeof MP.onMatchmaking === 'function') MP.onMatchmaking(data);
        });

        MP.socket.on('matchFound', function(data) {
            MP.roomId = data.roomId;
            MP.room = data.room;
            MP.isMultiplayer = true;
            console.log('[MP] Match found:', data.roomId);
            if (typeof MP.onMatchFound === 'function') MP.onMatchFound(data);
        });

        // ─── Game Events ────────────────────────────────────
        MP.socket.on('countdown', function(data) {
            if (typeof MP.onCountdown === 'function') MP.onCountdown(data.seconds);
        });

        MP.socket.on('gameStart', function(data) {
            MP.room = data.room;
            MP.opponents = {};
            console.log('[MP] Game starting!');
            if (typeof MP.onGameStart === 'function') MP.onGameStart(data);
        });

        MP.socket.on('opponentState', function(data) {
            MP.opponents[data.playerId] = {
                name: data.name,
                score: data.score,
                lives: data.lives,
                blocks: data.blocks,
                hexRotation: data.hexRotation,
                gameState: data.gameState,
                lastUpdate: Date.now()
            };
            if (typeof MP.onOpponentState === 'function') MP.onOpponentState(data);
        });

        MP.socket.on('opponentEvent', function(data) {
            if (typeof MP.onOpponentEvent === 'function') MP.onOpponentEvent(data);
        });

        MP.socket.on('penaltyIncoming', function(data) {
            MP.pendingPenalties.push(data);
            console.log('[MP] Penalty incoming from', data.senderName, ':', data.penaltyBlocks, 'blocks');
            if (typeof MP.onPenaltyIncoming === 'function') MP.onPenaltyIncoming(data);
        });

        MP.socket.on('playerOut', function(data) {
            if (MP.opponents[data.playerId]) {
                MP.opponents[data.playerId].alive = false;
            }
            if (typeof MP.onPlayerOut === 'function') MP.onPlayerOut(data);
        });

        MP.socket.on('gameEnd', function(data) {
            MP.stopSync();
            console.log('[MP] Game ended. Winner:', data.winnerName);
            if (typeof MP.onGameEnd === 'function') MP.onGameEnd(data);
        });

        // ─── Chat ───────────────────────────────────────────
        MP.socket.on('chatMessage', function(data) {
            if (typeof MP.onChatMessage === 'function') MP.onChatMessage(data);
        });

        // ─── Profile & Leaderboard ──────────────────────────
        MP.socket.on('profileData', function(data) {
            MP.profile = data;
            if (typeof MP.onProfileData === 'function') MP.onProfileData(data);
        });

        MP.socket.on('leaderboardData', function(data) {
            if (typeof MP.onLeaderboardData === 'function') MP.onLeaderboardData(data);
        });

        // ─── Errors ─────────────────────────────────────────
        MP.socket.on('error', function(data) {
            console.error('[MP] Server error:', data.message);
            if (typeof MP.onError === 'function') MP.onError(data.message);
        });
    };

    // ─── Actions ────────────────────────────────────────────
    MP.setName = function(name) {
        MP.playerName = name;
        if (MP.socket && MP.connected) {
            MP.socket.emit('setName', { name: name });
        }
    };

    MP.createRoom = function(mode, settings) {
        if (!MP.socket || !MP.connected) return;
        MP.mode = mode;
        MP.socket.emit('createRoom', {
            mode: mode,
            maxPlayers: mode === 'battle' ? 2 : 4,
            settings: settings || {}
        });
    };

    MP.joinRoom = function(roomId) {
        if (!MP.socket || !MP.connected) return;
        MP.socket.emit('joinRoom', { roomId: roomId });
    };

    MP.quickMatch = function(mode) {
        if (!MP.socket || !MP.connected) return;
        MP.mode = mode || 'battle';
        MP.socket.emit('quickMatch', { mode: MP.mode });
    };

    MP.cancelQuickMatch = function() {
        if (!MP.socket || !MP.connected) return;
        MP.socket.emit('cancelQuickMatch');
    };

    MP.toggleReady = function() {
        if (!MP.socket || !MP.connected) return;
        MP.socket.emit('playerReady');
    };

    MP.leaveRoom = function() {
        if (!MP.socket || !MP.connected) return;
        MP.socket.emit('leaveRoom');
        MP.roomId = null;
        MP.room = null;
        MP.isMultiplayer = false;
        MP.isHost = false;
        MP.opponents = {};
        MP.stopSync();
    };

    MP.sendChat = function(message) {
        if (!MP.socket || !MP.connected || !MP.roomId) return;
        MP.socket.emit('chatMessage', { message: message });
    };

    MP.getRooms = function() {
        if (!MP.socket || !MP.connected) return;
        MP.socket.emit('getRooms');
    };

    MP.getLeaderboard = function(mode, limit) {
        if (!MP.socket || !MP.connected) return;
        MP.socket.emit('getLeaderboard', { mode: mode, limit: limit || 20 });
    };

    MP.getProfile = function(name) {
        if (!MP.socket || !MP.connected) return;
        MP.socket.emit('getProfile', { name: name });
    };

    // ─── Game State Sync ────────────────────────────────────
    MP.startSync = function() {
        if (MP.syncInterval) return;
        MP.syncInterval = setInterval(function() {
            MP.sendGameState();
        }, MP.STATE_SYNC_MS);
    };

    MP.stopSync = function() {
        if (MP.syncInterval) {
            clearInterval(MP.syncInterval);
            MP.syncInterval = null;
        }
    };

    MP.sendGameState = function() {
        if (!MP.socket || !MP.connected || !MP.isMultiplayer) return;
        if (!window.MainHex) return;

        // Build simplified block state for opponent rendering
        var blockData = [];
        for (var i = 0; i < MainHex.blocks.length; i++) {
            var sideBlocks = [];
            for (var j = 0; j < MainHex.blocks[i].length; j++) {
                var b = MainHex.blocks[i][j];
                if (!b.deleted) {
                    sideBlocks.push({
                        color: b.color,
                        distFromHex: b.distFromHex,
                        settled: b.settled
                    });
                }
            }
            blockData.push(sideBlocks);
        }

        MP.socket.emit('gameState', {
            score: window.score || 0,
            lives: window.lives || 0,
            blocks: blockData,
            hexRotation: MainHex.targetAngle || 0,
            gameState: window.gameState
        });
    };

    MP.sendEvent = function(event, data) {
        if (!MP.socket || !MP.connected || !MP.isMultiplayer) return;
        MP.socket.emit('gameEvent', { event: event, data: data });
    };

    MP.sendPenalty = function(blocksCleared, comboMultiplier, targetId) {
        if (!MP.socket || !MP.connected || !MP.isMultiplayer) return;
        MP.socket.emit('sendPenalty', {
            blocksCleared: blocksCleared,
            comboMultiplier: comboMultiplier,
            targetId: targetId || null
        });
    };

    MP.reportElimination = function() {
        if (!MP.socket || !MP.connected || !MP.isMultiplayer) return;
        MP.socket.emit('playerEliminated');
    };

    // ─── Penalty Processing ─────────────────────────────────
    MP.processPenalties = function() {
        if (!MP.isMultiplayer || MP.pendingPenalties.length === 0) return;
        if (!window.MainHex || window.gameState !== 1) return;

        while (MP.pendingPenalties.length > 0) {
            var penalty = MP.pendingPenalties.shift();
            var numBlocks = penalty.penaltyBlocks;
            
            for (var i = 0; i < numBlocks; i++) {
                // Add grey penalty blocks to random sides
                var lane = Math.floor(Math.random() * MainHex.sides);
                var penaltyColor = '#95a5a6'; // Grey penalty block
                addNewBlock(lane, penaltyColor, settings.speedModifier * 3);
            }

            // Show penalty effect
            showPenaltyEffect(penalty);
        }
    };

    function showPenaltyEffect(penalty) {
        // Flash screen yellow-orange warning
        var overlay = document.getElementById('lifeLostOverlay');
        if (overlay) {
            overlay.style.background = 'rgba(230, 126, 34, 0.4)';
            overlay.classList.remove('flash');
            void overlay.offsetWidth;
            overlay.classList.add('flash');
            setTimeout(function() {
                overlay.style.background = '';
            }, 800);
        }

        // Show penalty text
        var text = document.getElementById('lifeLostText');
        if (text) {
            text.textContent = 'ATTACK FROM ' + penalty.senderName.toUpperCase() + '!';
            text.style.color = '#e67e22';
            text.classList.remove('show');
            void text.offsetWidth;
            text.classList.add('show');
            setTimeout(function() {
                text.style.color = '';
                text.classList.remove('show');
            }, 1500);
        }

        // Shake hex
        if (window.MainHex) {
            for (var i = 0; i < MainHex.sides; i++) {
                MainHex.shakes.push({
                    lane: i,
                    magnitude: 5 * (window.devicePixelRatio || 1) * settings.scale
                });
            }
        }
    }

    // ─── Disconnect / Cleanup ───────────────────────────────
    MP.disconnect = function() {
        if (MP.socket) {
            MP.stopSync();
            MP.socket.disconnect();
            MP.socket = null;
            MP.connected = false;
            MP.isMultiplayer = false;
            MP.roomId = null;
            MP.room = null;
            MP.opponents = {};
        }
    };

})();
