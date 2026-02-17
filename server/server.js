const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs');
const path = require('path');

// ─── Server Setup ───────────────────────────────────────────────
const app = express();
app.use(cors());
app.use(express.json());

// Serve static game files from parent directory
app.use(express.static(path.join(__dirname, '..')));

const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: '*', methods: ['GET', 'POST'] }
});

const PORT = process.env.PORT || 3000;

// ─── Data Storage ───────────────────────────────────────────────
const DATA_DIR = path.join(__dirname, 'data');
if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR);

const LEADERBOARD_FILE = path.join(DATA_DIR, 'leaderboard.json');
const PROFILES_FILE = path.join(DATA_DIR, 'profiles.json');

function loadJSON(file, fallback) {
    try {
        if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8'));
    } catch (e) { console.error('Load error:', file, e.message); }
    return fallback;
}

function saveJSON(file, data) {
    try { fs.writeFileSync(file, JSON.stringify(data, null, 2)); }
    catch (e) { console.error('Save error:', file, e.message); }
}

let leaderboard = loadJSON(LEADERBOARD_FILE, []);
let profiles = loadJSON(PROFILES_FILE, {});

// ─── Room & Matchmaking State ───────────────────────────────────
const rooms = {};            // roomId -> Room object
const quickMatchQueue = [];  // Array of { socketId, playerName, mode }
const playerSockets = {};    // socketId -> { roomId, playerName, playerId }

class Room {
    constructor(id, host, mode, maxPlayers) {
        this.id = id;
        this.host = host;           // socketId
        this.mode = mode;           // 'battle' | 'survival'
        this.maxPlayers = maxPlayers;
        this.players = {};          // socketId -> PlayerInfo
        this.state = 'waiting';     // 'waiting' | 'countdown' | 'playing' | 'finished'
        this.createdAt = Date.now();
        this.gameStartTime = null;
        this.settings = {
            penaltyEnabled: true,
            penaltyMultiplier: 1,
            startSpeed: 1,
            livesCount: 3
        };
    }

    addPlayer(socketId, name) {
        if (Object.keys(this.players).length >= this.maxPlayers) return false;
        if (this.state !== 'waiting') return false;
        this.players[socketId] = {
            name: name,
            ready: false,
            score: 0,
            lives: this.settings.livesCount,
            alive: true,
            lastUpdate: Date.now()
        };
        return true;
    }

    removePlayer(socketId) {
        delete this.players[socketId];
        if (socketId === this.host) {
            const remaining = Object.keys(this.players);
            this.host = remaining.length > 0 ? remaining[0] : null;
        }
        return Object.keys(this.players).length;
    }

    allReady() {
        const players = Object.values(this.players);
        return players.length >= 2 && players.every(p => p.ready);
    }

    getAlivePlayers() {
        return Object.entries(this.players).filter(([_, p]) => p.alive);
    }

    toPublic() {
        return {
            id: this.id,
            mode: this.mode,
            playerCount: Object.keys(this.players).length,
            maxPlayers: this.maxPlayers,
            state: this.state,
            host: this.players[this.host]?.name || 'Unknown',
            players: Object.entries(this.players).map(([sid, p]) => ({
                id: sid,
                name: p.name,
                ready: p.ready,
                score: p.score,
                lives: p.lives,
                alive: p.alive
            }))
        };
    }
}

// ─── Room Code Generator ────────────────────────────────────────
function generateRoomCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 5; i++) code += chars[Math.floor(Math.random() * chars.length)];
    return rooms[code] ? generateRoomCode() : code;
}

// ─── ELO Rating ─────────────────────────────────────────────────
function calculateElo(ratingA, ratingB, scoreA, scoreB, k) {
    k = k || 32;
    var expectedA = 1 / (1 + Math.pow(10, (ratingB - ratingA) / 400));
    var actualA = scoreA > scoreB ? 1 : (scoreA === scoreB ? 0.5 : 0);
    return Math.round(ratingA + k * (actualA - expectedA));
}

// ─── Leaderboard Helpers ────────────────────────────────────────
function addLeaderboardEntry(name, score, mode) {
    leaderboard.push({
        name: name,
        score: score,
        mode: mode,
        date: Date.now()
    });
    leaderboard.sort(function(a, b) { return b.score - a.score; });
    leaderboard = leaderboard.slice(0, 100); // Keep top 100
    saveJSON(LEADERBOARD_FILE, leaderboard);
}

