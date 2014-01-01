/*  Copyright (c) 2012 Sven "FuzzYspo0N" Bergström, 2013 Robert XD Hawkins
    
    written by : http://underscorediscovery.com
    written for : http://buildnewgames.com/real-time-multiplayer/
    
    modified for collective behavior experiments on Amazon Mechanical Turk

    MIT Licensed.
*/

//A window global for our game root variable.
var game = {};

//When loading, we store references to our
//drawing canvases, and initiate a game instance.
window.onload = function(){
    
    //Create our game client instance.
    game = new game_core();
    
    //Connect to the socket.io server!
    client_connect_to_server(game);
    
    game.players.other.color = '#212121';
    game.players.self.color = '#212121';
    
    //Fetch the viewport
    game.viewport = document.getElementById('viewport');
    
    //Adjust their size
    game.viewport.width = game.world.width;
    game.viewport.height = game.world.height;
    
    //Assign click handler ONCE, with the associated data.
    $('#viewport').click(function(e){
        console.log("click");
        e.preventDefault();
        // e.pageX is relative to whole page -- we want
        // relative to GAME WORLD (i.e. viewport)
        var offset = $(this).offset(); 
        var relX = e.pageX - offset.left;
        var relY = e.pageY - offset.top;
        
        // The things we care about are not yet defined, so we
        // just pass it off to another function as a callback
        client_on_click(game, relX, relY);
    }); 

    //Fetch the rendering contexts
    game.ctx = game.viewport.getContext('2d');

    //Set the draw style for the font
    game.ctx.font = '11px "Helvetica"';

    //Finally, start the loop
    game.update();

}; //window.onload


// Associates callback functions corresponding to different socket messages
client_connect_to_server = function(game) {
    
    //Store a local reference to our connection to the server
    game.socket = io.connect();

    //When we connect, we are not 'connected' until we have a server id
    //and are placed in a game by the server. The server sends us a message for that.
    game.socket.on('connect', function(){
        game.players.self.state = 'connecting';
    }.bind(game));

    //Sent when we are disconnected (network, server down, etc)
    game.socket.on('disconnect', client_ondisconnect.bind(game));
    //Sent each tick of the server simulation. This is our authoritive update
    game.socket.on('onserverupdate', client_onserverupdate_recieved.bind(game));
    //Handle when we connect to the server, showing state and storing id's.
    game.socket.on('onconnected', client_onconnected.bind(game));
    //On message from the server, we parse the commands and send it to the handlers
    game.socket.on('message', client_onnetmessage.bind(game));
}; 

// Function that gets called client-side when someone 
client_ondisconnect = function(data) {
    // Everything goes offline!
    game.players.self.info_color = 'rgba(255,255,255,0.1)';
    game.players.self.state = 'not-connected';
    game.players.self.online = false;
    game.players.self.destination = null;
    game.players.other.info_color = 'rgba(255,255,255,0.1)';
    game.players.other.state = 'not-connected';
    
    console.log("Disconnecting...");

    if(game.games_remaining == 0) {
        // If the game is done, redirect them to an exit survey
        URL = './game_over.html';
        URL += '?id=' + game.players.self.id;
        window.location.replace(URL);
    } else {
        // Otherwise, redirect them to a "we're sorry, the other player disconnected" page
        URL = './disconnected.html'
        URL += '?id=' + game.players.self.id;
        window.location.replace(URL);
    }
};

/* 
This function is at the center of the problem of networking --
everybody has different INSTANCES of the game. The server has its own,
and both players have theirs too. This can get confusing because the
server will update a variable, and the variable of the same name won't
change in the clients (because they have a different instance of
it). To make sure everybody's on the same page, the server regularly
sends news about its variables to the clients so that they can update
their variables to reflect changes.
*/
client_onserverupdate_recieved = function(data){
    //Lets clarify the information we have locally. One of the players is 'hosting' and
    //the other is a joined in client, so we name these host and client for making sure
    //the positions we get from the server are mapped onto the correct local sprites
    var player_host = this.players.self.host ?  this.players.self : this.players.other;
    var player_client = this.players.self.host ?  this.players.other : this.players.self;
    var game_player = this.players.self;
        
    // Update client versions of variables with data received from server
    if(data.hpos) 
        player_host.pos = this.pos(data.hpos); 
    if(data.cpos) 
        player_client.pos = this.pos(data.cpos);
    
    player_host.points_earned = data.hpoi;
    player_client.points_earned = data.cpoi;
    player_host.curr_distance_moved = data.hcdm;
    player_client.curr_distance_moved = data.ccdm;
    this.targets.top.payoff = data.tcp;
    this.targets.bottom.payoff = data.bcp; 
    this.targets.top.color = data.tcc;
    this.targets.bottom.color = data.bcc;
    this.condition = data.cond;
    this.draw_enabled = data.de;
    this.good2write = data.g2w;
}; //game_core.client_onserverupdate_recieved

client_onconnected = function(data) {
    //The server responded that we are now in a game,
    //this lets us store the information about ourselves    
    this.players.self.id = data.id;
    this.players.self.online = true;
}; //client_onconnected

