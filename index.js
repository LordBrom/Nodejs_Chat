var app = require('express')();
var server = require('http').Server(app);
// Loading socket.io
var io = require('socket.io')(server);

// app.get('/', function(req, res){
//   res.sendFile(__dirname + '../index.html');
// });

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
            sendChat(socket, data.message, socket.un, socket.color, false, {showName: true, isSelf: true})
            sendChat(socket, data.message, socket.un, socket.color, true,  {showName: true, isSelf: false})
        }
    })

    socket.on('un', function(data){
        if (!data.username){
            socket.emit('fail', {cause: 'data.username not defined'})
            return;
        }
        var nameCheck = findSocket(data.username);
        if (nameCheck) {
            console.log("name found");
            socket.emit('alert', "The username you entered is taken. Please enter a different one.")
            socket.emit('prompt-un')
            return;
        }

        socket.color = colorOptions[Math.floor(Math.random() * Math.floor(colorOptions.length))]
        socket.un = data.username
        console.log('User name set to ' + socket.un);

        sendChat(socket, 'You have joined as ' + data.username + '!', "admin", socket.color, false, {showName: false, isSelf: true})
        sendChat(socket, data.username + ' has joined!',              "admin", socket.color, true, {showName: false, isSelf: true})
    })

    socket.on('disconnect', function(data){
        if (!socket.un){
            return;
        }
        console.log(socket.un + ' has disconnected');
        sendChat(socket, socket.un + ' has disconnected!', "admin", socket.color, true, {showName: false, isSelf: true})
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
    return false;
}

// Used for /list command
var listUserNames = function() {
    var userList = '';
    var userCount = 0;
    for (var i in io.sockets.connected) {
        var soc = io.sockets.connected[i]
        if (soc.un && soc.un.length){
            userList += '<span style="color:' + soc.color + '">' + soc.un + '</span><br />';
            userCount++;
        }
    }
    return userCount + " Connected user(s) <br />" + userList
}

var sendChat = function(socket, msg, user, color, broadcast, options) {

    var defaultOptions = {showName: true, isSelf: false, whisper: false}

    options = Object.assign(defaultOptions, options)

    console.log(user + ":" + msg)

    if (broadcast){
        socket.broadcast.emit('chat', {"msg": msg, "un": user, "timestamp": new Date(), "showName": options.showName, "isSelf": options.isSelf, "color": color, "whisper": options.whisper})
    } else {
        socket.emit('chat',           {"msg": msg, "un": user, "timestamp": new Date(), "showName": options.showName, "isSelf": options.isSelf, "color": color, "whisper": options.whisper})
    }
}

var handleCommand = function(socket, command, params) {
    switch(command.toLowerCase()) {
        case 'help':
            var helpMsg = "Usable commands:<br /> help - Shows all usable commands<br />list - Shows all connected users<br />whisper,w &lt;username&gt; &lt;message&gt; - Sends a message only specified user can see.<br />"
            sendChat(socket, helpMsg, "admin", "#000000", false, {showName: false, isSelf: true})
            break;
        case 'list':
            sendChat(socket, listUserNames(), "admin", "#000000", false, {showName: false, isSelf: true})
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
                sendChat(whisperSocket, whisperMessage, socket.un, socket.color, false, {showName: true, isSelf: false, whisper: true})
                sendChat(socket,        whisperMessage, socket.un, socket.color, false, {showName: true, isSelf: false, whisper: true})
            } else {
                sendChat(socket, "User not found", "admin", "#000000", false, {showName: false, isSelf: false})
            }

            break;
        default:
            sendChat(socket, "That is not a known command. use /help for a complete list of commands.", "admin", "#000000", false, {showName: false, isSelf: true})
    }
}