function getLeaderboard(mode, limit) {
    limit = limit || 20;
    var filtered = mode ? leaderboard.filter(function(e) { return e.mode === mode; }) : leaderboard;
    return filtered.slice(0, limit);
}

// ─── Profile Helpers ────────────────────────────────────────────
function getOrCreateProfile(name) {
    if (!profiles[name]) {
        profiles[name] = {
            name: name,
            rating: 1000,
            wins: 0,
            losses: 0,
            draws: 0,
            gamesPlayed: 0,
            bestScore: 0,
            totalScore: 0,
            createdAt: Date.now()
        };
    }
    return profiles[name];
}

function saveProfiles() {
    saveJSON(PROFILES_FILE, profiles);
}

// ─── Cleanup Stale Rooms ────────────────────────────────────────
setInterval(function() {
    var now = Date.now();
    Object.keys(rooms).forEach(function(roomId) {
        var room = rooms[roomId];
        // Remove rooms older than 30 minutes with no players
        if (Object.keys(room.players).length === 0 && now - room.createdAt > 1800000) {
            delete rooms[roomId];
        }
        // Remove finished rooms after 5 minutes
        if (room.state === 'finished' && now - room.gameStartTime > 300000) {
            delete rooms[roomId];
        }
    });
}, 60000);

// ─── Socket.io Connection Handler ───────────────────────────────
io.on('connection', function(socket) {
    console.log('Player connected:', socket.id);

    // ─── Set Player Name ────────────────────────────────────
    socket.on('setName', function(data) {
        var name = (data.name || 'Player').substring(0, 16).trim();
        if (playerSockets[socket.id]) {
            // Preserve roomId — don't overwrite the whole entry
            playerSockets[socket.id].playerName = name;
        } else {
            playerSockets[socket.id] = { playerName: name, roomId: null, playerId: socket.id };
        }
        // Also update name in current room if already in one
        var info = playerSockets[socket.id];
        if (info.roomId && rooms[info.roomId] && rooms[info.roomId].players[socket.id]) {
            rooms[info.roomId].players[socket.id].name = name;
            // Broadcast updated room to other players
            io.to(info.roomId).emit('roomUpdate', { room: rooms[info.roomId].toPublic() });
        }
        var profile = getOrCreateProfile(name);
        socket.emit('profileData', profile);
    });

    // ─── Create Room ────────────────────────────────────────
    socket.on('createRoom', function(data) {
        var mode = data.mode || 'battle';
        var maxPlayers = mode === 'battle' ? 2 : (data.maxPlayers || 4);
        maxPlayers = Math.min(Math.max(maxPlayers, 2), 4);

        var roomId = generateRoomCode();
        var room = new Room(roomId, socket.id, mode, maxPlayers);

        var playerName = (playerSockets[socket.id] && playerSockets[socket.id].playerName) || 'Player';
        room.addPlayer(socket.id, playerName);

        if (data.settings) {
            if (data.settings.penaltyEnabled !== undefined) room.settings.penaltyEnabled = data.settings.penaltyEnabled;
            if (data.settings.penaltyMultiplier) room.settings.penaltyMultiplier = data.settings.penaltyMultiplier;
            if (data.settings.startSpeed) room.settings.startSpeed = data.settings.startSpeed;
            if (data.settings.livesCount) room.settings.livesCount = Math.min(Math.max(data.settings.livesCount, 1), 5);
        }

        rooms[roomId] = room;
        socket.join(roomId);
        if (playerSockets[socket.id]) playerSockets[socket.id].roomId = roomId;

        socket.emit('roomCreated', { roomId: roomId, room: room.toPublic() });
        console.log('Room created:', roomId, 'by', playerName);
    });

    // ─── Join Room ──────────────────────────────────────────
    socket.on('joinRoom', function(data) {
        var roomId = (data.roomId || '').toUpperCase().trim();
        var room = rooms[roomId];

        if (!room) {
            socket.emit('error', { message: 'Room not found' });
            return;
        }

        if (room.state !== 'waiting') {
            socket.emit('error', { message: 'Game already in progress' });
            return;
        }

        var playerName = (playerSockets[socket.id] && playerSockets[socket.id].playerName) || 'Player';
        if (!room.addPlayer(socket.id, playerName)) {
            socket.emit('error', { message: 'Room is full' });
            return;
        }

        socket.join(roomId);
        if (playerSockets[socket.id]) playerSockets[socket.id].roomId = roomId;

        socket.emit('roomJoined', { roomId: roomId, room: room.toPublic() });
        socket.to(roomId).emit('playerJoined', {
            playerId: socket.id,
            name: playerName,
            room: room.toPublic()
        });
        console.log(playerName, 'joined room', roomId);
    });

    // ─── Quick Match ────────────────────────────────────────
    socket.on('quickMatch', function(data) {
        var mode = data.mode || 'battle';
        var playerName = (playerSockets[socket.id] && playerSockets[socket.id].playerName) || 'Player';

        // Check if already in queue
        var inQueue = quickMatchQueue.some(function(q) { return q.socketId === socket.id; });
        if (inQueue) {
            socket.emit('error', { message: 'Already in queue' });
            return;
        }

        quickMatchQueue.push({ socketId: socket.id, playerName: playerName, mode: mode, joinedAt: Date.now() });
        socket.emit('matchmaking', { status: 'searching', queueSize: quickMatchQueue.length });

        // Try to match
        tryMatchPlayers(mode);
    });

    socket.on('cancelQuickMatch', function() {
        for (var i = quickMatchQueue.length - 1; i >= 0; i--) {
            if (quickMatchQueue[i].socketId === socket.id) {
                quickMatchQueue.splice(i, 1);
                break;
            }
        }
        socket.emit('matchmaking', { status: 'cancelled' });
    });

    // ─── Player Ready ───────────────────────────────────────
    socket.on('playerReady', function(data) {
        var info = playerSockets[socket.id];
        if (!info || !info.roomId) return;
        var room = rooms[info.roomId];
        if (!room || !room.players[socket.id]) return;

        room.players[socket.id].ready = !room.players[socket.id].ready;
        io.to(info.roomId).emit('roomUpdate', { room: room.toPublic() });

        // Auto-start if all ready
        if (room.allReady() && room.state === 'waiting') {
            startCountdown(info.roomId);
        }
    });

    // ─── Game State Sync ────────────────────────────────────
    socket.on('gameState', function(data) {
        var info = playerSockets[socket.id];
        if (!info || !info.roomId) return;
        var room = rooms[info.roomId];
        if (!room || room.state !== 'playing') return;

        // Update player state
        var player = room.players[socket.id];
        if (player) {
            player.score = data.score || 0;
            player.lives = data.lives || 0;
            player.lastUpdate = Date.now();
        }

        // Broadcast to other players in room
        socket.to(info.roomId).emit('opponentState', {
            playerId: socket.id,
            name: player ? player.name : 'Unknown',
            score: data.score,
            lives: data.lives,
            blocks: data.blocks,       // Simplified block data for rendering
            hexRotation: data.hexRotation,
            gameState: data.gameState
        });
    });

    // ─── Game Event (rotation, speed up, etc.) ──────────────
    socket.on('gameEvent', function(data) {
        var info = playerSockets[socket.id];
        if (!info || !info.roomId) return;
        var room = rooms[info.roomId];
        if (!room || room.state !== 'playing') return;

        socket.to(info.roomId).emit('opponentEvent', {
            playerId: socket.id,
            event: data.event,
            data: data.data
        });
    });

    // ─── Penalty / Attack ───────────────────────────────────
    socket.on('sendPenalty', function(data) {
        var info = playerSockets[socket.id];
        if (!info || !info.roomId) return;
        var room = rooms[info.roomId];
        if (!room || room.state !== 'playing' || !room.settings.penaltyEnabled) return;

        var penaltyData = {
            senderId: socket.id,
            senderName: (room.players[socket.id] && room.players[socket.id].name) || 'Unknown',
            blocksCleared: data.blocksCleared || 0,
            comboMultiplier: data.comboMultiplier || 1,
            penaltyBlocks: Math.floor((data.blocksCleared || 0) * room.settings.penaltyMultiplier * 0.5)
        };

        if (data.targetId) {
            // Send to specific player
            io.to(data.targetId).emit('penaltyIncoming', penaltyData);
        } else {
            // Send to all opponents
            socket.to(info.roomId).emit('penaltyIncoming', penaltyData);
        }
    });

    // ─── Player Eliminated ──────────────────────────────────
    socket.on('playerEliminated', function() {
        var info = playerSockets[socket.id];
        if (!info || !info.roomId) return;
        var room = rooms[info.roomId];
        if (!room || room.state !== 'playing') return;

        var player = room.players[socket.id];
        if (player) {
            player.alive = false;
            player.lives = 0;
        }

        io.to(info.roomId).emit('playerOut', {
            playerId: socket.id,
            name: player ? player.name : 'Unknown'
        });

        // Check win condition
        var alive = room.getAlivePlayers();
        if (alive.length <= 1) {
            endGame(info.roomId, alive.length === 1 ? alive[0][0] : null);
        }
    });

    // ─── Chat Message ───────────────────────────────────────
    socket.on('chatMessage', function(data) {
        var info = playerSockets[socket.id];
        if (!info || !info.roomId) return;
        var msg = (data.message || '').substring(0, 200).trim();
        if (!msg) return;

        io.to(info.roomId).emit('chatMessage', {
            playerId: socket.id,
            name: info.playerName,
            message: msg,
            timestamp: Date.now()
        });
    });

    // ─── Leave Room ─────────────────────────────────────────
    socket.on('leaveRoom', function() {
        handlePlayerLeave(socket);
    });

    // ─── Get Room List ──────────────────────────────────────
    socket.on('getRooms', function() {
        var publicRooms = [];
        Object.keys(rooms).forEach(function(id) {
            var room = rooms[id];
            if (room.state === 'waiting' && Object.keys(room.players).length < room.maxPlayers) {
                publicRooms.push(room.toPublic());
            }
        });
        socket.emit('roomList', { rooms: publicRooms });
    });

    // ─── Leaderboard ────────────────────────────────────────
    socket.on('getLeaderboard', function(data) {
        var mode = data ? data.mode : null;
        var limit = data ? data.limit : 20;
        socket.emit('leaderboardData', { entries: getLeaderboard(mode, limit) });
    });

    // ─── Get Profile ────────────────────────────────────────
    socket.on('getProfile', function(data) {
        var name = data ? data.name : null;
        if (!name && playerSockets[socket.id]) name = playerSockets[socket.id].playerName;
        if (name) {
            socket.emit('profileData', getOrCreateProfile(name));
        }
    });

    // ─── Disconnect ─────────────────────────────────────────
    socket.on('disconnect', function() {
        console.log('Player disconnected:', socket.id);
        handlePlayerLeave(socket);

        // Remove from quick match queue
        for (var i = quickMatchQueue.length - 1; i >= 0; i--) {
            if (quickMatchQueue[i].socketId === socket.id) {
                quickMatchQueue.splice(i, 1);
            }
        }

        delete playerSockets[socket.id];
    });
});

