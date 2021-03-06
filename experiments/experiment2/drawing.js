var percentColors = [
  //    { pct: 0.0, color: { r: 0xff, g: 0x00, b: 0 } },
  { pct: 0.0, color: { r: 0xff, g: 0xff, b: 0xff } },
  { pct: 1.0, color: { r: 0x00, g: 0xff, b: 0 } } ];

var getColorForPercentage = function(pct) {
  if(pct == 0) {
    return 'red';
  } else {
    for (var i = 0; i < percentColors.length; i++) {
      if (pct <= percentColors[i].pct) {
	var lower = (percentColors[i - 1]
		     || { pct: 0.2, color: { r: 0x0, g: 0x00, b: 0 } });
	var upper = percentColors[i];
	var range = upper.pct - lower.pct;
	var rangePct = (pct - lower.pct) / range;
	var pctLower = 1 - rangePct;
	var pctUpper = rangePct;
	var color = {
          r: Math.floor(lower.color.r * pctLower + upper.color.r * pctUpper),
          g: Math.floor(lower.color.g * pctLower + upper.color.g * pctUpper),
          b: Math.floor(lower.color.b * pctLower + upper.color.b * pctUpper)
	};
	return 'rgb(' + [color.r, color.g, color.b].join(',') + ')';
      }
    }
  }
}

function getHatchPattern() {
  var p = document.createElement("canvas");
  p.width=16;
  p.height=16;
  var pctx=p.getContext('2d');
  var x0=17;
  var y0=-1;
  var x1=-1;
  var y1=17;
  var offset=16;
  pctx.fillStyle = "#383838";
  pctx.fillRect(0,0,16,16);
  pctx.strokeStyle = "red";
  pctx.lineWidth=2;
  pctx.beginPath();
  pctx.moveTo(x0,y0);
  pctx.lineTo(x1,y1);
  pctx.moveTo(x0-offset,y0);
  pctx.lineTo(x1-offset,y1);
  pctx.moveTo(x0+offset,y0);
  pctx.lineTo(x1+offset,y1);
  pctx.stroke();

  return p;
};

var GOODCOLOR = getColorForPercentage(1.0);  
var NEUTRALCOLOR = 'white';//getColorForPercentage(0.2);
var BADCOLOR = "red";

// Draw players as triangles using HTML5 canvas
function drawPlayer(game, player){
  // Draw avatar as triangle
  var v = [[0,-player.size.x],
	   [-player.size.hx,player.size.y],
	   [player.size.hy,player.size.x]];
  game.ctx.save();
  game.ctx.translate(player.pos.x, player.pos.y);
  game.ctx.rotate((player.angle * Math.PI) / 180);

  // This draws the triangle
  game.ctx.fillStyle = player.color;
  game.ctx.strokeStyle = player.color;
  game.ctx.beginPath();
  game.ctx.moveTo(v[0][0],v[0][1]);
  game.ctx.lineTo(v[1][0],v[1][1]);
  game.ctx.lineTo(v[2][0],v[2][1]);
  game.ctx.closePath();
  game.ctx.stroke();
  game.ctx.fill();

  game.ctx.beginPath();
  game.ctx.restore();

};

function drawMessage(game, player){
  // Draw message in center (for countdown, e.g.)
  game.ctx.font = "bold 12pt Helvetica";
  game.ctx.fillStyle = 'yellow';
  game.ctx.textAlign = 'center';
  game.ctx.fillText(player.message, game.world.width/2, game.world.height/5);
  game.ctx.fillStyle = 'red';
  game.ctx.fillText(player.warning, game.world.width/2, game.world.height/2 - 20);
  
}; 

function drawLabel(game, player, label) {
  game.ctx.font = "8pt Helvetica";
  game.ctx.fillStyle = 'white';
  game.ctx.fillText(label, player.pos.x+10, player.pos.y + 20); 
}

function drawDestination(game, player) {
  var xCoord = parseFloat(player.destination.x);
  var yCoord = parseFloat(player.destination.y);
  game.ctx.save();
  game.ctx.globalAlpha = game.remainingFadeSteps/game.numFadeSteps;
  game.ctx.strokeStyle = player.color;
  game.ctx.beginPath();
  game.ctx.moveTo(xCoord - 5, yCoord- 5);
  game.ctx.lineTo(xCoord + 5, yCoord + 5);

  game.ctx.moveTo(xCoord + 5, yCoord - 5);
  game.ctx.lineTo(xCoord - 5, yCoord + 5);
  game.ctx.stroke();
  game.ctx.restore();
  if(game.remainingFadeSteps > 0) { // stop if done
    game.remainingFadeSteps--;
  }
};

