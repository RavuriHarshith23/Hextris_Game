// t: current time, b: begInnIng value, c: change In value, d: duration
function easeOutCubic(t, b, c, d) {
	return c * ((t = t / d - 1) * t * t + 1) + b;
}

function renderText(x, y, fontSize, color, text, font) {
	ctx.save();
	if (!font) {
		var font = 'px Exo';
	}

	fontSize *= settings.scale;
	ctx.font = fontSize + font;
	ctx.textAlign = 'center';
	ctx.fillStyle = color;
	ctx.fillText(text, x, y + (fontSize / 2) - 9 * settings.scale);
	ctx.restore();
}

function drawScoreboard() {
	if (scoreOpacity < 1) {
		scoreOpacity += 0.01;
		textOpacity += 0.01;
	}
	ctx.globalAlpha = textOpacity;
	var scoreSize = 50;
	var scoreString = String(score);
	if (scoreString.length == 6) {
		scoreSize = 43;
	} else if (scoreString.length == 7) {
		scoreSize = 35;
	} else if (scoreString.length == 8) {
		scoreSize = 31;
	} else if (scoreString.length == 9) {
		scoreSize = 27;
	}
	var color = "rgba(255, 255, 255, 0.95)";
    var fontSize = settings.platform == 'mobile' ? 35 : 30;
    var h = trueCanvas.height / 2 + gdy + 100 * settings.scale;
	if (gameState === 0) {
		renderText(trueCanvas.width / 2 + gdx + 6 * settings.scale, trueCanvas.height / 2 + gdy, 60, "rgba(255, 255, 255, 0.9)", String.fromCharCode("0xf04b"), 'px FontAwesome');
		renderText(trueCanvas.width / 2 + gdx + 6 * settings.scale, trueCanvas.height / 2.1 + gdy - 155 * settings.scale, 150, "rgba(255, 255, 255, 0.95)", "Hextris");
		renderText(trueCanvas.width / 2 + gdx + 5 * settings.scale, h + 10, fontSize, "rgba(255,255,255,0.6)", 'Play!');
	} else if (gameState != 0 && textOpacity > 0) {
		textOpacity -= 0.05;
		renderText(trueCanvas.width / 2 + gdx + 6 * settings.scale, trueCanvas.height / 2 + gdy, 60, "rgba(255, 255, 255, 0.9)", String.fromCharCode("0xf04b"), 'px FontAwesome');
		renderText(trueCanvas.width / 2 + gdx + 6 * settings.scale, trueCanvas.height / 2 + gdy - 155 * settings.scale, 150, "rgba(255, 255, 255, 0.95)", "Hextris");
		renderText(trueCanvas.width / 2 + gdx + 5 * settings.scale, h, fontSize, "rgba(255,255,255,0.6)", 'Play!');
		ctx.globalAlpha = scoreOpacity;
		renderText(trueCanvas.width / 2 + gdx, trueCanvas.height / 2 + gdy, scoreSize, color, score);
	} else {
		ctx.globalAlpha = scoreOpacity;
		renderText(trueCanvas.width / 2 + gdx, trueCanvas.height / 2 + gdy, scoreSize, color, score);
	}

	ctx.globalAlpha = 1;
}

function clearGameBoard() {
	var bgSides = (typeof MainHex !== 'undefined' && MainHex.sides) ? MainHex.sides : 6;
	drawPolygon(trueCanvas.width / 2, trueCanvas.height / 2, bgSides, trueCanvas.width / 2, 180 / bgSides, hexagonBackgroundColor, 0, 'rgba(0,0,0,0)');
}

function drawPolygon(x, y, sides, radius, theta, fillColor, lineWidth, lineColor) {
	ctx.fillStyle = fillColor;
	ctx.lineWidth = lineWidth;
	ctx.strokeStyle = lineColor;

	ctx.beginPath();
	var coords = rotatePoint(0, radius, theta);
	ctx.moveTo(coords.x + x, coords.y + y);
	var oldX = coords.x;
	var oldY = coords.y;
	for (var i = 0; i < sides; i++) {
		coords = rotatePoint(oldX, oldY, 360 / sides);
		ctx.lineTo(coords.x + x, coords.y + y);
		oldX = coords.x;
		oldY = coords.y;
	}

	ctx.closePath();
	ctx.fill();
	ctx.stroke();
	ctx.strokeStyle = 'rgba(0,0,0,0)';
}