// ─── Helper Functions ───────────────────────────────────────────

function handlePlayerLeave(socket) {
    var info = playerSockets[socket.id];
    if (!info || !info.roomId) return;

    var roomId = info.roomId;
    var room = rooms[roomId];
    if (!room) return;

    socket.leave(roomId);
    var remaining = room.removePlayer(socket.id);
    info.roomId = null;

    if (remaining === 0) {
        delete rooms[roomId];
        console.log('Room deleted:', roomId);
        return;
    }

    io.to(roomId).emit('playerLeft', {
        playerId: socket.id,
        name: info.playerName,
        room: room.toPublic()
    });

    // If game is playing and player leaves, check win condition
    if (room.state === 'playing') {
        var alive = room.getAlivePlayers();
        if (alive.length <= 1) {
            endGame(roomId, alive.length === 1 ? alive[0][0] : null);
        }
    }
}

function startCountdown(roomId) {
    var room = rooms[roomId];
    if (!room) return;

    room.state = 'countdown';
    io.to(roomId).emit('countdown', { seconds: 3 });

    var count = 3;
    var timer = setInterval(function() {
        count--;
        if (count > 0) {
            io.to(roomId).emit('countdown', { seconds: count });
        } else {
            clearInterval(timer);
            startGame(roomId);
        }
    }, 1000);
}