function drawSpotlight(game, centerX, centerY) {
  // Draw spotlight
  var radius = 50;
  if(centerX && centerY) {
    game.ctx.save();
    game.ctx.beginPath();
    game.ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI, false);
    game.ctx.fillStyle = GOODCOLOR;
    game.ctx.fill();
    game.ctx.restore();
  }
}

function drawScoreField(game){
  // Only draw the one in your condition...
  console.log(game.condition);
  var loc = (game.condition === 'spot' ?
	     game.trialInfo.spotScoreLoc :
	     game.trialInfo.wallScoreLoc);

  drawSpotlight(game, loc.x, loc.y);  
};

var getMessage = function(roundNum, exploitMechanism) {
  var message = "";
  if(roundNum == -1) {
    message += "In the first round, the score field " +
      "that determines your reward will be visible. ";
  } else if(roundNum == 0) {
    message += "In the next round, the score field " +
      "that determines your reward will be hidden. ";
  } else if(roundNum == 1) {
    message += "In the next round, the score field will be visible again.";
  } else if(roundNum == 2) {
    message += "In the next round, the score field will be hidden again.";
  } else if(roundNum == 3) {
    message += "In the next rounds, the score field will be hidden " +
      "and you may participate with other players.";
  } else if(roundNum > 3) {
    message += "Click 'Ready' to begin the next round";
  };
  return message;
};

var drawInstructions = function(game, player) {
  var message = getMessage(game.roundNum, game.exploitMechanism);
  game.ctx.save();
  game.ctx.clearRect(0,0,485,280);
  game.ctx.font = "10pt Helvetica";
  game.ctx.fillStyle = 'white';
  game.ctx.textAlign = 'center';
  wrapText(game, message, 
           game.world.width/2, game.world.height/4,
           game.world.width*4/5,
           25);
  game.ctx.restore();
  drawButton(game);
};

var drawButton = function (game, player){
  var but = game.advanceButton;
  game.ctx.save();
  game.ctx.fillStyle = '#61e6ff';
  game.ctx.fillRect(but.trueX, but.trueY, but.width, but.height);
  game.ctx.strokeStyle = "#000000";
  game.ctx.lineWidth=4;
  game.ctx.strokeRect(but.trueX, but.trueY, but.width, but.height);
  game.ctx.fillStyle = '#000000';
  game.ctx.textBaseline = 'middle';
  game.ctx.fillText("Ready", but.trueX + but.width/2, but.trueY + but.height/2);
  game.ctx.restore();
};

var addSkipButton = function (game){
  var button = document.createElement("input");
  button.value = "Skip";
  button.onclick = function() {
    game.socket.send("skip");
  };
  var instructionDiv = document.getElementById("instructions");
  instructionDiv.appendChild(button);
};

function wrapText(game, text, x, y, maxWidth, lineHeight) {
  var cars = text.split("\n");

  for (var ii = 0; ii < cars.length; ii++) {

    var line = "";
    var words = cars[ii].split(" ");

    for (var n = 0; n < words.length; n++) {
      var testLine = line + words[n] + " ";
      var metrics = game.ctx.measureText(testLine);
      var testWidth = metrics.width;

      if (testWidth > maxWidth) {
        game.ctx.fillText(line, x, y);
        line = words[n] + " ";
        y += lineHeight;
      }
      else {
        line = testLine;
      }
    }
    game.ctx.fillText(line, x, y);
    y += lineHeight;
  }
}

// Make sparkles (https://codepen.io/jackrugile/pen/Gving)
/* super inefficient right now, could be improved */

var rand = function(a,b){return ~~((Math.random()*(b-a+1))+a);};
var dToR = function(degrees){
  return degrees * (Math.PI / 180);
};
var particleMax = 100;

