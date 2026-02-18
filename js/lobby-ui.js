// ═══════════════════════════════════════════════════════════════
// Hextris Multiplayer - Lobby UI System
// ═══════════════════════════════════════════════════════════════

(function() {
    'use strict';

    window.LobbyUI = {};
    var _chatMessages = [];

    // ─── Initialize ─────────────────────────────────────────
    LobbyUI.init = function() {
        LobbyUI.bindEvents();
        LobbyUI.loadPlayerName();
        // Initialize game config
        if (typeof GameConfig !== 'undefined') {
            GameConfig.init();
        }
    };

    // ─── Load/Save Player Name ──────────────────────────────
    LobbyUI.loadPlayerName = function() {
        var saved = localStorage.getItem('hextris_playerName');
        if (saved) {
            MP.playerName = saved;
            $('#mpPlayerNameInput').val(saved);
        }
    };

    LobbyUI.savePlayerName = function(name) {
        name = (name || 'Player').substring(0, 16).trim();
        localStorage.setItem('hextris_playerName', name);
        MP.playerName = name;
    };

    // ─── Show/Hide Screens with transitions ────────────────
    LobbyUI.showScreen = function(screenId) {
        $('#startBtn').hide();
        // Track previous screen for back navigation
        var currentVisible = $('.mp-screen').filter(function() {
            return $(this).css('display') !== 'none';
        }).first().attr('id');
        if (currentVisible && currentVisible !== screenId) {
            LobbyUI._prevScreen = currentVisible;
        }
        // Stop animations & hide all screens immediately
        $('.mp-screen').stop(true, false).css({opacity: 0, display: 'none'});
        var $screen = $('#' + screenId);
        $screen.css({display: 'flex', opacity: 0}).animate({opacity: 1}, 200);
    };

    LobbyUI.hideAllScreens = function(showStartBtn) {
        $('.mp-screen').stop(true, false).css({opacity: 0, display: 'none'});
        if (showStartBtn !== false) {
            $('#startBtn').show();
        }
    };

    // Track previous screen for back navigation
    LobbyUI._prevScreen = 'mpMainMenu';

    LobbyUI.showMainMenu = function() {
        // Update coin display
        if (typeof CoinShop !== 'undefined') CoinShop.updateCoinDisplay();
        LobbyUI.showScreen('mpMainMenu');
    };

    LobbyUI.showLobby = function() {
        LobbyUI.showScreen('mpLobbyScreen');
        LobbyUI.updateLobbyUI();
    };


    // ─── Bind UI Events ─────────────────────────────────────
    LobbyUI.bindEvents = function() {
        // Main menu buttons
        $('#mpBtnSinglePlayer').on('click', function(e) {
            e.preventDefault();
            MP.isMultiplayer = false;
            MP.mode = 'single';
            LobbyUI.hideAllScreens();
            LobbyUI.startSinglePlayer();
        });

        $('#mpBtnCreateRoom').on('click', function(e) {
            e.preventDefault();
            LobbyUI.showScreen('mpCreateRoomScreen');
        });

        $('#mpBtnJoinRoom').on('click', function(e) {
            e.preventDefault();
            LobbyUI.showScreen('mpJoinRoomScreen');
        });

        $('#mpBtnLeaderboard').on('click', function(e) {
            e.preventDefault();
            LobbyUI.showScreen('mpLeaderboardScreen');
            MP.getLeaderboard(null, 20);
        });

        // Settings
        $('#mpBtnSettings').on('click', function(e) {
            e.preventDefault();
            if (typeof GameConfig !== 'undefined') GameConfig.populateUI();
            LobbyUI.showScreen('mpSettingsScreen');
        });

        // Campaign Levels
        $('#mpBtnLevels').on('click', function(e) {
            e.preventDefault();
            if (typeof GameLevels !== 'undefined') {
                GameLevels.buildLevelSelectUI();
            }
            LobbyUI.showScreen('mpLevelSelectScreen');
        });

        // Stats & Achievements
        $('#mpBtnStats').on('click', function(e) {
            e.preventDefault();
            if (typeof GameStats !== 'undefined') GameStats.buildStatsUI();
            LobbyUI.showScreen('mpStatsScreen');
        });

        // Stats Reset
        $('#statsResetBtn').on('click', function(e) {
            e.preventDefault();
            if (confirm('Reset all stats and achievements? This cannot be undone!')) {
                if (typeof GameStats !== 'undefined') {
                    GameStats.resetAll();
                    GameStats.buildStatsUI();
                }
            }
        });

        // Daily Challenge
        $('#mpBtnDailyChallenge').on('click', function(e) {
            e.preventDefault();
            if (typeof DailyChallenge !== 'undefined') DailyChallenge.buildUI();
            // Update timer
            var timerEl = document.getElementById('dcTimer');
            if (timerEl && typeof DailyChallenge !== 'undefined') {
                timerEl.textContent = DailyChallenge.getTimeUntilNext();
            }
            LobbyUI.showScreen('dailyChallengeScreen');
        });

        // Reset level progress
        $('#lvlResetProgress').on('click', function(e) {
            e.preventDefault();
            if (typeof GameLevels !== 'undefined') {
                if (confirm('Reset all level progress? This cannot be undone!')) {
                    GameLevels.resetProgress();
                    GameLevels.buildLevelSelectUI();
                }
            }
        });

        // Create Room
        $('#mpBtnCreateConfirm').on('click', function(e) {
            e.preventDefault();
            LobbyUI.createRoom();
        });

        // Join Room
        $('#mpBtnJoinConfirm').on('click', function(e) {
            e.preventDefault();
            var code = $('#mpRoomCodeInput').val().trim().toUpperCase();
            if (code.length >= 4) {
                // Ensure name is set before joining
                var name = $('#mpPlayerNameInput').val().trim();
                if (!name) {
                    name = 'Player_' + Math.floor(Math.random() * 9999);
                    $('#mpPlayerNameInput').val(name);
                }
                LobbyUI.savePlayerName(name);
                MP.setName(name);
                MP.joinRoom(code);
            }
        });

        // Room code input uppercase
        $('#mpRoomCodeInput').on('input', function() {
            this.value = this.value.toUpperCase().replace(/[^A-Z0-9]/g, '');
        });

        // Ready button in lobby (use click only to avoid double-fire on touch)
        $('#mpBtnReady').on('click', function(e) {
            e.preventDefault();
            MP.toggleReady();
        });

        // Leave room
        $('#mpBtnLeaveRoom').on('click', function(e) {
            e.preventDefault();
            MP.leaveRoom();
            LobbyUI.showMainMenu();
        });

        // Cancel matchmaking
        // Back buttons
        $('.mp-btn-back').on('click', function(e) {
            e.preventDefault();
            LobbyUI.showMainMenu();
        });

        // Copy room code button
        $('#mpCopyRoomCode').on('click', function(e) {
            e.preventDefault();
            var code = $('#mpRoomCode').text();
            if (code && code !== '-----') {
                if (navigator.clipboard && navigator.clipboard.writeText) {
                    navigator.clipboard.writeText(code).then(function() {
                        $('#mpCopyRoomCode').text('COPIED!');
                        setTimeout(function() { $('#mpCopyRoomCode').text('COPY'); }, 1500);
                    });
                } else {
                    // Fallback for older browsers
                    var temp = document.createElement('textarea');
                    temp.value = code;
                    document.body.appendChild(temp);
                    temp.select();
                    document.execCommand('copy');
                    document.body.removeChild(temp);
                    $('#mpCopyRoomCode').text('COPIED!');
                    setTimeout(function() { $('#mpCopyRoomCode').text('COPY'); }, 1500);
                }
            }
        });

        // Chat
        $('#mpChatInput').on('keypress', function(e) {
            if (e.which === 13) {
                var msg = $(this).val().trim();
                if (msg) {
                    MP.sendChat(msg);
                    $(this).val('');
                }
            }
        });

        $('#mpBtnSendChat').on('click', function(e) {
            e.preventDefault();
            var msg = $('#mpChatInput').val().trim();
            if (msg) {
                MP.sendChat(msg);
                $('#mpChatInput').val('');
            }
        });

        // Name input
        $('#mpPlayerNameInput').on('change blur', function() {
            var name = $(this).val().trim();
            if (name) {
                LobbyUI.savePlayerName(name);
                MP.setName(name);
            }
        });

        // Leaderboard tabs
        $('.lb-tab').on('click', function(e) {
            e.preventDefault();
            $('.lb-tab').removeClass('active');
            $(this).addClass('active');
            var mode = $(this).data('mode');
            MP.getLeaderboard(mode || null, 20);
        });

        // Return to menu from game over 
        $('#mpBtnBackToMenu').on('click', function(e) {
            e.preventDefault();
            $('#mpResultsScreen').fadeOut(200);
            LobbyUI.showMainMenu();
        });

        // Play Again from results
        $('#mpBtnPlayAgain').on('click', function(e) {
            e.preventDefault();
            $('#mpResultsScreen').fadeOut(200);
            if (MP.mode === 'ai_battle') {
                // Restart AI battle directly
                setTimeout(function() {
                    LobbyUI.hideAllScreens(false);
                    MP.isMultiplayer = true;
                    MP.mode = 'ai_battle';
                    $('#opponentPanel').show();
                    $('#canvas').addClass('mp-canvas');
                    clearSaveState();
                    init(1);
                    if (typeof AIOpponent !== 'undefined') {
                        var diff = AIOpponent.getState ? AIOpponent.getState().difficulty : 'medium';
                        AIOpponent.start(diff || 'medium');
                    }
                    if (typeof BattleRender !== 'undefined') BattleRender.start();
                }, 250);
            } else if (MP.roomId) {
                MP.toggleReady();
                LobbyUI.showLobby();
            } else {
                LobbyUI.showMainMenu();
            }
        });
    };

    // ─── Create Room Logic ──────────────────────────────────
    LobbyUI.createRoom = function() {
        var mode = $('input[name="mpGameMode"]:checked').val() || 'battle';
        var penaltyEnabled = $('#mpPenaltyToggle').is(':checked');
        var livesCount = parseInt($('#mpLivesSelect').val()) || 3;

        var name = $('#mpPlayerNameInput').val().trim();
        if (!name) {
            name = 'Player_' + Math.floor(Math.random() * 9999);
            $('#mpPlayerNameInput').val(name);
        }
        LobbyUI.savePlayerName(name);
        MP.setName(name);

        MP.createRoom(mode, {
            penaltyEnabled: penaltyEnabled,
            livesCount: livesCount
        });
    };



    // ─── Single Player ──────────────────────────────────────
    LobbyUI.startSinglePlayer = function() {
        MP.isMultiplayer = false;
        MP.mode = 'single';
        $('.mp-screen').hide();
        // Hide game over screen and clear state
        $('#gameoverscreen').fadeOut();
        clearSaveState();
        // Show start button for single player mode
        $('#startBtn').show();
        // Hide opponent panel
        $('#opponentPanel').hide();
        // Reset canvas to full width
        $('#canvas').removeClass('mp-canvas');
        document.getElementById('canvas').className = '';
        // Start normal game
        if (typeof setStartScreen === 'function') {
            setStartScreen();
        }
    };



    // ─── Update Lobby UI ────────────────────────────────────
    LobbyUI.updateLobbyUI = function() {
        if (!MP.room) return;

        $('#mpRoomCode').text(MP.roomId);
        $('#mpRoomMode').text(MP.room.mode === 'battle' ? '⚔️ Battle Mode' : '🏆 Survival Race');
        $('#mpRoomPlayerCount').text(MP.room.players.length + '/' + MP.room.maxPlayers);

        var playerListHtml = '';
        MP.room.players.forEach(function(p) {
            var isMe = p.id === MP.playerId;
            var isHost = MP.room.players.indexOf(p) === 0;
            playerListHtml += '<div class="mp-player-item' + (isMe ? ' me' : '') + (p.ready ? ' ready' : '') + '">';
            playerListHtml += '<span class="mp-player-name">' + escapeHtml(p.name) + '</span>';
            if (isHost) playerListHtml += '<span class="mp-player-badge host">HOST</span>';
            playerListHtml += '<span class="mp-player-status">' + (p.ready ? '✓ READY' : 'Waiting...') + '</span>';
            playerListHtml += '</div>';
        });
        $('#mpPlayerList').html(playerListHtml);

        // Update ready button state
        var myPlayer = MP.room.players.find(function(p) { return p.id === MP.playerId; });
        if (myPlayer) {
            $('#mpBtnReady').toggleClass('ready', myPlayer.ready);
            $('#mpBtnReady').text(myPlayer.ready ? '✓ READY' : 'READY UP');
        }
    };

    // ─── Update Opponent Panel ──────────────────────────────
    LobbyUI.updateOpponentPanel = function(data) {
        $('#opponentName').text(data.name || 'Opponent');
        $('#opponentScore').text(data.score || 0);
        LobbyUI.updateOpponentLives(data.lives || 0);
    };

    LobbyUI.updateOpponentLives = function(lives) {
        var heartSvg = '<svg width="16" height="16" viewBox="0 0 24 24" fill="#e74c3c"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
        var emptyHeart = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#555" stroke-width="2"><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>';
        var hearts = '';
        for (var i = 0; i < 3; i++) {
            hearts += '<span class="opp-heart' + (i < lives ? '' : ' empty') + '">' + (i < lives ? heartSvg : emptyHeart) + '</span>';
        }
        $('#opponentLives').html(hearts);
    };

    // ─── Chat ───────────────────────────────────────────────
    LobbyUI.addChatMessage = function(data) {
        _chatMessages.push(data);
        if (_chatMessages.length > 50) _chatMessages.shift();

        var isMe = data.playerId === MP.playerId;
        var html = '<div class="chat-msg' + (isMe ? ' me' : '') + '">';
        html += '<span class="chat-name">' + escapeHtml(data.name) + ':</span> ';
        html += '<span class="chat-text">' + escapeHtml(data.message) + '</span>';
        html += '</div>';
        $('#mpChatMessages').append(html);

        // Auto-scroll
        var chatBox = document.getElementById('mpChatMessages');
        if (chatBox) chatBox.scrollTop = chatBox.scrollHeight;
    };

    // ─── Countdown Display ──────────────────────────────────
    LobbyUI.showCountdown = function(seconds) {
        var el = document.getElementById('mpCountdown');
        if (!el) return;
        el.textContent = seconds;
        el.style.display = 'flex';
        el.classList.remove('pulse');
        void el.offsetWidth;
        el.classList.add('pulse');

        if (seconds <= 0) {
            setTimeout(function() {
                el.textContent = 'GO!';
                setTimeout(function() {
                    el.style.display = 'none';
                }, 800);
            }, 100);
        }
    };

    // ─── Results Screen ─────────────────────────────────────
    LobbyUI.showResults = function(data) {
        var resultsHtml = '';
        var myResult = null;

        // Sort results by score descending (highest score first)
        var sortedResults = data.results.slice().sort(function(a, b) { return b.score - a.score; });

        // Ensure the highest scorer is marked as winner
        sortedResults.forEach(function(r, i) {
            r.isWinner = (i === 0);
        });

        var topScore = sortedResults[0] ? sortedResults[0].score : 0;
        var secondScore = sortedResults[1] ? sortedResults[1].score : 0;
        var scoreDiff = topScore - secondScore;

        sortedResults.forEach(function(r, i) {
            var isMe = r.playerId === MP.playerId;
            if (isMe) myResult = r;
            resultsHtml += '<div class="result-row' + (isMe ? ' me' : '') + (r.isWinner ? ' winner' : '') + '">';
            resultsHtml += '<span class="result-rank">#' + (i + 1) + '</span>';
            resultsHtml += '<span class="result-name">' + escapeHtml(r.name) + '</span>';
            resultsHtml += '<span class="result-score">' + r.score + '</span>';
            if (r.isWinner) resultsHtml += '<span class="result-badge">👑 WINNER</span>';
            resultsHtml += '</div>';
        });

        // Show score difference
        if (sortedResults.length >= 2 && scoreDiff > 0) {
            resultsHtml += '<div class="result-score-diff">Won by ' + scoreDiff + ' points</div>';
        } else if (sortedResults.length >= 2 && scoreDiff === 0) {
            resultsHtml += '<div class="result-score-diff">It\'s a tie!</div>';
        }

        $('#mpResultsList').html(resultsHtml);

        if (myResult && myResult.isWinner) {
            $('#mpResultTitle').text('🎉 VICTORY!').css('color', '#f1c40f');
            // Trigger celebration particles
            if (typeof Particles !== 'undefined' && typeof Particles.levelWin === 'function') {
                var cw = (typeof trueCanvas !== 'undefined') ? trueCanvas.width / 2 : window.innerWidth / 2;
                var ch = (typeof trueCanvas !== 'undefined') ? trueCanvas.height / 2 : window.innerHeight / 2;
                Particles.levelWin(cw, ch, ['#f1c40f', '#e67e22', '#2ecc71', '#3498db']);
            }
        } else {
            $('#mpResultTitle').text('DEFEAT').css('color', '#e74c3c');
        }

        LobbyUI.showScreen('mpResultsScreen');
    };

    // ─── Leaderboard Display ────────────────────────────────
    LobbyUI.updateLeaderboard = function(data) {
        var html = '';
        if (!data.entries || data.entries.length === 0) {
            html = '<div class="lb-empty">No entries yet. Be the first!</div>';
        } else {
            data.entries.forEach(function(entry, i) {
                var medal = '';
                if (i === 0) medal = '🥇';
                else if (i === 1) medal = '🥈';
                else if (i === 2) medal = '🥉';

                html += '<div class="lb-row">';
                html += '<span class="lb-rank">' + (medal || '#' + (i + 1)) + '</span>';
                html += '<span class="lb-name">' + escapeHtml(entry.name) + '</span>';
                html += '<span class="lb-score">' + entry.score + '</span>';
                html += '<span class="lb-mode">' + (entry.mode || '-') + '</span>';
                html += '</div>';
            });
        }
        $('#mpLeaderboardList').html(html);
    };

    // ─── Helper ─────────────────────────────────────────────
    function escapeHtml(str) {
        var div = document.createElement('div');
        div.textContent = str;
        return div.innerHTML;
    }

    // ─── MP Event Handlers (wire to MP callbacks) ───────────
    MP.onRoomCreated = function(data) {
        LobbyUI.showLobby();
    };

    MP.onRoomJoined = function(data) {
        // Name was already set during connection/page load — no need to re-emit setName
        LobbyUI.showLobby();
    };

    MP.onPlayerJoined = function(data) {
        LobbyUI.updateLobbyUI();
        LobbyUI.addChatMessage({
            playerId: 'system',
            name: 'System',
            message: data.name + ' joined the room'
        });
    };

    MP.onPlayerLeft = function(data) {
        LobbyUI.updateLobbyUI();
        LobbyUI.addChatMessage({
            playerId: 'system',
            name: 'System',
            message: data.name + ' left the room'
        });
    };

    MP.onRoomUpdate = function(data) {
        LobbyUI.updateLobbyUI();
    };

    MP.onMatchFound = function(data) {
        LobbyUI.showLobby();
    };

    MP.onCountdown = function(seconds) {
        LobbyUI.showCountdown(seconds);
    };

    MP.onGameStart = function(data) {
        LobbyUI.hideAllScreens(false); // Don't show startBtn during MP game
        LobbyUI.showCountdown(0); // "GO!"

        // Show opponent panel
        $('#opponentPanel').show();
        $('#canvas').addClass('mp-canvas');

        // Initialize opponent display
        var opponents = data.room.players.filter(function(p) { return p.id !== MP.playerId; });
        if (opponents.length > 0) {
            $('#opponentName').text(opponents[0].name);
            $('#opponentScore').text('0');
            LobbyUI.updateOpponentLives(data.settings.livesCount);
        }

        // Start the actual game
        MP.startSync();
        init(1);
    };

    MP.onOpponentState = function(data) {
        LobbyUI.updateOpponentPanel(data);

        // Update opponent mini-board rendering
        if (typeof BattleRender !== 'undefined') {
            BattleRender.updateOpponent(data.playerId, data);
        }
    };

    MP.onPenaltyIncoming = function(data) {
        // Penalties processed in game loop via MP.processPenalties()
    };

    MP.onPlayerOut = function(data) {
        LobbyUI.addChatMessage({
            playerId: 'system',
            name: 'System',
            message: data.name + ' has been eliminated!'
        });
    };

    MP.onGameEnd = function(data) {
        MP.stopSync();
        // Small delay before showing results
        setTimeout(function() {
            LobbyUI.showResults(data);
            // Hide game UI
            $('#opponentPanel').hide();
            $('#canvas').removeClass('mp-canvas');
        }, 1500);
    };

    MP.onChatMessage = function(data) {
        LobbyUI.addChatMessage(data);
    };

    MP.onLeaderboardData = function(data) {
        LobbyUI.updateLeaderboard(data);
    };

    MP.onProfileData = function(data) {
        if (data) {
            $('#mpProfileRating').text(data.rating || 1000);
            $('#mpProfileWins').text(data.wins || 0);
            $('#mpProfileLosses').text(data.losses || 0);
            $('#mpProfileBest').text(data.bestScore || 0);
        }
    };

    MP.onConnect = function() {
        $('#mpConnectionStatus').text('Connected').removeClass('disconnected').addClass('connected');
    };

    MP.onDisconnect = function() {
        $('#mpConnectionStatus').text('Disconnected').removeClass('connected').addClass('disconnected');
    };

    MP.onError = function(message) {
        // Show error toast
        var toast = $('<div class="mp-toast error">' + escapeHtml(message) + '</div>');
        $('body').append(toast);
        toast.fadeIn(200);
        setTimeout(function() {
            toast.fadeOut(300, function() { toast.remove(); });
        }, 3000);
    };

})();
