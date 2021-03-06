/*  Copyright (c) 2012 Sven "FuzzYspo0N" Bergström, 
                  2013 Robert XD Hawkins
    
    written by : http://underscorediscovery.com
    written for : http://buildnewgames.com/real-time-multiplayer/
    
    modified for collective behavior experiments on Amazon Mechanical Turk

    MIT Licensed.
*/

/* 
   THE FOLLOWING FUNCTIONS MAY NEED TO BE CHANGED
*/

// A window global for our game root variable.
var game = {};
// A window global for our id, which we can use to look ourselves up
var my_id = null;
// Keeps track of whether player is paying attention...
var visible;
var speed_change = "none";

$.Finger.preventDefault = true;

function getParameterByName(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, "\\$&");
  var regex = new RegExp("[?&]" + name + "(=([^&#]*)|&|#|$)"),
      results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, " "));
}

var debug = getParameterByName('debug') == 'true';
var video = getParameterByName('video') == 'true';
var researcher = getParameterByName('researcher') == 'true';
var demo = getParameterByName('demo') == 'true';

function client_ondisconnect (data) {
  // Redirect to exit survey
  console.log("server booted")
  if(game.get_player(my_id).hidden) {
    var URL = 'http://projects.csail.mit.edu/ci/turk/forms/away.html';
  } else if(game.get_player(my_id).inactive) {
    var URL = 'http://projects.csail.mit.edu/ci/turk/forms/away.html';
    //var URL = 'http://projects.csail.mit.edu/ci/turk/forms/error.html?id=' + my_id;
  } else if(game.get_player(my_id).lagging) {
    var URL = 'http://projects.csail.mit.edu/ci/turk/forms/survey.html?latency=true&id=' + my_id + '&score=' + (game.get_player(my_id).total_points).fixed(2);
  } else {
      if(demo) {
	  var URL = 'http://projects.csail.mit.edu/ci/turk/forms/demo-end.html?id=' + my_id + '&score=' + game.get_player(my_id).star_points;
      } else {
	  var URL = 'http://projects.csail.mit.edu/ci/turk/forms/survey.html?id=' + my_id + '&score=' + (game.get_player(my_id).total_points).fixed(2);
      }
  }
  window.location.replace(URL);
};


/* 
 Note: If you add some new variable to your game that must be shared
 across server and client, add it both here and the server_send_update
 function in game.core.js to make sure it syncs 

 Explanation: This function is at the center of the problem of
 networking -- everybody has different INSTANCES of the game. The
 server has its own, and both players have theirs too. This can get
 confusing because the server will update a variable, and the variable
 of the same name won't change in the clients (because they have a
 different instance of it). To make sure everybody's on the same page,
 the server regularly sends news about its variables to the clients so
 that they can update their variables to reflect changes.
 */
function client_onserverupdate_received (data){

  // Update client versions of variables with data received from
  // server_send_update function in game.core.js
  
  if(data.players) {
    _.map(_.zip(data.players, game.players), function(z){
      z[1].id = z[0].id
      if (z[0].player == null) {
        z[1].player = null
      } else {
        var s_player = z[0].player
        var l_player = z[1].player
	// Don't update own angle if local info exists
        if(z[0].id != my_id || l_player.angle == null) {
	  l_player.angle = s_player.angle
	}
	l_player.curr_background = s_player.cbg
	l_player.total_points = s_player.tot
	l_player.active_points = s_player.act
	l_player.star_points = s_player.star
        l_player.pos = game.pos(s_player.pos)
        l_player.speed = s_player.speed
	l_player.onwall = s_player.onwall
        l_player.hidden = s_player.hidden
        l_player.inactive = s_player.inactive
        l_player.lagging = s_player.lagging
      }
    });
  }
  
  game.spotScoreLoc = data.spotScoreLoc;
  game.game_started = data.gs;
  game.game_clock = data.game_clock;
  game.players_threshold = data.pt;
  game.player_count = data.pc;
  game.waiting_remaining = data.wr;

}; 

// This is where clients parse socket.io messages from the server. If
// you want to add another event (labeled 'x', say), just add another
// case here, then call

//          this.instance.player_host.send("s.x. <data>")

