function scaleCanvas() {
	canvas.width = $(window).width();
	canvas.height = $(window).height();

	if (canvas.height > canvas.width) {
		settings.scale = (canvas.width / 800) * settings.baseScale;
	} else {
		settings.scale = (canvas.height / 800) * settings.baseScale;
	}

	trueCanvas = {
		width: canvas.width,
		height: canvas.height
	};

	if (window.devicePixelRatio) {
		var cw = $("#canvas").attr('width');
		var ch = $("#canvas").attr('height');

		$("#canvas").attr('width', cw * window.devicePixelRatio);
		$("#canvas").attr('height', ch * window.devicePixelRatio);
		$("#canvas").css('width', cw);
		$("#canvas").css('height', ch);

		trueCanvas = {
			width: cw,
			height: ch
		};

		ctx.scale(window.devicePixelRatio, window.devicePixelRatio);
	}
    // Layout adjusted for new UI - no-ops kept for compatibility
    if (typeof setBottomContainer === 'function') setBottomContainer();
    if (typeof set_score_pos === 'function') set_score_pos();
}

function setBottomContainer() {
    // No-op: old game over layout positioning no longer needed
}

function set_score_pos() {
    // No-op: old score positioning no longer needed
}

function toggleDevTools() {
	$('#devtools').toggle();
}

function resumeGame() {
	gameState = 1;
	hideUIElements();
	$('#pauseBtn').show();
	$('#restartBtn').hide();
	$('#livesDisplay').addClass('visible');
	$('#highScoreInGameText').addClass('visible');
	importing = 0;
	startTime = Date.now();
	setTimeout(function() {
		if ((gameState == 1 || gameState == 2) && !$('#helpScreen').is(':visible')) {
			$('#openSideBar').fadeOut(150, "linear");
		}
	}, 7000);

	checkVisualElements(0);
}

function checkVisualElements(arg) {
	if (arg && $('#openSideBar').is(":visible")) $('#openSideBar').fadeOut(150, "linear");
	if (!$('#pauseBtn').is(':visible')) $('#pauseBtn').fadeIn(150, "linear");
	$('#fork-ribbon').fadeOut(150);
	if (!$('#restartBtn').is(':visible')) $('#restartBtn').fadeOut(150, "linear");
	if ($('#buttonCont').is(':visible')) $('#buttonCont').fadeOut(150, "linear");
}

function hideUIElements() {
	$('#pauseBtn').hide();
	$('#restartBtn').hide();
	$('#startBtn').hide();
	$('#livesDisplay').removeClass('visible');
	$('#highScoreInGameText').removeClass('visible');
	$('#levelDisplay').removeClass('visible');
	$('#powerUpBar').removeClass('visible');
}

