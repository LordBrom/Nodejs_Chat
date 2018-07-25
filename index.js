var app = require('express')();
var server = require('http').Server(app);
var fs = require('fs');
// Loading socket.io
var io = require('socket.io')(server);

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
                params = data.message.substring(firstSpace)
            }

            handleCommand(socket, command, params)

        } else {
            sendChat(socket, data.message, socket.un, socket.color, true, true, false)
            sendChat(socket, data.message, socket.un, socket.color, true, false, true)
        }
    })

    socket.on('un', function(data){
        if (!data.username){
            socket.emit('fail', {cause: 'data.username not defined'})
            return;
        }
        socket.color = colorOptions[Math.floor(Math.random() * Math.floor(colorOptions.length))]
        socket.un = data.username
        console.log('User name set to ' + socket.un);

        sendChat(socket, 'You have joined as ' + data.username + '!', socket.un, socket.color, false, true, false)
        sendChat(socket, data.username + ' has joined!',              socket.un, socket.color, false, true, true)
    })

    socket.on('disconnect', function(data){
    	if (!socket.un){
            console.log('A user has connected');
    		return;
    	} else {
            console.log(socket.un + ' has disconnected');
        }
        sendChat(socket, socket.un + ' has disconnected!', socket.un, socket.color, false, true, true)
    })
});

console.log('ready')

var findSocket = function(userName){
    for (var i in io.sockets.connected) {
        var soc = io.sockets.connected[i]
        if (soc.un && soc.un.toLowerCase() == userName.toLowerCase()){
            return soc
        }
    }
}


var sendChat = function(socket, msg, user, color, showName, isSelf, broadcast) {
    if (broadcast){
        socket.broadcast.emit('chat', {"msg": msg, "un": user, "timestamp": new Date(), "showName": showName, "isSelf": isSelf, "color": color})
    } else {
    	socket.emit('chat',           {"msg": msg, "un": user, "timestamp": new Date(), "showName": showName, "isSelf": isSelf, "color": color})
    }
}


var handleCommand = function(socket, command, params) {
    switch(command.toLowerCase()) {
        case 'help':
            var helpMsg = "Usable commands:<br /> help - Shows all usable commands<br />list - Shows all connected users<br />whisper,w &lt;username&gt; &lt;message&gt; - Sends a message only specified user can see.<br />"
            sendChat(socket, helpMsg, "admin", "#000000", false, true, false)
            break;
        case 'list':
            var userList = '';
            var userCount = 0;

            for (var i in io.sockets.connected) {
                var soc = io.sockets.connected[i]
                if (soc.un){
                    userList += '<span style="color:' + soc.color + '">' + soc.un + '</span><br />';
                    userCount++;
                }
            }
            sendChat(socket, userCount + " Connected user(s) <br />" + userList, "admin", "#000000", false, true, false)
            break;
        case 'w':
        case 'whisper':
            var spaceHolder = params.indexOf(" ", 1)

            if (spaceHolder == -1) {
                break; // no message
            } else {
                whisperName = params.substring(1, spaceHolder)
                whisperMessage = params.substring(spaceHolder)
            }

            whisperSocket = findSocket(whisperName);

            if (whisperSocket){
                whisperSocket.emit('chat',    {"msg": whisperMessage, "un": socket.un, "timestamp": new Date(), "showName": true, "isSelf": false, "color": socket.color, whisper: true})
                socket.emit('chat', {"msg": whisperMessage, "un": socket.un, "timestamp": new Date(), "showName": true, "isSelf": false, "color": socket.color, whisper: true})
            } else {
                socket.emit('chat',           {"msg": "User not found", "un": "admin", "timestamp": new Date(), "showName": false, "isSelf": false, "color": "#000000"})
            }

            break;
        default:
            sendChat(socket, "That is not a known command. use /help for a complete list of commands.", "admin", "#000000", false, true, false)
    }
}