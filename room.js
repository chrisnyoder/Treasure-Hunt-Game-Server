
var roomBlackList = ['cunt', 'fuck', 'shit', 'dick', 'cock', 'puta', 'nggr', 'nigr']
global.roomIds = [];
global.rooms = [];

module.exports = class Room {
    
    constructor() {
        this.roomGenerationAttempts = 0; 
        this.roomId = '';
        this.roomArrayIndex; 
        this.initialDictionary = new Object();
        this.wordsSelected = new Object(); 
        this.gameState = new Object();
    }

    generateRoomId(callBack) {
        
        console.log('generating room id');
        console.log('tryCounter is: ' + this.roomGenerationAttempts);

        var result = ''; 
        var numberOfCharacters = 4; 
        var charactersToChooseFrom = '0123456789abcdefghijklmnopqrstuvwxyz'; 
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
                this.addRoomToInstanceAndArray(generatedRoomId, callBack);
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

    addRoomToInstanceAndArray(room, callBack) {

        console.log('adding room to array');

        this.roomId = room;
        roomIds.push(room);
        this.roomArrayIndex = (roomIds.length - 1);
        callBack();
    }

    results(){
        console.log('roomId: ' + this.room);
    }
}