function drawSparkles(game, player) {
  if(!game.circle) {
    game.particles = [];
    game.circle = {
      x: player.pos.x,
      y: player.pos.y,
      radius: player.size.x * 3,
      speed: 45,
      rotation: 0,
      angleStart: 270,
      angleEnd: 90,
      hue: 60,
      thickness: 5,
      blur: 25
    };    
  }
  game.circle.x = player.pos.x;
  game.circle.y = player.pos.y;

  var ctx = game.ctx;
  ctx.save();
  var updateCircle = function(){
    console.log("updating circle...");
    console.log(game.circle.rotation);
    if(game.circle.rotation < 360){
      game.circle.rotation += game.circle.speed;
    } else {
      game.circle.rotation = (game.circle.rotation + game.circle.speed) % 360;
    }
  };
  var renderCircle = function(){
    ctx.save();
    ctx.translate(game.circle.x, game.circle.y);
    ctx.rotate(dToR(game.circle.rotation));
    ctx.beginPath();
    ctx.arc(0, 0, game.circle.radius,
	    dToR(game.circle.angleStart), dToR(game.circle.angleEnd), true);
    ctx.lineWidth = game.circle.thickness;
    ctx.strokeStyle = gradient1;
    ctx.stroke();
    ctx.restore();
  };
  var renderCircleBorder = function(){
    ctx.save();
    ctx.translate(game.circle.x, game.circle.y);
    ctx.rotate(dToR(game.circle.rotation));
    ctx.beginPath();
    ctx.arc(0, 0, game.circle.radius + (game.circle.thickness/2),
	    dToR(game.circle.angleStart), dToR(game.circle.angleEnd), true);
    ctx.lineWidth = 2;
    ctx.strokeStyle = gradient2;
    ctx.stroke();
    ctx.restore();
  };
  var createParticles = function(){
    if(game.particles.length < particleMax){
      game.particles.push({
	x: (game.circle.x + game.circle.radius * Math.cos(dToR(game.circle.rotation-85))) +
	  (rand(0, game.circle.thickness*2) - game.circle.thickness),
	y: (game.circle.y + game.circle.radius * Math.sin(dToR(game.circle.rotation-85))) +
	  (rand(0, game.circle.thickness*2) - game.circle.thickness),
	vx: (rand(0, 100)-50)/1000,
	vy: (rand(0, 100)-50)/1000,
	radius: rand(1, 3)/2,
	alpha: rand(10, 20)/100
      });
    }
  };
  var updateParticles = function(){
    var i = game.particles.length;
    while(i--){
      var p = game.particles[i];
      p.vx += (rand(0, 100)-50)/750;
      p.vy += (rand(0, 100)-50)/750;
      p.x += p.vx;
      p.y += p.vy;
      p.alpha -= .01;

      if(p.alpha < .02){
	game.particles.splice(i, 1)
      }
    }
  };
  var renderParticles = function(){
    var i = game.particles.length;
    while(i--){
      var p = game.particles[i];
      ctx.beginPath();
      ctx.fillRect(p.x, p.y, p.radius, p.radius);
      ctx.closePath();
      ctx.fillStyle = 'hsla(0, 100%, 50%, '+p.alpha+')';
    }
  };

  /* Set Constant Properties */
  ctx.shadowBlur = game.circle.blur;
  ctx.shadowColor = 'hsla('+game.circle.hue+', 80%, 60%, 1)';
  ctx.lineCap = 'round';

  var gradient1 = ctx.createLinearGradient(0, -game.circle.radius, 0, game.circle.radius);
  gradient1.addColorStop(0, 'hsla('+game.circle.hue+', 60%, 50%, .25)');
  gradient1.addColorStop(1, 'hsla('+game.circle.hue+', 60%, 50%, 0)');

  var gradient2 = ctx.createLinearGradient(0, -game.circle.radius, 0, game.circle.radius);
  gradient2.addColorStop(0, 'hsla('+game.circle.hue+', 100%, 50%, 0)');
  gradient2.addColorStop(.1, 'hsla('+game.circle.hue+', 100%, 100%, .7)');
  gradient2.addColorStop(1, 'hsla('+game.circle.hue+', 100%, 50%, 0)');

  updateCircle();
  renderCircle();
  renderCircleBorder();
  createParticles();
  createParticles();
  createParticles();
  updateParticles();
  renderParticles();
  ctx.restore();

  /* Loop It, Loop It Good */
  // game.sparkleIntervalID = setInterval(loop, 16);
};

function endSparkles(game, player) {
  //clearInterval(game.sparkleIntervalID);
};
