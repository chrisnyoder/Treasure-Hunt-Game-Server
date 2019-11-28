
const io = require('socket.io')(process.env.PORT || 52300, { pingTimeout: 20000 });
const Player = require('./player.js');
const Room = require('./room.js');

console.log('Server has started');

var players = [];
var sockets = [];

io.on('connection', function(socket) {

    var player = new Player();
    var thisPlayerID = player.id;
    var room; 

    console.log('connection made: ' + thisPlayerID);

    players[thisPlayerID] = player;
    sockets[thisPlayerID] = socket;

    socket.emit('register', {playerId: thisPlayerID});

    socket.on('isHosting', function() {
        player.isHosting = true;

        room = new Room();

        room.generateRoomId(function() {
            if(room.roomId === 'undefined')
            {
                // could not generate a room ID, player is in connected state but not in a room with ID
                player.isHosting = false;
            } else 
            {
                player.roomId = room.roomId;
                socket.join(player.roomId);

                rooms[room.roomId] = room;
                socket.emit('roomId', { roomId: room.roomId });
                room.playersInRoom.push(player);

                console.log("number of players in room, server side: " + room.playersInRoom);
                socket.emit('numberOfPlayersInRoomChanged', { playersInRoom: room.playersInRoom });
            }
        });
    });

    socket.on('isJoining', function (data) {
        roomId = data.roomId;

        socket.join(roomId);
        room = rooms[roomId];

        if(typeof room === 'undefined')
        {
            console.log('room doesnt exist');
            socket.emit('roomNotAvailable');
        } else 
        {
            console.log('room exist, and the player is being connected');
            room.playersInRoom.push(player);     
            var joinedPlayerIndex = determineJoinedPlayerIndex();

            console.log('joined player index is: ' + joinedPlayerIndex);
            room.initialDictionary.playerIndex = joinedPlayerIndex;

            console.log('Dictionary received on server: ' + JSON.stringify(room.initialDictionary));
            
            socket.emit('gameDictionary', room.initialDictionary);
            socket.emit('wordsSelected', room.wordsSelected);
            socket.emit('newGameState', room.gameState);
            
            socket.broadcast.emit('numberOfPlayersInRoomChanged', { playersInRoom: room.playersInRoom });  
        }   
    });

    function determineJoinedPlayerIndex() {
        var joinedPlayers = []
        for (var i = 0; i < room.playersInRoom.length; ++i) {
            if(!room.playersInRoom[i].isHosting) {
                joinedPlayers.push(room.playersInRoom[i])
            }
        }
        return (joinedPlayers.length - 1);
    }

    socket.on('gameDictionary', function (data) {
        room.initialDictionary = data;

        console.log('Dictionary received on server: ' + JSON.stringify(room.initialDictionary));
        socket.to(room.roomId).broadcast.emit('gameDictionary', room.initialDictionary);
    });

    socket.on('newGameState', function(newGameState) {
        room.gameState = newGameState;
        console.log('new game state: ' + JSON.stringify(room.newGameState));
        socket.to(room.roomId).broadcast.emit('newGameState', room.gameState);
    });

    socket.on('wordsSelected', function(wordSelected) {
        room.wordsSelected = wordSelected;
        console.log('words selected: ' + JSON.stringify(room.wordsSelected));
        socket.to(room.roomId).broadcast.emit('wordsSelected', room.wordsSelected);
    });

    socket.on('disconnect', function() {
        console.log('A player has disconnected: ' + thisPlayerID);
        delete players[thisPlayerID];
        delete sockets[thisPlayerID];

        if(typeof room !== "undefined") {
            for(var i = 0; i < room.playersInRoom.length; ++i) {
                if(room.playersInRoom[i].id == thisPlayerID) {
                    room.playersInRoom.splice(i, 1);
                };
            };
            socket.emit('numberOfPlayersInRoomChanged', { playersInRoom: room.playersInRoom })
            socket.broadcast.emit('numberOfPlayersInRoomChanged', { playersInRoom: room.playersInRoom });
        } 

        if(player.isHosting)
        {
            delete rooms[room.roomId];
            roomIds.splice(room.roomArrayIndex, 1);
        }
    });
});