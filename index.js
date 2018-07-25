var app = require('express')();
var server = require('http').Server(app);
var fs = require('fs');
// Loading socket.io
var io =require('socket.io')(server);

server.listen(8080);

var colorOptions = ['#3399FF', '#6699FF', '#009933', '#66FF33', '#99FFFF', '#99FF00', '#CC99FF', '#FF99FF', '#FF9900', '#FFCC33']

io.sockets.on('connection', function (socket) {
    console.log('A user has connected');
	socket.emit('prompt-un')

    socket.on('message', function(data){
    	if (!data.message){
    		socket.emit('fail', {cause: 'data.message not defined'})
    		return;
    	}
    	if (!socket.un)
    	{
    		socket.emit('prompt-un')
    		return;
    	}

        if (data.message.substring(0, 1) == '/')
        {
            var command = ''
            var params = ''
            var firstSpace = (data.message).indexOf(" ")
            if (firstSpace == -1) {
                command = data.message.substring(1)
            } else {
                command = data.message.substring(1, firstSpace)
                params = date.message.substring(firstSpace)
            }

            switch(command.toLowerCase()) {
                case 'help':
                    socket.emit('chat',           {"msg": "Usable commands<br /> help - Shows all usable commands<br />list - Shows all connected users<br />", "un": socket.un, "timestamp": new Date(), "showName": false, isSelf: true, color: "#000000"})
                    break;
                case 'list':
                    var userList = '';

                    for (var i in io.sockets.connected) {
                        var soc = io.sockets.connected[i]
                        if (soc.un){
                            userList += '<span style="color:' + soc.color + '">' + soc.un + '</span><br />';
                        }
                    }

                    socket.emit('chat',           {"msg": "Connected users <br />" + userList, "un": socket.un, "timestamp": new Date(), "showName": false, isSelf: true, color: "#000000"})
                    break;
                default:
                    socket.emit('chat',           {"msg": "That is not a known command. use /help for a complete list of commands.", "un": socket.un, "timestamp": new Date(), "showName": false, isSelf: true, color: "#000000"})
            }
        } else {
        	socket.emit('chat',           {"msg": data.message, "un": socket.un, "timestamp": new Date(), "showName": true, isSelf: true, color: socket.color})
        	socket.broadcast.emit('chat', {"msg": data.message, "un": socket.un, "timestamp": new Date(), "showName": true, isSelf: false, color: socket.color})
        }
    })

    socket.on('un', function(data){
        if (!data.username){
            socket.emit('fail', {cause: 'data.message not defined'})
        }
        socket.color = colorOptions[Math.floor(Math.random() * Math.floor(colorOptions.length))]
        socket.un = data.username
        console.log('User name set to ' + socket.un);

        socket.emit('chat', {"msg": 'You have joined as ' + data.username + '!', "un": socket.un, "timestamp": new Date(), "showName": false, isSelf: true, color: socket.color})
        socket.broadcast.emit('chat', {"msg": data.username + ' has joined!', "un": socket.un, "timestamp": new Date(), "showName": false, isSelf: true, color: socket.color})
    })

    socket.on('disconnect', function(data){
    	if (!socket.un){
            console.log('A user has connected');
    		return;
    	} else {
            console.log(socket.un + ' has disconnected');
        }
    	socket.broadcast.emit('chat', {"msg": data.username + ' has disconnected!', "un": socket.un, "timestamp": new Date(), "showName": false, isSelf: true, color: socket.color})
    })
});

console.log('ready')