function toggleClass(element, active) {
	if ($(element).hasClass(active)) {
		$(element).removeClass(active);
	} else {
		$(element).addClass(active);
	}
}

function showText(text) {
	var currentScore = (typeof score !== 'undefined') ? score : 0;
	var scoreDisplay = "<div class='pause-score-display'><span class='pause-score-label'>SCORE</span><span class='pause-score-value'>" + currentScore + "</span></div>";
	var livesLeft = (typeof lives !== 'undefined') ? lives : 0;
	var livesDisplay = '';
	for (var li = 0; li < 3; li++) {
		livesDisplay += '<span class="pause-heart' + (li < livesLeft ? '' : ' empty') + '">❤️</span>';
	}
	var statusBar = scoreDisplay + "<div class='pause-lives-display'>" + livesDisplay + "</div>";

	var messages = {
		'paused': "<div class='centeredHeader unselectable'>Game Paused</div>" + statusBar + "<div class='pause-menu-buttons'><button class='pause-btn pause-resume-btn' onclick='pause()'>▶ Resume</button><button class='pause-btn pause-quit-btn' onclick='quitToMenu()'>🏠 Quit to Menu</button></div>",
		'pausedAndroid': "<div class='centeredHeader unselectable'>Game Paused</div>" + statusBar + "<div class='pause-menu-buttons'><button class='pause-btn pause-resume-btn' onclick='pause()'>▶ Resume</button><button class='pause-btn pause-quit-btn' onclick='quitToMenu()'>🏠 Quit to Menu</button></div>",
		'pausediOS': "<div class='centeredHeader unselectable'>Game Paused</div>" + statusBar + "<div class='pause-menu-buttons'><button class='pause-btn pause-resume-btn' onclick='pause()'>▶ Resume</button><button class='pause-btn pause-quit-btn' onclick='quitToMenu()'>🏠 Quit to Menu</button></div>",
		'pausedOther': "<div class='centeredHeader unselectable'>Game Paused</div>" + statusBar + "<div class='unselectable centeredSubHeader'>Press Space or P to resume</div><div class='pause-menu-buttons'><button class='pause-btn pause-resume-btn' onclick='pause()'>▶ Resume</button><button class='pause-btn pause-quit-btn' onclick='quitToMenu()'>🏠 Quit to Menu</button></div>",
		'start': "<div class='centeredHeader unselectable' style='line-height:80px;'>Press enter to start</div>"
	};

	if (text == 'paused') {
		if (settings.os == 'android') {
			text = 'pausedAndroid'
		} else if (settings.os == 'ios') {
            text = 'pausediOS'
        } else if (settings.platform == 'nonmobile') {
            text = 'pausedOther'
        }
	}

	if (text == 'gameover') {
	   //Clay('client.share.any', {text: 'Think you can beat my score of '+ score + ' in Super Cool Game?'})
		$("#gameoverscreen").fadeIn();
    	}
	$(".overlay").html(messages[text]);
	$(".overlay").fadeIn("1000", "swing");

}

function setMainMenu() {
	gameState = 4;
	canRestart = false;
	setTimeout(function() {
		canRestart = 's';
	}, 500);
	$('#restartBtn').hide();
	if ($("#pauseBtn").replace(/^.*[\\\/]/, '') == "btn_pause.svg") {
		$("#pauseBtn").attr("src","./images/btn_resume.svg");
	} else {
		$("#pauseBtn").attr("src","./images/btn_pause.svg");
	}
}

function hideText() {
	$(".overlay").fadeOut(150, function() {
		$(".overlay").html("");
	})
}

