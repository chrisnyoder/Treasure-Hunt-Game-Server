var ShortID = require('shortid');

module.exports = class Player {
    constructor() {
        this.username = '';
        this.id = ShortID.generate();
        this.isHosting = false; 
    }
}