var express = require('express');
var app = express();
var server = require('http').Server(app);
// Loading socket.io
var io = require('socket.io')(server);

var path    = require('path');
const uuidv1 = require('uuid/v1');

var ChromecastAPI = require('chromecast-api')

app.use("/styles",  express.static(path.join(__dirname, 'styles')));
app.use("/scripts",  express.static(path.join(__dirname, 'scripts')));

app.get('/', function(req, res){
  res.sendFile(__dirname + '/index.html');
});

server.listen(8080);


var browser = new ChromecastAPI.Browser()
var chromecastConnection = false;

// browser.on('deviceOn', function (device) {

//     if (device.config.name = 'Living Room TV')
//     {
//         console.log('Connecting to ' + device.config.name)
//         chromecastConnection = device;
//     }

// })



var colorOptions = ['#3399FF', '#6699FF', '#009933', '#66FF33', '#99FFFF', '#99FF00', '#CC99FF', '#FF99FF', '#FF9900', '#FFCC33']

io.sockets.on('connection', function (socket) {
    console.log('A user has connected');
    socket.emit('prompt-un')

    socket.on('message', function(data){
        try {
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

                handleCommand(socket, command, params.trimLeft())

            } else {
                sendChat(socket, data.message, socket.un, socket.color, false, {showName: true, isSelf: true})
                sendChat(socket, data.message, socket.un, socket.color, true,  {showName: true, isSelf: false})
            }
        }
        catch(error) {
            socket.emit('fail', {error})
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

        sendChat(socket, 'You have joined as ' + data.username + '!', "admin", socket.color, false, {showName: false, isSelf: true, whisper: true})
        sendChat(socket, data.username + ' has joined!',              "admin", socket.color, true, {showName: false, isSelf: true, whisper: true})
    })

    socket.on('disconnect', function(data){
        if (!socket.un){
            return;
        }
        console.log(socket.un + ' has disconnected');
        sendChat(socket, socket.un + ' has disconnected!', "admin", socket.color, true, {showName: false, isSelf: true, whisper: true})
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

    console.log(user + ": " + msg)

    if (broadcast){
        socket.broadcast.emit('chat', {"id": uuidv1(), "socketID":socket.id, "msg": msg, "un": user, "timestamp": new Date(), "showName": options.showName, "isSelf": options.isSelf, "color": color, "whisper": options.whisper})
    } else {
        socket.emit('chat',           {"id": uuidv1(), "socketID":socket.id, "msg": msg, "un": user, "timestamp": new Date(), "showName": options.showName, "isSelf": options.isSelf, "color": color, "whisper": options.whisper})
    }
}

var handleCommand = function(socket, command, params) {
    switch(command.toLowerCase()) {
        case 'test':

            break;
        case 'help':
            var helpMsg = "Usable commands:<br /> help - Shows all usable commands<br />list - Shows all connected users<br />whisper,w &lt;username&gt; &lt;message&gt; - Sends a message only specified user can see.<br />color &lt;6 digit hexadecimal value &gt; - Sets your chat color to entered hex value.<br />"
            sendChat(socket, helpMsg, "admin", "#000000", false, {showName: false, isSelf: true, whisper: true})
            break;
        case 'color':
            if (params.substring(0,1) == '#') {
                params = params.substring(1);
            }
            if (checkForHex(params))
            {
                sendChat(socket, "Your chat color has been set to <span style='color:#" + params + "'>#" + params + "</span>.", "admin", "#000000", false, {showName: false, isSelf: true, whisper: true})
                socket.color = "#"+params;
                // socket.emit('setColor', {socketID:socket.id, color:"#"+params} )
            } else {
                sendChat(socket, "Valid usage of color command</br>/color <6 digit hexadecimal value>", "admin", "#000000", false, {showName: false, isSelf: true, whisper: true})
            }
            break;
        case 'list':
            sendChat(socket, listUserNames(), "admin", "#000000", false, {showName: false, isSelf: true, whisper: true})
            break;
        case 'w':
        case 'whisper':
            var spaceHolder = params.indexOf(" ")

            if (spaceHolder == -1) {
                break; // no message
            } else {
                whisperName = params.substring(0, spaceHolder)
                whisperMessage = params.substring(spaceHolder)
            }

            whisperSocket = findSocket(whisperName);

            if (whisperSocket){
                sendChat(whisperSocket, whisperMessage, socket.un, socket.color, false, {showName: true, isSelf: false, whisper: true})
                sendChat(socket,        whisperMessage, socket.un, socket.color, false, {showName: true, isSelf: false, whisper: true})
            } else {
                sendChat(socket, "User not found", "admin", "#000000", false, {showName: false, isSelf: false, whisper: true})
            }

            break;

            // Chromecast Commands start
        case 'connect':
            if (!chromecastConnection){
                sendChat(socket, "No Chromecast connected. Use the '/connect <chromecast name>' command to connect to one.", "admin", "#000000", false, {showName: false, isSelf: false, whisper: true})
            }

            var connectResult = connectToChromecast(params)
            if (connectResult)
            {
                sendChat(socket, "Now connected to " + chromecastConnection.config.name, "admin", "#000000", false, {showName: false, isSelf: false, whisper: true})
            } else {
                sendChat(socket, "Could not find a Chrome cast with the name '" + params + "'", "admin", "#000000", false, {showName: false, isSelf: false, whisper: true})
            }

            break;
        case 'play':
            if (!chromecastConnection){
                sendChat(socket, "No Chromecast connected. Use the '/connect <chromecast name>' command to connect to one.", "admin", "#000000", false, {showName: false, isSelf: false, whisper: true})
            }

            chromecastConnection.play(params)

            sendChat(socket, chromecastConnection.config.name + " now playing", "admin", "#000000", false, {showName: false, isSelf: false, whisper: true})
            break;
        case 'stop':
            if (!chromecastConnection){
                sendChat(socket, "No Chromecast connected. Use the '/connect <chromecast name>' command to connect to one.", "admin", "#000000", false, {showName: false, isSelf: false, whisper: true})
            }

            chromecastConnection.stop(params)

            sendChat(socket, chromecastConnection.config.name + " stopped", "admin", "#000000", false, {showName: false, isSelf: false, whisper: true})
            break;
        case 'pause':
            if (!chromecastConnection){
                sendChat(socket, "No Chromecast connected. Use the '/connect <chromecast name>' command to connect to one.", "admin", "#000000", false, {showName: false, isSelf: false, whisper: true})
            }

            chromecastConnection.pause(params)
            sendChat(socket, chromecastConnection.config.name + " paused", "admin", "#000000", false, {showName: false, isSelf: false, whisper: true})
            break;
        case 'unpause':
            if (!chromecastConnection){
                sendChat(socket, "No Chromecast connected. Use the '/connect <chromecast name>' command to connect to one.", "admin", "#000000", false, {showName: false, isSelf: false, whisper: true})
            }
            sendChat(socket, chromecastConnection.config.name + " unpaused", "admin", "#000000", false, {showName: false, isSelf: false, whisper: true})

            chromecastConnection.unpause(params)
            break;

        case 'volume':
            if (parseFloat(params) < 0 || parseFloat(params) > 1) {
                sendChat(socket, 'must be between 0 and 1', "admin", "#000000", false, {showName: false, isSelf: false, whisper: true})
                return;
            }

            if (!chromecastConnection){
                sendChat(socket, "No Chromecast connected. Use the '/connect <chromecast name>' command to connect to one.", "admin", "#000000", false, {showName: false, isSelf: false, whisper: true})
            }

            console.log("test")
            chromecastConnection.setVolume(parseFloat(params), function (err, newVol) {
                if (err) {
                    sendChat(socket, 'There was an error changing the volume.', "admin", "#000000", false, {showName: false, isSelf: false, whisper: true})
                } else {
                    sendChat(socket, "Volume for " + chromecastConnection.config.name + " set to " + params + "%", "admin", "#000000", false, {showName: false, isSelf: false, whisper: true})
                }
            })



            // Chromecast Commands end

        default:
            sendChat(socket, "That is not a known command. use /help for a complete list of commands.", "admin", "#000000", false, {showName: false, isSelf: true, whisper: true})
    }
}

var checkForHex = function(str){
    var re = /[0-9A-Fa-f]{6}/g;

    console.log("checkForHex", str)

    if (re.test(str) && (str.length == 6|| str.length == 3))
    {
        return true;
    } else {
        return false;
    }
}

var connectToChromecast = function(chromecastName) {
    browser.on('deviceOn', function (device) {

        if (device.config.name == chromecastName)
        {
            console.log('Connecting to ' + device.config.name)
            chromecastConnection = device;
            return true;
        }
    })
    return false;
}


connectToChromecast('Living Room TV')