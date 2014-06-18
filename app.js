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
    io             = require('socket.io')(server),
    UUID            = require('node-uuid');

if (use_db) {
    database        = require(__dirname + "/database"),
    connection      = database.getConnection();
}

/* Express server set up. */

//Log something so we know that it succeeded.
console.log('\t :: Express :: Listening on port ' + gameport );

//  This handler will listen for requests on /*, any file from the
//  root of our server. See expressjs documentation for more info on
//  routing.
app.get( '/*' , function( req, res, next ) {
    //This is the current file they have requested
    var file = req.params[0]; 
    console.log('\t :: Express :: file requested: ' + file);    

    //Give them what they want!
    res.sendfile("./" + file);
}); 

/* Socket.IO server set up. */
        
io.use(function(socket, next) {
    var handshakeData = socket.request;
    next();
});

//io.set('authorization', function (handshakeData, callback) {
//    callback(null, true); // error first callback style 
//});

game_server = require('./game.server.js');

// Socket.io will call this function when a client connects. We check
// to see if the client supplied a id. If so, we distinguish them by
// that, otherwise we assign them one at random
io.on('connection', function (client) {
    // Recover query string information and set condition
    var hs = client.handshake;    
    var query = require('url').parse(client.handshake.headers.referer, true).query;
    var id = (query.id) ? query.id : UUID(); // Ternary operator!
    client.condition = query.condition;
    if (use_db) {
        var q = 'SELECT EXISTS(SELECT * FROM game_participant WHERE workerId = ' + 
            connection.escape(id) + ') AS b';
        connection.query(q, function(err, results) {
            // Only let a player join if they are already in the database.
            // Otherwise, send an alert message
            player_exists = results[0].b;
            if (id && player_exists) {
                initialize(query, client, id);
            } else {
                client.userid = 'none';
                client.send('s.alert');
            }
        });
    } else {
        initialize(query, client, id);
    }});

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
                    + ' disconnected from game id' + client.game.id);
        
        //If the client was in a game set by game_server.findGame,
        //we can tell the game server to update that game state.
        if(client.userid && client.game && client.game.id) 
            //player leaving a game should destroy that game
            game_server.endGame(client.game.id, client.userid);            
    });
};