function gameOverDisplay() {
	settings.ending_block=false;
	Cookies.set("visited",true);
	var c = document.getElementById("canvas");
	c.className = "blur";
	updateHighScores();
	if (highscores.length === 0 ){
		$("#currentHighScore").text(0);
	}
	else {
		$("#currentHighScore").text(highscores[0])
	}
	// Hide HUD elements
	$('#livesDisplay').removeClass('visible');
	$('#highScoreInGameText').removeClass('visible');
	
	// In multiplayer, don't show standard game over - results screen handles it
	if (typeof MP !== 'undefined' && MP.isMultiplayer) {
		// MP results handled by lobby-ui.js onGameEnd callback
		return;
	}

	$("#gameoverscreen").fadeIn(300);
	$("#buttonCont").fadeIn(300);
	$("#container").fadeIn(300);
	$("#restart").fadeIn(300);
}

function updateHighScores (){
    $("#cScore").text(score);
    $("#1place").text(highscores[0]);
    $("#2place").text(highscores[1]);
    $("#3place").text(highscores[2]);
}

var pausable = true;
function quitToMenu() {
    // Quit current game and go back to main menu
    pausable = true;
    gameState = 2;
    hideText();
    clearSaveState();
    
    // Stop multiplayer sync
    if (typeof MP !== 'undefined' && MP.isMultiplayer) {
        MP.leaveRoom();
        if (typeof AIOpponent !== 'undefined') AIOpponent.stop();
    }
    // Stop timer mode
    if (typeof GameModes !== 'undefined' && GameModes.getActiveMode()) {
        GameModes.clear();
    }
    // Stop level mode
    if (typeof GameLevels !== 'undefined') GameLevels.clearActive();
    
    // Hide all overlays and game elements
    $('#overlay').fadeOut(200);
    $('#gameoverscreen').fadeOut(200);
    $('#opponentPanel').hide();
    $('#canvas').removeClass('mp-canvas');
    $('#pauseBtn').hide();
    $('#restartBtn').hide();
    $('#livesDisplay').removeClass('visible');
    $('#highScoreInGameText').removeClass('visible');
    $('#levelDisplay').removeClass('visible');
    $('#powerUpBar').removeClass('visible');
    document.getElementById('canvas').className = '';
    
    window.gameMode = null;
    MP.isMultiplayer = false;
    MP.mode = null;
    
    // Show main menu
    setTimeout(function() {
        if (typeof LobbyUI !== 'undefined') {
            LobbyUI.showMainMenu();
        }
    }, 250);
}

function pause(o) {
    if (gameState == 0 || gameState == 2 || !pausable) {
        return;
    }

	pausable = false;
	writeHighScores();
	var message;
	if (o) {
		message = '';
	} else {
		message = 'paused';
	}

	var c = document.getElementById("canvas");
	if (gameState == -1) {
		$('#fork-ribbon').fadeOut(300, 'linear');
		$('#restartBtn').fadeOut(300, "linear");
		$('#buttonCont').fadeOut(300, "linear");
		if ($('#helpScreen').is(':visible')) {
			$('#helpScreen').fadeOut(300, "linear");
		}

		$("#pauseBtn").attr("src", "./images/btn_pause.svg");
		$('.helpText').fadeOut(300, 'linear');
		$('#overlay').fadeOut(300, 'linear');
		hideText();
		setTimeout(function() {
			gameState = prevGameState;
			pausable =true;
		}, 400);
	} else if (gameState != -2 && gameState !== 0 && gameState !== 2) {
		$('#restartBtn').fadeIn(300, "linear");
		$('#buttonCont').fadeIn(300, "linear");
		$('.helpText').fadeIn(300, 'linear');
		if (message == 'paused') {
			showText(message);
		}
		$('#fork-ribbon').fadeIn(300, 'linear');
		$("#pauseBtn").attr("src","./images/btn_resume.svg");
		$('#overlay').fadeIn(300, 'linear');
		prevGameState = gameState;
		setTimeout(function() {
		    pausable = true;
		}, 400);
		gameState = -1;
	}
}
