
const io = require('socket.io')(process.env.PORT || 52300, { pingTimeout: 1800000 });
const Player = require('./player.js');
const Room = require('./room.js');
require('console-stamp')(console, { pattern: 'dd/mm/yyyy HH:MM:ss.l' })

console.log('Server has started');
console.log(rooms.length);

var players = [];
var sockets = [];

io.on('connection', function(socket) {

    var player = new Player();
    var thisPlayerID = player.id;
    var room; 
    var synchTimer; 

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

                console.log('adding room object to rooms array: ' + JSON.stringify(room))
                rooms.push(room);
 
                socket.emit('roomId', { roomId: room.roomId });
                room.playersInRoom.push(player);

                console.log("players in room: " + JSON.stringify(room.playersInRoom));
                socket.to(room.roomId).emit('numberOfPlayersInRoomChanged', { playersInRoom: room.playersInRoom });
            }
        });
    });

    socket.on('isJoining', function (data) {
        joiningRoomId = data.roomId;

        console.log('joining room ' + joiningRoomId + ' as captain');

        for (const r of rooms) {
            if (r.roomId == joiningRoomId) {
                room = r;
                room.stopRoomDeletionTimer()
                break;
            }
        }

        if(typeof room === 'undefined')
        {
            console.log('room doesnt exist');
            socket.emit('roomNotAvailable');
        } else 
        {
            socket.join(joiningRoomId);

            console.log('joined room ' + joiningRoomId + ' as captain')
            
            var joinedPlayerIndex = determineJoinedPlayerIndex();
            room.initialDictionary.playerIndex = joinedPlayerIndex;

            providePlayerInitialDictionary();
            providePlayerWordsSelected();
            updateRoomCount();
        }   
    });

    socket.on('isJoiningMainBoard', function(data) {
        joiningRoomId = data.roomId;

        console.log('joining room ' + joiningRoomId + ' as crew');

        for (const r of rooms) {
            if (r.roomId == joiningRoomId) {
                room = r;
                room.stopRoomDeletionTimer()
                break;
            }
        }

        if (typeof room === 'undefined') {
            console.log('room doesnt exist');
            socket.emit('roomNotAvailable');
        } else {
            console.log('room exist, and the player is being connected');
            socket.join(joiningRoomId);
            
            providePlayerInitialDictionary();
            providePlayerWordsSelected();
            updateRoomCount();
        }   
    });

    socket.on('reconnecting', function(roomId) {
        var reconnectingRoomId = roomId.roomId;

        console.log('attempting to reconnect to room ID: ' + reconnectingRoomId + ' as role: ' + JSON.stringify(roomId.role));
        
        for (const r of rooms) {
            if (r.roomId == reconnectingRoomId) {
                room = r;
                socket.join(reconnectingRoomId);
                console.log('player sucessfully reconnected to room: ' + r.roomId);
                providePlayerWordsSelected();
                updateRoomCount();
                break;
            }        
        }

        if(typeof room !== 'undefined') {
            room.stopRoomDeletionTimer()

            if(roomId.role == 'isHosting') { 
                player.isHosting = true;   
            } 
            else {
                player.isHosting = false;
            }
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

    function providePlayerInitialDictionary() {
        console.log('Joining player is fetching player game data');
        socket.emit('gameDictionary', room.initialDictionary);
        socket.emit('newGameState', room.gameState);
    }

    function providePlayerWordsSelected() {
        socket.emit('wordsSelected', { allWordsSelected: room.wordsSelected });
    }

    function updateRoomCount(){
        room.playersInRoom.push(player);
        socket.to(room.roomId).broadcast.emit('numberOfPlayersInRoomChanged', { playersInRoom: room.playersInRoom });
    }

    socket.on('gameDictionary', function (data) {
        if(typeof room !== 'undefined') 
        {
            room.initialDictionary = data;
            room.wordsSelected = room.initialDictionary.wordsAlreadySelected;

            console.log('Dictionary received on server: ' + JSON.stringify(room.initialDictionary));
            socket.to(room.roomId).broadcast.emit('gameDictionary', room.initialDictionary);

            if(synchTimer !== 'undefined')
            {
                clearInterval(synchTimer);
            }

            synchTimer = setInterval(function() {
                synchronizeTimeLeftinTurn()
            }, 5 * 1000);

        } else 
        {
            console.log('cant send initial game dictionary because not in room')
        }
    });

    socket.on('newGameState', function(newGameState) {
        if(typeof room !== 'undefined')        
        {
            console.log('previous game state: ' + JSON.stringify(room.gameState.currentGameState));
            console.log('new game state: ' + JSON.stringify(newGameState.currentGameState));

            if (JSON.stringify(room.gameState.currentGameState) !== JSON.stringify(newGameState.currentGameState)) {
                room.startTurnTimer();
            }

            room.gameState = newGameState;

            socket.to(room.roomId).broadcast.emit('newGameState', room.gameState);
        } else 
        {
            console.log('cant send new game state because not in room')
        }
    });

    socket.on('wordsSelected', function(wordsSelected) {
        if(typeof room !== 'undefined') 
        {
            var wordAlreadyInArray = false;

            for(const word of room.wordsSelected) {
                if(wordsSelected.wordSelected == word) {
                    wordAlreadyInArray = true;
                    break
                }
            }

            if(!wordAlreadyInArray) {
                console.log('word not yet in array of selected words, adding it...');
                room.wordsSelected.push(wordsSelected.wordSelected);
                console.log('words selected: ' + JSON.stringify(room.wordsSelected));
            }

            room.initialDictionary.wordsAlreadySelected = room.wordsSelected;
            socket.emit('allWordsSelected', {allWordsSelected: room.wordsSelected} );
            socket.to(room.roomId).broadcast.emit('wordsSelected', {allWordsSelected: room.wordsSelected});
        } else 
        {
            console.log('cant send words selected because not in room')
        }
    });

    socket.on('disconnect', function(reason) {
        console.log('A player has disconnected: ' + thisPlayerID);
        delete players[thisPlayerID];
        delete sockets[thisPlayerID];

        console.log('disconnect reason: ' + JSON.stringify(reason))

        if(typeof room !== "undefined") {

            for(var i = 0; i < room.playersInRoom.length; ++i) {
                if(room.playersInRoom[i].id == thisPlayerID) {
                    console.log('remove player: ' + thisPlayerID + ' from room: ' + room.roomId);
                    room.playersInRoom.splice(i, 1);
                    console.log('players left in room: ' + room.playersInRoom.length);
                    console.log(room.playersInRoom);
                    break;
                };
            };

            if(room.playersInRoom.length == 0) 
            {
                console.log('No one left in room, starting deletion timer for room: ' + room.roomId)
                
                clearInterval(room.turnTimer);
                clearInterval(synchTimer);

                room.startRoomDeletionTimer(function () {
                    console.log('room ' + room.roomId + ' is deleted');
                    room = null;
                    console.log('list of rooms remaining: ' + rooms);
                    console.log('number of rooms: ' + rooms.length);   
                });
            }
        }      
    });

    socket.on('restarting', function() {
        console.log('message to restart received on server');
        socket.to(room.roomId).broadcast.emit('restarting');
    });

    socket.on('appPaused', function() {
        console.log('application is paused');
    });

    function synchronizeTimeLeftinTurn(){
        if(this.room !== 'undefined')
        {
            console.log('synchronizing time');
            socket.to(room.roomId).broadcast.emit('timer', { timeTakenOnTurn: room.timeTakenOnTurn });
            socket.emit('timer', { timeTakenOnTurn : room.timeTakenOnTurn} );
        }        
    }
});