function init(b) {
	if(settings.ending_block && b == 1){return;}

	// Apply game config before starting
	if (typeof GameConfig !== 'undefined') {
		GameConfig.apply();
	}

	if (b) {
		$("#pauseBtn").attr('src',"./images/btn_pause.svg");
		if ($('#helpScreen').is(":visible")) {
			$('#helpScreen').fadeOut(150, "linear");
		}

		setTimeout(function() {
            if (gameState == 1) {
			    $('#openSideBar').fadeOut(150, "linear");
            }
			infobuttonfading = false;
		}, 7000);
		clearSaveState();
		checkVisualElements(1);
	}
	if (highscores.length === 0 ){
		$("#currentHighScore").text(0);
	}
	else {
		$("#currentHighScore").text(highscores[0])
	}
	infobuttonfading = true;
	$("#pauseBtn").attr('src',"./images/btn_pause.svg");
	hideUIElements();

	// Show lives display (always visible during gameplay)
	$('#livesDisplay').addClass('visible');
	$('#highScoreInGameText').addClass('visible');

	// Show level display and power-up bar if enabled
	if (typeof GameLevels !== 'undefined' && GameLevels.getActiveLevel()) {
		$('#levelDisplay').addClass('visible');
	}
	if (typeof GameConfig !== 'undefined' && GameConfig.get('enablePowerUps')) {
		$('#powerUpBar').addClass('visible');
	}
	var saveState = localStorage.getItem("saveState") || "{}";
	saveState = JSONfn.parse(saveState);
	document.getElementById("canvas").className = "";
	history = {};
	importedHistory = undefined;
	importing = 0;
	score = (b ? 0 : (saveState.score || 0));
	prevScore = 0;
	spawnLane = 0;
	op = 0;
	tweetblock=false;
	scoreOpacity = 0;
	gameState = 1;
	$("#restartBtn").hide();
	$("#pauseBtn").show();
	if (saveState.hex !== undefined) gameState = 1;

	// Track game start for stats
	if (typeof GameStats !== 'undefined') GameStats.onGameStart();
	// Clear particles
	if (typeof Particles !== 'undefined') Particles.clear();
	// Reset power-up milestone tracker
	if (typeof PowerUps !== 'undefined' && typeof PowerUps.resetMilestones === 'function') PowerUps.resetMilestones();
	// Reset coin score milestone tracker
	if (typeof CoinShop !== 'undefined' && typeof CoinShop.resetScoreMilestone === 'function') CoinShop.resetScoreMilestone();

	settings.blockHeight = settings.baseBlockHeight * settings.scale;
	settings.hexWidth = settings.baseHexWidth * settings.scale;
	MainHex = saveState.hex || new Hex(settings.hexWidth);
	if (saveState.hex) {
		MainHex.playThrough += 1;
	}
	MainHex.sideLength = settings.hexWidth;

	var i;
	var block;
	if (saveState.blocks) {
		saveState.blocks.map(function(o) {
			if (rgbToHex[o.color]) {
				o.color = rgbToHex[o.color];
			}
		});

		for (i = 0; i < saveState.blocks.length; i++) {
			block = saveState.blocks[i];
			blocks.push(block);
		}
	} else {
		blocks = [];
	}

	gdx = saveState.gdx || 0;
	gdy = saveState.gdy || 0;
	comboTime = saveState.comboTime || 0;

	// Reset lives: cancel stale timeouts, set from save or default, update UI
	for (var t = 0; t < _heartTimeouts.length; t++) {
		clearTimeout(_heartTimeouts[t]);
	}
	_heartTimeouts = [];
	var configLives = (typeof GameConfig !== 'undefined') ? GameConfig.get('livesCount') : 3;
	lives = saveState.lives || configLives;
	updateLivesDisplay();

	// Reset levels and powerups
	if (typeof GameLevels !== 'undefined') GameLevels.reset();
	if (typeof PowerUps !== 'undefined') PowerUps.reset();
	spd = 1;

	for (i = 0; i < MainHex.blocks.length; i++) {
		for (var j = 0; j < MainHex.blocks[i].length; j++) {
			MainHex.blocks[i][j].height = settings.blockHeight;
			MainHex.blocks[i][j].settled = 0;
		}
	}

	MainHex.blocks.map(function(i) {
		i.map(function(o) {
			if (rgbToHex[o.color]) {
				o.color = rgbToHex[o.color];
			}
		});
	});

	MainHex.y = -100;

	startTime = Date.now();
	waveone = saveState.wavegen || new waveGen(MainHex);

	MainHex.texts = []; //clear texts
	MainHex.delay = 15;
	hideText();
}

function addNewBlock(blocklane, color, iter, distFromHex, settled) { //last two are optional parameters
	iter *= settings.speedModifier;
	if (!history[MainHex.ct]) {
		history[MainHex.ct] = {};
	}

	history[MainHex.ct].block = {
		blocklane: blocklane,
		color: color,
		iter: iter
	};

	if (distFromHex) {
		history[MainHex.ct].distFromHex = distFromHex;
	}
	if (settled) {
		blockHist[MainHex.ct].settled = settled;
	}
	blocks.push(new Block(blocklane, color, iter, distFromHex, settled));
}

function exportHistory() {
	$('#devtoolsText').html(JSON.stringify(history));
	toggleDevTools();
}

function setStartScreen() {
	$('#startBtn').show();
	init();
	if (isStateSaved()) {
		importing = 0;
	} else {
		importing = 1;
	}

	$('#pauseBtn').hide();
	$('#restartBtn').hide();
	$('#startBtn').show();

	// Hide in-game HUD elements
	$('#levelDisplay').removeClass('visible');
	$('#powerUpBar').removeClass('visible');

	// Start battle renderer if in multiplayer
	if (typeof MP !== 'undefined' && MP.isMultiplayer && typeof BattleRender !== 'undefined') {
		BattleRender.start();
	}

	gameState = 0;
	requestAnimFrame(animLoop);
}

