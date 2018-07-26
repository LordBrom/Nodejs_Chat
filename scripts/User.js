module.exports = class User  {
	constructor(i_id, i_userName, i_color) {
	    this.id = i_id;
	    this.userName = i_userName;
	    this.color = i_color;
	    this.connected = true;
	}
}