// The corresponding function where the server parses messages from
// clients, look for "server_onMessage" in game.server.js.
function client_onMessage (data) {

  var commands = data.split('.');
  var command = commands[0];
  var subcommand = commands[1] || null;
  var commanddata = commands[2] || null;

  switch(command) {
  case 's': //server message

    switch(subcommand) {    
    case 'end' :
      // Redirect to exit survey
      console.log("received end message...")
      var URL = 'http://projects.csail.mit.edu/ci/turk/forms/survey.html?id=' + my_id + '&score=' + (game.get_player(my_id).total_points).fixed(2);
      window.location.replace(URL); break;
    case 'alert' : // Not in database, so you can't play...
      alert('You did not enter an ID'); 
      window.location.replace('http://nodejs.org'); break;
    case 'join' : //join a game requested
      var num_players = commanddata;
      client_onjoingame(num_players); break;
    case 'add_player' : // New player joined... Need to add them to our list.
      console.log("adding player" + commanddata)
      game.players.push({id: commanddata, player: new game_player(game)}); break;
    case 'begin_game' :
      client_newgame(); break;
    case 'blink' : //blink title
      flashTitle("GO!");  break;
    }        
    break; 
  } 
}; 



function client_on_click(game, newX, newY ) {
  // Auto-correcting input, but only between rounds
  var self = game.get_player(my_id);
  if (newX > self.pos_limits.x_min && newX < self.pos_limits.x_max &&
      newY > self.pos_limits.y_min && newY < self.pos_limits.y_max) {
    var oldX = self.pos.x;
    var oldY = self.pos.y;
    var dx = newX - oldX;
    var dy = newY - oldY;
    
    self.destination = {x : Math.round(newX), y : Math.round(newY)};

    // Reset destination visualization to fade again
    game.remainingFadeSteps = game.numFadeSteps;

    self.angle = Math.round((Math.atan2(dy,dx) * 180 / Math.PI) + 90);

    var info_packet = ("c." + self.angle +
		       "."  + self.destination.x +
		       "."  + self.destination.y);

    game.socket.send(info_packet);
  }
};


// Restarts things on the client side. Necessary for iterated games.
function client_newgame () {
  // Initiate countdown (with timeouts)
  //game.get_player(my_id).angle = null;
  client_countdown();
}; 

function client_countdown () {
  var player = game.get_player(my_id);
  player.message = 'Begin in 3...';
  setTimeout(function(){player.message = 'Begin in 2...';}, 
             1000);
  setTimeout(function(){player.message = 'Begin in 1...';}, 
             2000);
  setTimeout(function(){
    player.message = 'GO!';     
    game.start_time = new Date();}, 
	     3000);
  setTimeout(function(){player.message = '';}, 
             4000);
}

function client_update () {
  var player = game.get_player(my_id);

  //Clear the screen area
  game.ctx.clearRect(0,0,485,280);

  // Draw background
  if (debug || video) {
    if(game.spotScoreLoc) {
      drawScoreField(game);
    }
  }


  // Alter speeds
  if (speed_change != "none") {
    console.log("speed change:" + speed_change);
    if (speed_change == "up") {
      player.speed = game.max_speed;
    } else if (speed_change == "stop") {
      player.speed = 0;
    } else { 
      player.speed = game.min_speed;
    }
    game.socket.send("s." + String(player.speed).replace(/\./g,'-'));
    speed_change = "none"
  }

  //Draw opponent next 
  _.map(game.get_others(my_id), function(p){
    if(p.player.pos) {
      draw_player(game, p.player)
      //draw_label(game, p.player, "Player " + p.id.slice(0,4))
    }
  })

    // Draw points scoreboard 
    //$("#cumulative_bonus").html("Total bonus so far: $" + (player.total_points).fixed(3));
    $("#star_points").html("Score: " + parseInt(player.star_points));
    //$("#star_points").html("Star Points: " + parseInt(player.star_points) + "</br>Activity Points: " + parseInt(player.active_points));

  if(game.game_started) {
    $("#curr_bonus").html("Game on!" );
  } else {
    $("#curr_bonus").html("Waiting Room" );
  }

  onwall = player.onwall;
  if(!video){
  if(onwall) {
    player.warning = 'Warning: Move off the wall!';
    document.getElementById("viewport").style.borderColor = "red";
  } else {
    player.warning = '';
    if(game.game_started) {
      document.getElementById("viewport").style.borderColor = "blue";
      if(player.curr_background >= 1.0) {
	drawSparkles(game, player);
	document.getElementById("viewport").style.borderColor = "yellow";
      };
    } else {
      document.getElementById("viewport").style.borderColor = "#333";
    }
  }
  }

  // Notify user of remaining time
  if(game.game_started) {
    var timeToEnd = getTimeToEnd(game);
    if(timeToEnd.minutes == 0 && timeToEnd.seconds < 6) {
      player.message = 'Ending in ' + timeToEnd.seconds;
    }
    $("#time").html("Time remaining: " + getTimeStr(timeToEnd));
  } else {
    $("#time").html('You are in the waiting room.');
  }
  
  //And then we draw ourself so we're always in front
  if(player.pos && !video) {
    drawDestination(game, player);
    draw_player(game, player)
    draw_label(game, player, "YOU");
  }

};