var spd = 1;

function animLoop() {
	switch (gameState) {
	case 1:
		requestAnimFrame(animLoop);
		render();
		var now = Date.now();
		var dt = (now - lastTime)/16.666 * rush;
		if (spd > 1) {
			dt *= spd;
		}

		if(gameState == 1 ){
			if(!MainHex.delay) {
				update(dt);
				// Process incoming penalty blocks from opponents
				if (typeof MP !== 'undefined') {
					MP.processPenalties();
				}
				// Update level system
				if (typeof GameLevels !== 'undefined' && GameLevels.getActiveLevel()) {
					GameLevels.updateHUD(score);
					// Win condition: score reached target
					var _lvl = GameLevels.getActiveLevel();
					if (_lvl && score >= _lvl.target && gameState === 1) {
						gameState = 2;
						clearSaveState();
						if ($('#pauseBtn').is(':visible')) $('#pauseBtn').fadeOut(150);
						setTimeout(function() {
							GameLevels.showLevelResults(score);
						}, 600);
					}
				}

				// Daily challenge win condition
				if (window.gameMode === 'daily' && window.dailyTargetScore && score >= window.dailyTargetScore && gameState === 1) {
					gameState = 2;
					clearSaveState();
					if ($('#pauseBtn').is(':visible')) $('#pauseBtn').fadeOut(150);
					if (typeof DailyChallenge !== 'undefined') DailyChallenge.recordScore(score);
					if (typeof GameStats !== 'undefined') GameStats.onGameEnd(score);
					if (typeof Particles !== 'undefined') {
						Particles.levelWin(trueCanvas.width / 2, trueCanvas.height / 2, window.colors || ['#f1c40f']);
					}
					setTimeout(function() {
						swal({
							title: '🎉 Daily Challenge Complete!',
							text: 'Score: ' + score + ' / ' + window.dailyTargetScore,
							type: 'success',
							confirmButtonText: 'Back to Menu'
						}, function() {
							window.gameMode = null;
							window.dailyTargetScore = null;
							if (typeof LobbyUI !== 'undefined') LobbyUI.showMainMenu();
						});
					}, 800);
				}

				// Update music intensity based on score
				if (typeof GameMusic !== 'undefined' && score !== undefined) {
					var intensity = Math.min(1, score / 2000);
					GameMusic.setIntensity(intensity);
				}
				// Check score milestone for power-up rewards
				if (typeof PowerUps !== 'undefined' && typeof PowerUps.checkScoreMilestone === 'function') {
					PowerUps.checkScoreMilestone(score);
				}
				// Check coin rewards from score
				if (typeof CoinShop !== 'undefined' && typeof CoinShop.checkScoreReward === 'function') {
					CoinShop.checkScoreReward(score);
				}
				// Update game modes
				if (typeof GameModes !== 'undefined' && GameModes.getActiveMode()) {
					GameModes.update(score);
				}
			}
			else{
				MainHex.delay--;
			}
		}

		lastTime = now;

		if (checkGameOver() && !importing) {
			var saveState = localStorage.getItem("saveState") || "{}";
			saveState = JSONfn.parse(saveState);
			gameState = 2;

			setTimeout(function() {
				enableRestart();
			}, 150);

			if ($('#helpScreen').is(':visible')) {
				$('#helpScreen').fadeOut(150, "linear");
			}

			if ($('#pauseBtn').is(':visible')) $('#pauseBtn').fadeOut(150, "linear");
			if ($('#restartBtn').is(':visible')) $('#restartBtn').fadeOut(150, "linear");
			if ($('#openSideBar').is(':visible')) $('.openSideBar').fadeOut(150, "linear");

			canRestart = 0;
			clearSaveState();
		}
		break;

	case 0:
		requestAnimFrame(animLoop);
		render();
		break;

	case -1:
		requestAnimFrame(animLoop);
		render();
		break;

	case 2:
		var now = Date.now();
		var dt = (now - lastTime)/16.666 * rush;
		requestAnimFrame(animLoop);
		update(dt);
		render();
		lastTime = now;
		break;

	case 3:
		requestAnimFrame(animLoop);
		fadeOutObjectsOnScreen();
		render();
		break;

	case 4:
		setTimeout(function() {
			initialize(1);
		}, 1);
		render();
		return;

	default:
		initialize();
		setStartScreen();
		break;
	}

	if (!(gameState == 1 || gameState == 2)) {
		lastTime = Date.now();
	}
}

