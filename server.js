
const io = require('socket.io')(process.env.PORT || 52300, { pingTimeout: 20000 });
const Player = require('./player.js');
const Room = require('./room.js');

console.log('Server has started');
console.log(rooms.length);

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

                console.log('adding room object to rooms array: ' + JSON.stringify(room))
                rooms.push(room);
 
                socket.emit('roomId', { roomId: room.roomId });
                room.playersInRoom.push(player);

                console.log("number of players in room, server side: " + JSON.stringify(room.playersInRoom));
                socket.emit('numberOfPlayersInRoomChanged', { playersInRoom: room.playersInRoom });
            }
        });
    });

    socket.on('isJoining', function (data) {
        joiningRoomId = data.roomId;

        console.log('isJoining callback received');
        console.log('joining room ' + joiningRoomId + ' as captain');

        for (const r of rooms) {
            console.log('room id: ' + r.roomId);
            if (r.roomId == joiningRoomId) {
                room = r;
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

            providePlayerGameData();
            updateRoomCount();
        }   
    });

    socket.on('isJoiningMainBoard', function(data) {
        joiningRoomId = data.roomId;

        console.log('isJoiningMainBoard callback received');
        console.log('joining room: ' + joiningRoomId);

        for (const r of rooms) {
            if (r.roomId == joiningRoomId) {
                room = r;
                break;
            }
        }

        if (typeof room === 'undefined') {
            console.log('room doesnt exist');
            socket.emit('roomNotAvailable');
        } else {
            console.log('room exist, and the player is being connected');
            socket.join(joiningRoomId);
            
            providePlayerGameData();
            updateRoomCount();
            checkIfCrewMemberShouldStopDeletionTimer();
        }   
    });

    socket.on('reconnecting', function(roomId) {
        console.log('reconnecting callback received');
        console.log(JSON.stringify(roomId.role));

        var reconnectingRoomId = roomId.roomId;
        for (const r of rooms) {
            console.log('room Id in list ' + r.roomId);
            console.log('searching for room id: ' + reconnectingRoomId);
            if (r.roomId == reconnectingRoomId) {
                room = r;
                socket.join(reconnectingRoomId);
                console.log('player reconnected to room: ' + r.roomId);
                providePlayerGameData();
                updateRoomCount();
                break;
            }        
        }

        if(typeof room !== 'undefined') {
            if(roomId.role == 'isHosting') {    
                checkIfCrewMemberShouldStopDeletionTimer();
            } 
            else {
                player.isHosting = false;
            }
        }
    });

    function checkIfCrewMemberShouldStopDeletionTimer(){
        var playerAlreadyHostingRoom = false;

        for (const pl of room.playersInRoom) {
            console.log('player ID' + pl.id);
            if (pl.isHosting) {
                playerAlreadyHostingRoom = true;
                break;
            }
        }

        console.log('still a host left: ' + playerAlreadyHostingRoom);
        
        if(playerAlreadyHostingRoom == false) {
            console.log("stopping the deletion timer");
            room.stopRoomDeletionTimer()
        }
        player.isHosting = true;
    }

    function determineJoinedPlayerIndex() {
        var joinedPlayers = []
        for (var i = 0; i < room.playersInRoom.length; ++i) {
            if(!room.playersInRoom[i].isHosting) {
                joinedPlayers.push(room.playersInRoom[i])
            }
        }
        return (joinedPlayers.length - 1);
    }

    function providePlayerGameData() {
        console.log('Joining player is fetching player game data');
        socket.emit('gameDictionary', room.initialDictionary);
        socket.emit('wordsSelected', room.wordsSelected);
        socket.emit('newGameState', room.gameState);
    }

    function updateRoomCount(){
        room.playersInRoom.push(player);
        socket.broadcast.emit('numberOfPlayersInRoomChanged', { playersInRoom: room.playersInRoom });
    }

    socket.on('gameDictionary', function (data) {
        if(typeof room !== 'undefined') 
        {
            room.initialDictionary = data;

            console.log('Dictionary received on server: ' + JSON.stringify(room.initialDictionary));
            socket.to(room.roomId).broadcast.emit('gameDictionary', room.initialDictionary);
        } else 
        {
            console.log('cant send initial game dictionary because not in room')
        }
    });

    socket.on('newGameState', function(newGameState) {
        if(typeof room !== 'undefined')        
        {
            room.gameState = newGameState;

            console.log('new game state: ' + JSON.stringify(room.gameState));
            socket.to(room.roomId).broadcast.emit('newGameState', room.gameState);
        } else 
        {
            console.log('cant send new game state because not in room')
        }
    });

    socket.on('wordsSelected', function(wordSelected) {
        if(typeof room !== 'undefined') 
        {
            room.wordsSelected = wordSelected;
            room.initialDictionary.wordsSelected = wordSelected.wordsSelected;
            console.log('words selected: ' + JSON.stringify(room.wordsSelected));
            socket.to(room.roomId).broadcast.emit('wordsSelected', room.wordsSelected);
        } else 
        {
            console.log('cant send words selected because not in room')
        }
    });

    socket.on('disconnect', function(reason) {
        console.log('A player has disconnected: ' + thisPlayerID);
        delete players[thisPlayerID];
        delete sockets[thisPlayerID];

        console.log('disconnect reason' + JSON.stringify(reason))

        if(typeof room !== "undefined") {

            for(var i = 0; i < room.playersInRoom.length; ++i) {
                if(room.playersInRoom[i].id == thisPlayerID) {
                    console.log('remove player from room');
                    room.playersInRoom.splice(i, 1);
                    break;
                };
            };

            socket.emit('numberOfPlayersInRoomChanged', { playersInRoom: room.playersInRoom })
            socket.broadcast.emit('numberOfPlayersInRoomChanged', { playersInRoom: room.playersInRoom });

            var playerStillHosting = false;

            for (const pl of room.playersInRoom) {
                if (pl.isHosting) {
                    playerStillHosting = true;
                    break;
                }
            }

            console.log('players in room' + JSON.stringify(room.playersInRoom));
            
            if (!playerStillHosting) {
                console.log('no one is hosting, will destroy room soon');
                room.startRoomDeletionTimer(function() {
                    console.log('room' + room.roomId)
                    room = null;
                });
            }
        }   

        console.log('number of rooms: ' + rooms.length);      
    });

    socket.on('appPaused', function()
    {
        console.log('application is paused');
    })
});