function startGame(roomId) {
    var room = rooms[roomId];
    if (!room) return;

    room.state = 'playing';
    room.gameStartTime = Date.now();

    // Reset player states
    Object.keys(room.players).forEach(function(sid) {
        room.players[sid].score = 0;
        room.players[sid].lives = room.settings.livesCount;
        room.players[sid].alive = true;
        room.players[sid].ready = false;
    });

    io.to(roomId).emit('gameStart', {
        room: room.toPublic(),
        settings: room.settings,
        timestamp: room.gameStartTime
    });

    console.log('Game started in room', roomId);
}

function endGame(roomId, winnerId) {
    var room = rooms[roomId];
    if (!room || room.state === 'finished') return;

    room.state = 'finished';

    // Calculate results
    var results = Object.entries(room.players).map(function(entry) {
        return {
            playerId: entry[0],
            name: entry[1].name,
            score: entry[1].score,
            lives: entry[1].lives,
            alive: entry[1].alive,
            isWinner: entry[0] === winnerId
        };
    }).sort(function(a, b) { return b.score - a.score; });

    // Update profiles and leaderboard
    results.forEach(function(r) {
        var profile = getOrCreateProfile(r.name);
        profile.gamesPlayed++;
        profile.totalScore += r.score;
        if (r.score > profile.bestScore) profile.bestScore = r.score;
        if (r.isWinner) profile.wins++;
        else profile.losses++;

        addLeaderboardEntry(r.name, r.score, room.mode);
    });

    // Update ELO for battle mode
    if (room.mode === 'battle' && results.length === 2) {
        var p1 = getOrCreateProfile(results[0].name);
        var p2 = getOrCreateProfile(results[1].name);
        var newRating1 = calculateElo(p1.rating, p2.rating, results[0].score, results[1].score);
        var newRating2 = calculateElo(p2.rating, p1.rating, results[1].score, results[0].score);
        p1.rating = newRating1;
        p2.rating = newRating2;
    }

    saveProfiles();

    io.to(roomId).emit('gameEnd', {
        results: results,
        winnerId: winnerId,
        winnerName: winnerId && room.players[winnerId] ? room.players[winnerId].name : null
    });

    console.log('Game ended in room', roomId, '- Winner:', winnerId);
}