// Game ends when game_clock >= game.game_length (measured in ticks)
// We convert this to seconds and parse into min/sec representation
function getTimeToEnd (game) {
  var secondsLeft = (game.game_length - game.game_clock)/game.ticks_per_sec;
  return {minutes: Math.floor(secondsLeft / 60),
	  seconds: Math.floor(secondsLeft % 60)};
};

// Handles appropriate plurals, and only displays seconds when min < 1
function getTimeStr (timeToEnd) {
  var minuteStr = (timeToEnd.minutes > 1 ?
		   [timeToEnd.minutes, "minutes"].join(" ") :
		   [timeToEnd.minutes, "minute"].join(" "));
  var secondStr = [timeToEnd.seconds, "seconds"].join(" ");
  return timeToEnd.minutes > 0 ? minuteStr + ", " + secondStr : secondStr;
};

var percentColors = [
  { pct: 0.0, color: { r: 0xff, g: 0xff, b: 0xff } },
  { pct: 1.0, color: { r: 0x00, g: 0xff, b: 0 } }
];

function getColorForPercentage (pct) {
  for (var i = 0; i < percentColors.length; i++) {
    if (pct <= percentColors[i].pct) {
      var lower = percentColors[i - 1] || { pct: 0.1, color: { r: 0x0, g: 0x00, b: 0 } };
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

/*
 The following code should NOT need to be changed
 */

// When loading the page, we store references to our
// drawing canvases, and initiate a game instance.
window.onload = function(){
  //Create our game client instance.
  game = new game_core();
  
  //Connect to the socket.io server!
  client_connect_to_server(game);
  
  //Fetch the viewport
  game.viewport = document.getElementById('viewport');
  
  //Adjust its size
  game.viewport.width = game.world.width;
  game.viewport.height = game.world.height;

  // Add different controls for mobile & desktop
  if(isMobile) {
    $('#viewport').on('tap', clickEvent);
    $("#viewport").on('doubletap', function(e) {
      speed_change = game.get_player(my_id).speed == game.max_speed ? "down" : "up";
    });
    $("#viewport").on('press', function(e) {
      speed_change = "stop";
    });
  } else {
    $('#viewport').click(clickEvent);
    
    keyboardJS.bind('a',
		  function(e){e.preventRepeat();speed_change = "up";},
		  function(e){speed_change = "down"});

    keyboardJS.bind('s',
		  function(e){e.preventRepeat();speed_change = "stop";}, 
		  function(e){speed_change = "down"});
  }
  
  addSkipButton(game);
  if(researcher) {
    addStartButton(game);
  }

  //Fetch the rendering contexts
  game.ctx = game.viewport.getContext('2d');

  //Set the draw style for the font
  game.ctx.font = '11px "Helvetica"';

  //Finally, start the loop
  game.update();
};

function clickEvent (e) {
  console.log("click event");
  console.log(e.originalEvent);
  e.preventDefault();

  // If you're stopped and you click, start going again (not when accelerated)
  if(isMobile && game.get_player(my_id).speed == 0) {
    speed_change = "down";
  }
  
  // e.pageX is relative to whole page -- we want
  // relative to GAME WORLD (i.e. viewport)
  var offset = $(this).offset();
  var borderWidth = 1; //parseInt($(this).css("border-width" )); // broken in firefox 48.0
  
  // jquery event gives pageX, finger event gives x
  var x = e.pageX ? e.pageX : e.x;
  var y = e.pageY ? e.pageY : e.y;
  var relX = x - offset.left - borderWidth;
  var relY = y - offset.top - borderWidth;
  console.log(relX, relY);
  client_on_click(game, relX, relY);

  // game.pressTimer = window.setTimeout(function() {
  //   speed_change = "up";
  // },1000);
  return false;
}

// Associates callback functions corresponding to different socket messages
function client_connect_to_server (game) {
  //Store a local reference to our connection to the server
  game.socket = io.connect();

  //When we connect, we are not 'connected' until we have a server id
  //and are placed in a game by the server. The server sends us a message for that.
  game.socket.on('connect', function(){
    //        game.state = 'connecting';
  }.bind(game));

  game.socket.on('ping', function(data){
    game.socket.send('pong.' + data.sendTime + "." + data.tick_num)})
  //Sent when we are disconnected (network, server down, etc)
  game.socket.on('disconnect', client_ondisconnect.bind(game));
  //Sent each tick of the server simulation. This is our authoritive update
  game.socket.on('onserverupdate', client_onserverupdate_received);
  //Handle when we connect to the server, showing state and storing id's.
  game.socket.on('onconnected', client_onconnected.bind(game));
  //On message from the server, we parse the commands and send it to the handlers
  game.socket.on('message', client_onMessage.bind(game));
}; 

function client_onconnected (data) {
  //The server responded that we are now in a game,
  //this lets us store the information about ourselves  
  // so that we remember who we are.  
  my_id = data.id;
  game.players[0].id = my_id;
  game.get_player(my_id).online = true;
};

function client_onjoingame (num_players) {
  // Need client to know how many players there are, so they can set up the appropriate data structure
  _.map(_.range(num_players - 1), function(i){game.players.unshift({id: null, player: new game_player(game)})});
  // Set self color, leave others default white
  game.get_player(my_id).color = game.self_color;
  // Start 'em moving
  game.get_player(my_id).speed = game.min_speed;
  if(demo) {
      game.get_player(my_id).message = 'Please remain active while you wait.';
  } else {
      game.get_player(my_id).message = 'You will be disqualified and removed if you become inactive.';
  }
}; 

// Automatically registers whether user has switched tabs...
(function() {
  document.hidden = hidden = "hidden";

  // Standards:
  if (hidden in document)
    document.addEventListener("visibilitychange", onchange);
  else if ((hidden = "mozHidden") in document)
    document.addEventListener("mozvisibilitychange", onchange);
  else if ((hidden = "webkitHidden") in document)
    document.addEventListener("webkitvisibilitychange", onchange);
  else if ((hidden = "msHidden") in document)
    document.addEventListener("msvisibilitychange", onchange);
  // IE 9 and lower:
  else if ('onfocusin' in document)
    document.onfocusin = document.onfocusout = onchange;
  // All others:
  else
    window.onpageshow = window.onpagehide = window.onfocus 
    = window.onblur = onchange;
})();

function onchange (evt) {
  var v = 'visible', h = 'hidden',
      evtMap = { 
        focus:v, focusin:v, pageshow:v, blur:h, focusout:h, pagehide:h 
      };
  evt = evt || window.event;
  if (evt.type in evtMap) {
    document.body.className = evtMap[evt.type];
  } else {
    document.body.className = evt.target.hidden ? "hidden" : "visible";
  }
  visible = document.body.className;
  game.socket.send("h." + document.body.className);
};

// Flashes title to notify user that game has started
(function () {

  var original = document.title;
  var timeout;

  window.flashTitle = function (newMsg, howManyTimes) {
    function step() {
      document.title = (document.title == original) ? newMsg : original;
      if (visible == "hidden") {
        timeout = setTimeout(step, 500);
      } else {
        document.title = original;
      }
    };
    cancelFlashTitle(timeout);
    step();
  };

  window.cancelFlashTitle = function (timeout) {
    clearTimeout(timeout);
    document.title = original;
  };

}());
