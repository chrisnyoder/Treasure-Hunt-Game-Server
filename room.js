var roomBlackList = ['cunt', 'fuck', 'shit', 'dick', 'cock', 'puta', 'nggr', 'nigr']
global.roomIds = [];
global.rooms = [];

module.exports = class Room {
    
    constructor() {
        this.roomGenerationAttempts = 0; 
        this.roomId = '';
        this.roomArrayIndex; 
        this.initialDictionary = new Object();
        this.wordsSelected = []; 
        this.gameState = new Object();
        this.playersInRoom = [];
        this.turnTimer;
        this.timeTakenOnTurn = 0; 
        this.roomDestructionTimer;
    }

    generateRoomId(callBack) {
        
        console.log('generating room id');
        console.log('tryCounter is: ' + this.roomGenerationAttempts);

        var result = ''; 
        var numberOfCharacters = 4; 
        var charactersToChooseFrom = '123456789abcdefghijklmnpqrstuvwxyz'; 
        for(var i = numberOfCharacters; i > 0; --i) {
            result += charactersToChooseFrom[Math.floor(Math.random() * charactersToChooseFrom.length)]; 
        }; 
        this.checkIfRoomOnBlackList(result, callBack);
    }

    checkIfRoomOnBlackList(generatedRoomId, callBack) {
        var roomOnBlackList = false; 

        for(var i = 0; i < roomBlackList.length; i++) {
            var room = roomBlackList[i];
            if (room == generatedRoomId) {
                roomOnBlackList = true
                break;
            } 
        }

        if(!roomOnBlackList)
        {
            this.checkIfRoomIdAlreadyExist(generatedRoomId, callBack)
        } else 
        {
            this.generateRoomId(this.results);
        }
    }

    checkIfRoomIdAlreadyExist(generatedRoomId, callBack) {

        console.log('checking if room exist: ' + generatedRoomId);
        var roomAlreadyExist = false;

        for(var i = 0; i < roomIds.length; i++) {
            var room = roomIds[i];
            if(room == generatedRoomId) {
                roomAlreadyExist = true
                break;
            } 
        }

        if(this.roomGenerationAttempts < 6) {
            if (!roomAlreadyExist) {
                this.addRoomToThisInstanceAndGlobalArray(generatedRoomId, callBack);
                this.roomGenerationAttempts = 0; 
            } else {
                this.generateRoomId(this.results);
                this.roomGenerationAttempts += 1;
                console.log('tryCounter: ' + this.roomGenerationAttempts);
            }
        } else {
            console.log('no more rooms left');
        }
    }

    addRoomToThisInstanceAndGlobalArray(room, callBack) {

        console.log('adding room ID ' + room + ' to room ID array');

        this.roomId = room;
        roomIds.push(room);
        this.roomArrayIndex = (roomIds.length - 1);
        callBack();
    }

    startTurnTimer(){
        var self = this; 
        
        console.log('timer started');

        self.turnTimer = setInterval(function () {
            if(self.timeTakenOnTurn < 30) {
                self.timeTakenOnTurn += 1
                console.log('time elapsed: ' + self.timeTakenOnTurn);
            } 
        }, 1000);
    }

    toggleTurnTimer() {
        if (this.turnTimer !== 'undefined') {
            clearInterval(this.turnTimer);
            this.turnTimer = null;
        } else {
            this.startTurnTimer();
        }
    }

    resetTurnTimer() {
        if (this.turnTimer !== 'undefined') {
            clearInterval(this.turnTimer);
            this.turnTimer = null;
        }
        this.timeTakenOnTurn = 0;
        console.log('time interval now: ' + this.timeTakenOnTurn);
    }

    results(){
        console.log('roomId: ' + this.room);
    }

    startRoomDeletionTimer(callback) {
        this.roomDestructionTimer = setTimeout(function() {
                rooms.splice(this.roomArrayIndex, 1);
                roomIds.splice(this.roomArrayIndex, 1);
                callback();
        }, 3600000);
    }

    stopRoomDeletionTimer()
    {
        if(typeof this.roomDestructionTimer !== 'undefined')
        {
            console.log('deletion timer being cleared for room: ' + this.roomId);
            clearTimeout(this.roomDestructionTimer); 
        }
    }
}