function tryMatchPlayers(mode) {
    var candidates = quickMatchQueue.filter(function(q) { return q.mode === mode; });
    var needed = mode === 'battle' ? 2 : 2; // Minimum 2 for any mode

    if (candidates.length >= needed) {
        var matched = candidates.slice(0, needed);
        var roomId = generateRoomCode();
        var room = new Room(roomId, matched[0].socketId, mode, mode === 'battle' ? 2 : 4);

        matched.forEach(function(m) {
            room.addPlayer(m.socketId, m.playerName);
            var sock = io.sockets.sockets.get(m.socketId);
            if (sock) {
                sock.join(roomId);
                if (playerSockets[m.socketId]) playerSockets[m.socketId].roomId = roomId;
            }

            // Remove from queue
            for (var i = quickMatchQueue.length - 1; i >= 0; i--) {
                if (quickMatchQueue[i].socketId === m.socketId) {
                    quickMatchQueue.splice(i, 1);
                    break;
                }
            }
        });

        rooms[roomId] = room;

        // Notify matched players
        matched.forEach(function(m) {
            var sock = io.sockets.sockets.get(m.socketId);
            if (sock) {
                sock.emit('matchFound', { roomId: roomId, room: room.toPublic() });
            }
        });

        console.log('Quick match created:', roomId, 'for', matched.map(function(m) { return m.playerName; }));
    }
}

// ─── REST API Endpoints ─────────────────────────────────────────
app.get('/api/leaderboard', function(req, res) {
    var mode = req.query.mode || null;
    var limit = parseInt(req.query.limit) || 20;
    res.json({ entries: getLeaderboard(mode, limit) });
});

app.get('/api/rooms', function(req, res) {
    var publicRooms = [];
    Object.keys(rooms).forEach(function(id) {
        var room = rooms[id];
        if (room.state === 'waiting') {
            publicRooms.push(room.toPublic());
        }
    });
    res.json({ rooms: publicRooms });
});

app.get('/api/profile/:name', function(req, res) {
    res.json(getOrCreateProfile(req.params.name));
});

app.get('/api/stats', function(req, res) {
    res.json({
        onlinePlayers: Object.keys(playerSockets).length,
        activeRooms: Object.keys(rooms).length,
        queueSize: quickMatchQueue.length,
        totalGames: leaderboard.length
    });
});

// ─── Start Server ───────────────────────────────────────────────
server.listen(PORT, function() {
    console.log('=================================');
    console.log('  Hextris Multiplayer Server');
    console.log('  Running on port ' + PORT);
    console.log('  http://localhost:' + PORT);
    console.log('=================================');
});
