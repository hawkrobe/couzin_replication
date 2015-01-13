/*  Copyright (c) 2012 Sven "FuzzYspo0N" Bergström, 2013 Robert XD Hawkins

    originally written for: http://buildnewgames.com/real-time-multiplayer/
    
    substantially modified for collective behavior experiments 

    MIT Licensed.
*/

var 
    use_db          = false,
    gameport        = 8000,
    app             = require('express')(),
    server          = app.listen(gameport),
    io              = require('socket.io')(server),
    _               = require('underscore'),
    fs              = require('fs'),
    UUID            = require('node-uuid');

if (use_db) {
    database        = require(__dirname + "/database"),
    connection      = database.getConnection();
}

game_server = require('./game.server.js');

// Log something so we know that server-side setup succeeded
console.log("info  - socket.io started");
console.log('\t :: Express :: Listening on port ' + gameport );

//  This handler will listen for requests on /*, any file from the
//  root of our server. See expressjs documentation for more info 
app.get( '/*' , function( req, res ) {
    // this is the current file they have requested
    var file = req.params[0]; 
    console.log('\t :: Express :: file requested: ' + file);    

    // give them what they want
    res.sendfile("./" + file);
}); 

// prep game_server object to assign players to conditions
fs.readFile('./metadata/assignments.csv', {encoding: 'utf8'}, function(err,data) {
    if(err) throw err;
    // parse into lines
    var lines = data.split(/\r?\n/);
    game_server.param_guide = lines;
})        

// Socket.io will call this function when a client connects. We check
// to see if the client supplied a id. If so, we distinguish them by
// that, otherwise we assign them one at random
io.on('connection', function (client) {
    // Recover query string information and set condition
    var hs = client.handshake;    
    var query = require('url').parse(client.handshake.headers.referer, true).query;
    var id = (query.id) ? query.id : UUID(); // use id from query string if exists
    client.condition = query.condition;
    console.log("user connecting...")
    initialize(query, client, id);
});

var initialize = function(query, client, id) {                        
    client.userid = id;
    client.emit('onconnected', { id: client.userid } );

    // Good to know when they connected
    console.log('\t socket.io:: player ' + client.userid + ' connected');

    //Pass off to game.server.js code
    game_server.findGame(client);
    
    // Now we want set up some callbacks to handle messages that clients will send.
    // We'll just pass messages off to the server_onMessage function for now.
    client.on('message', function(m) {
        game_server.server_onMessage(client, m);
    }); 

    // When this client disconnects, we want to tell the game server
    // about that as well, so it can remove them from the game they are
    // in, and make sure the other player knows that they left and so on.
    client.on('disconnect', function () {            
        console.log('\t socket.io:: client id ' + client.userid 
                    + ' disconnected from game id ' + client.game.id);
        
        //If the client was in a game set by game_server.findGame,
        //we can tell the game server to update that game state.
        if(client.userid && client.game && client.game.id) 
	    console.log("calling end game...")
            //player leaving a game should change that game
            game_server.endGame(client.game.id, client.userid);            
    });
};