function enableRestart() {
	canRestart = 1;
}

function isInfringing(hex) {
	for (var i = 0; i < hex.sides; i++) {
		var subTotal = 0;
		for (var j = 0; j < hex.blocks[i].length; j++) {
			subTotal += hex.blocks[i][j].deleted;
		}

		if (hex.blocks[i].length - subTotal > settings.rows) {
			return true;
		}
	}
	return false;
}

function checkGameOver() {
	if (isInfringing(MainHex)) {
		// Check if shield absorbs the overflow
		if (typeof PowerUps !== 'undefined' && PowerUps.tryShield && PowerUps.tryShield()) {
			clearInfringingBlocks(MainHex);
			return false;
		}

		lives--;
		updateLivesDisplay();
		
		if (lives <= 0) {
			// True game over
			$.get('http://54.183.184.126/' + String(score))
			if (highscores.indexOf(score) == -1) {
				highscores.push(score);
			}
			writeHighScores();

			// Track game end for stats
			if (typeof GameStats !== 'undefined') GameStats.onGameEnd(score);

			// Record daily challenge attempt
			if (window.gameMode === 'daily' && typeof DailyChallenge !== 'undefined') {
				DailyChallenge.recordScore(score);
			}

			// Report elimination to multiplayer server
			if (typeof MP !== 'undefined' && MP.isMultiplayer) {
				MP.reportElimination();
				MP.stopSync();
			}

			// Handle AI battle game over (player died)
			if (typeof MP !== 'undefined' && MP.mode === 'ai_battle') {
				if (typeof AIOpponent !== 'undefined') AIOpponent.stop();
				var playerScore = score || 0;
				var aiState = AIOpponent.getState ? AIOpponent.getState() : { score: 0 };
				var aiScore = aiState.score || 0;
				var playerWins = playerScore >= aiScore;
				
				var results = {
					results: [
						{ playerId: playerWins ? MP.playerId : 'ai', name: playerWins ? MP.playerName : 'AI Bot', score: playerWins ? playerScore : aiScore, isWinner: true },
						{ playerId: playerWins ? 'ai' : MP.playerId, name: playerWins ? 'AI Bot' : MP.playerName, score: playerWins ? aiScore : playerScore, isWinner: false }
					],
					winnerId: playerWins ? MP.playerId : 'ai',
					winnerName: playerWins ? MP.playerName : 'AI Bot'
				};
				gameOverDisplay();
				setTimeout(function() {
					if (typeof LobbyUI !== 'undefined') LobbyUI.showResults(results);
				}, 800);
				return true;
			}

			// Submit to leaderboard
			if (typeof Leaderboard !== 'undefined') {
				var mode = (typeof MP !== 'undefined' && MP.mode) ? MP.mode : 'single';
				var name = (typeof MP !== 'undefined' && MP.playerName) ? MP.playerName : 'Player';
				Leaderboard.submitScore(name, score, mode);
			}

			// Check if a game mode handles the game-over display
			if (typeof GameModes !== 'undefined' && GameModes.getActiveMode()) {
				if (GameModes.onGameOver(score)) {
					gameOverDisplay();
					return true;
				}
			}

			// If in level mode, show level results instead of standard game over
			if (typeof GameLevels !== 'undefined' && GameLevels.getActiveLevel()) {
				gameOverDisplay();
				setTimeout(function() {
					GameLevels.showLevelResults(score);
				}, 800);
				return true;
			}

			gameOverDisplay();
			return true;
		} else {
			// Life lost but continue playing
			showLifeLostEffect();
			clearInfringingBlocks(MainHex);
			return false;
		}
	}
	return false;
}

function clearInfringingBlocks(hex) {
	for (var i = 0; i < hex.sides; i++) {
		var subTotal = 0;
		for (var j = 0; j < hex.blocks[i].length; j++) {
			subTotal += hex.blocks[i][j].deleted;
		}
		if (hex.blocks[i].length - subTotal > settings.rows) {
			// Remove blocks from this side starting from top
			while (hex.blocks[i].length > Math.max(settings.rows - 2, 0)) {
				hex.blocks[i].pop();
			}
			// Resettle remaining blocks
			for (var j = 0; j < hex.blocks[i].length; j++) {
				hex.blocks[i][j].settled = 0;
			}
		}
	}
}