// This is where clients parse messages from the server. If there's
// another message you need to receive, just add another case here. To
// see the corresponding function where the server parses messages
// from clients, look for "onMessage" in game.server.js.
client_onnetmessage = function(data) {

    var commands = data.split('.');
    var command = commands[0];
    var subcommand = commands[1] || null;
    var commanddata = commands[2] || null;

    switch(command) {
    case 's': //server message

        switch(subcommand) {    
            // Permanent Message
        case 'p' :
            game.players.self.message = commanddata;
            break;
        case 'm' : 
            game.players.self.message = commanddata;
            var local_game = game;
            setTimeout(function(){local_game.players.self.message = '';}, 1000);
            break;
        case 'alert' : // Can't play...
            alert('You did not enter an ID'); 
            window.location.replace('http://nodejs.org'); break;
        case 'h' : //host a game requested
            client_onhostgame(); break;
        case 'j' : //join a game requested
            client_onjoingame(); break;
        case 'n' : //ready a game requested
            client_newgame(); break;
        case 'e' : //end game requested
            client_ondisconnect(); break;
        case 'a' : // other player changed angle
            game.players.other.angle = commanddata; break;
            game.players.other.draw();
        } //subcommand
        
        break; //'s'
    } 
}; 

client_onjoingame = function() {
    //We are not the host
    game.players.self.host = false;

    //Set colors once and for all.
    game.players.other.color = '#2288cc';
    game.players.other.info_color = '#2288cc';
    game.players.self.color = '#cc0000';
    game.players.self.info_color = '#cc0000';

    //Make sure the positions match servers and other clients
    game.client_reset_positions();

}; //client_onjoingame

// This function is triggered in a client when they first join and start a new game
client_onhostgame = function() {
    //Set the flag that we are hosting, this helps us position respawns correctly
    game.players.self.host = true;

    //Update tags below players to display state
    game.players.self.state = 'waiting for other player to join';
    game.players.other.state = 'not-connected';

    // Set their colors once and for all.
    game.players.self.color = '#2288cc';
    game.players.self.info_color = '#2288cc';
    game.players.other.color = '#cc0000';
    game.players.other.info_color = '#cc0000';

    //Make sure we start in the correct place as the host.
    game.client_reset_positions();
}; //client_onhostgame


// Restarts things on the client side. Necessary for iterated games.
client_newgame = function() {
    if (game.games_remaining == 0) {
        // Redirect to exit survey
	// var URL = 'http://perceptsconcepts.psych.indiana.edu/rts/survey';
        var URL = 'game_over.html';
        URL += '?id=' + game.players.self.id;
        window.location.replace(URL);
    } else {
        // Decrement number of games remaining
        game.games_remaining -= 1;
    }

    var player_host = game.players.self.host ?  game.players.self : game.players.other;
    var player_client = game.players.self.host ?  game.players.other : game.players.self;

    // Reset angles
    player_host.angle = player_host.start_angle = 90;
    player_client.angle = player_client.start_angle = 270;

    //Update their destinations
    player_host.destination = null;
    player_client.destination = null;

    // They SHOULD see the targets information
    game.players.self.targets_enabled = true;
    game.players.other.targets_enabled = true;

    // Initiate countdown (with timeouts)
    if (game.condition == 'dynamic')
        client_countdown();

    // Set text beneath player
    game.players.self.state = 'YOU';
    game.players.other.state = '';
}; 

client_countdown = function() {
    game.players.self.message = '          Begin in 3...';
    setTimeout(function(){game.players.self.message = '          Begin in 2...';}, 1000);
    setTimeout(function(){game.players.self.message = '          Begin in 1...';}, 2000);

    // At end of countdown, say "GO" and start using their real angle
    setTimeout(function(){
        game.players.self.message = '               GO';
    }, 3000);
    
    // Remove message text
    setTimeout(function(){game.players.self.message = '';}, 4000);
}


// This function tells the server where the client clicked so
// that their destination and angle can be updated. 
client_on_click = function(game, newX, newY ) {
    // Auto-correcting input, but only between rounds
    if (game.condition == 'ballistic' && !game.draw_enabled) {
        if (game.distance_between({x : newX, y : newY},
                                  game.targets.top.location) < game.targets.top.outer_radius) {
            newX = game.targets.top.location.x;
            newY = game.targets.top.location.y;
        } else if (game.distance_between({x : newX, y: newY},
                                         game.targets.bottom.location) < game.targets.bottom.outer_radius) {
            newX = game.targets.bottom.location.x;
            newY = game.targets.bottom.location.y;
        }
    }
    
    oldX = game.players.self.pos.x;
    oldY = game.players.self.pos.y;
    dx = newX - oldX;
    dy = newY - oldY;
    
    // Complicated logic. If you're in the dynamic condition, your clicks will
    // ALWAYS register. If you're in the ballistic condition, they'll only register
    // if you're in the pre- (or between-)game period where nothing's being written.
    if((game.condition == "ballistic" && !game.good2write) || 
       game.condition == "dynamic") {
        game.players.self.destination = {x : Math.round(newX), y : Math.round(newY)};
        game.players.self.angle = Math.round((Math.atan2(dy,dx) * 180 / Math.PI) + 90);
        
        // Send game information to server so that other player (and server) 
        // can update information
        info_packet = ("c." + game.players.self.angle + 
                       "."  + game.players.self.destination.x +
                       "."  + game.players.self.destination.y);
        game.socket.send(info_packet);
    } //end the if statement for ballistic condition
}; // client_on_click