function showLifeLostEffect() {
	// Flash overlay
	var overlay = document.getElementById('lifeLostOverlay');
	overlay.classList.remove('flash');
	void overlay.offsetWidth; // Force reflow
	overlay.classList.add('flash');
	
	// Show text
	var text = document.getElementById('lifeLostText');
	text.textContent = lives + (lives === 1 ? ' LIFE LEFT!' : ' LIVES LEFT!');
	text.classList.remove('show');
	void text.offsetWidth;
	text.classList.add('show');
	
	// Shake effect
	for (var i = 0; i < MainHex.sides; i++) {
		MainHex.shakes.push({lane: i, magnitude: 8 * (window.devicePixelRatio ? window.devicePixelRatio : 1) * settings.scale});
	}

	// Particle burst
	if (typeof Particles !== 'undefined') {
		Particles.lifeLostBurst(trueCanvas.width / 2, trueCanvas.height / 2);
	}
	
	setTimeout(function() {
		overlay.classList.remove('flash');
		text.classList.remove('show');
	}, 1200);
}

var _heartTimeouts = [];

function updateLivesDisplay() {
	var hearts = document.querySelectorAll('#livesDisplay .heart');
	for (var i = 0; i < hearts.length; i++) {
		if (i < lives) {
			hearts[i].classList.remove('lost', 'empty');
		} else {
			if (!hearts[i].classList.contains('empty')) {
				hearts[i].classList.add('lost');
				_heartTimeouts.push(setTimeout((function(h) {
					return function() { h.classList.add('empty'); };
				})(hearts[i]), 600));
			}
		}
	}
}

function resetLivesDisplay() {
	// Cancel any pending heart timeouts from previous game
	for (var t = 0; t < _heartTimeouts.length; t++) {
		clearTimeout(_heartTimeouts[t]);
	}
	_heartTimeouts = [];

	lives = 3;
	var hearts = document.querySelectorAll('#livesDisplay .heart');
	for (var i = 0; i < hearts.length; i++) {
		hearts[i].classList.remove('lost', 'empty');
	}
}

function showHelp() {
	if ($('#openSideBar').attr('src') == './images/btn_back.svg') {
		$('#openSideBar').attr('src', './images/btn_help.svg');
		if (gameState != 0 && gameState != -1 && gameState != 2) {
			$('#fork-ribbon').fadeOut(150, 'linear');
		}
	} else {
		$('#openSideBar').attr('src', './images/btn_back.svg');
		if (gameState == 0 && gameState == -1 && gameState == 2) {
			$('#fork-ribbon').fadeIn(150, 'linear');
		}
	}

	$("#inst_main_body").html("<div id = 'instructions_head'>HOW TO PLAY</div><p>The goal of Hextris is to stop blocks from leaving the inside of the outer hexagon.</p><p>" + (settings.platform != 'mobile' ? 'Press the right and left arrow keys' : 'Tap the left and right sides of the screen') + " to rotate the Hexagon." + (settings.platform != 'mobile' ? ' Press the down arrow to speed up the block falling': '') + " </p><p>Clear blocks and get points by making 3 or more blocks of the same color touch.</p><p>You have <strong>3 lives</strong> &#10084;&#65039; — losing a life clears the overflowing blocks. Game ends when all lives are lost!</p><p>Time left before your combo streak disappears is indicated by <span style='color:#f1c40f;'>the</span> <span style='color:#e74c3c'>colored</span> <span style='color:#3498db'>lines</span> <span style='color:#2ecc71'>on</span> the outer hexagon.</p> <hr> <p id = 'afterhr'></p> By <a href='http://loganengstrom.com' target='_blank'>Logan Engstrom</a> & <a href='http://github.com/garrettdreyfus' target='_blank'>Garrett Finucane</a>");
	if (gameState == 1) {
		pause();
	}

	if($("#pauseBtn").attr('src') == "./images/btn_pause.svg" && gameState != 0 && !infobuttonfading) {
		return;
	}

	$("#openSideBar").fadeIn(150,"linear");
	$('#helpScreen').fadeToggle(150, "linear");
}
