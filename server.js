let static = require('node-static'); 

let http = require('http');

let port = process.env.PORT;
let directory = __dirname + '/public';

if((typeof port == 'undefined') || (port === null)){
    port = 8080;
    directory = './public';
}

let file = new static.Server(directory);

let app = http.createServer(
    function(request,response){
        request.addListener('end',
            function(){
                 file.serve(request,response);
        }
        ).resume();
    }
).listen(port);

console.log('the server is running');






/*web socket */
/*registery of players */

let players = [];

const { Server } = require("socket.io");
const io = new Server(app);

io.on('connection', (socket) => {

function serverLog(...messages){
    io.emit('log', ['**** Message from the server:\n']);
    messages.forEach((item) => {
        io.emit('log',['****\t'+item]);
        console.log(item);
    });
}

serverLog('a page connected to the server: '+socket.id);

/*join room */
socket.on('join_room', (payload) => {
    serverLog('Server received a command','\'join_room\'',JSON.stringify(payload));
    if ((typeof payload == 'undefined') || (payload === null)){
        response = {};
        response.result = 'fail';
        response.message = 'client did not send a payload';
        socket.emit('join_room_response',response);
        serverLog('join_room command failed', JSON.stringify(response));
        return;
    }
    let room = payload.room;
    let username = payload.username;
    if ((typeof room == 'undefined') || (room === null)){
        response = {};
        response.result = 'fail';
        response.message = 'client did not send a valid room to join';
        socket.emit('join_room_response',response);
        serverLog('join_room command failed', JSON.stringify(response));
        return;
    }
    if ((typeof username == 'undefined') || (username === null)){
        response = {};
        response.result = 'fail';
        response.message = 'client did not send a valid username to join the chat room';
        socket.emit('join_room_response',response);
        serverLog('join_room command failed', JSON.stringify(response));
        return;
    }

    socket.join(room);
    io.in(room).fetchSockets().then((sockets) =>{

        if ((typeof sockets == 'undefined') || (sockets === null) || !sockets.includes(socket)){
            response = {};
            response.result = 'fail';
            response.message = 'server internal error joining chat';
            socket.emit('join_room_response',response);
            serverLog('join_room command failed', JSON.stringify(response));
        }

        else{
            players[socket.id] = {
                username: username,
                room: room
            }
            for(const member of sockets){
                let room = players[member.id].room;
                response = {
                    result: 'sucess',
                    socket_id: member.id,
                    room: players[member.id].room,
                    username: players[member.id].username,
                    count: sockets.length,
                }
            io.of('/').to(room).emit('join_room_response', response);
            serverLog('join_room succeeded', JSON.stringify(response));

        }
    }
        });
});


/*Invite message */
socket.on('invite', (payload) => {
    serverLog('Server received a command','\'invite\'',JSON.stringify(payload));
    if ((typeof payload == 'undefined') || (payload === null)){
        response = {};
        response.result = 'fail';
        response.message = 'client did not send a payload';
        socket.emit('invite_response',response);
        serverLog('invite command failed', JSON.stringify(response));
        return;
    }
    let requested_user = payload.requested_user;
    let room = players[socket.id].room;
    let username = players[socket.id].username;
    if ((typeof requested_user == 'undefined') || (requested_user === null) || (requested_user === "")){
        response = {
            result: 'fail',
            message:'client did not request a valid user to invite to play',
        }
        socket.emit('invite_response',response);
        serverLog('invite command failed', JSON.stringify(response));
        return;
    }
    if ((typeof room == 'undefined') || (room === null) || (room === "")) {
    response = {
        result: 'fail',
        message:'user that was invited is not in a room',
    }
        socket.emit('invite_response',response);
        serverLog('invite command failed', JSON.stringify(response));
        return;
    }
    if ((typeof username == 'undefined') || (room === null) || (username === "")) {
        response = {
            result: 'fail',
            message:'user that was invited does not have a name registered',
        }
            socket.emit('invite_response',response);
            serverLog('invite command failed', JSON.stringify(response));
            return;
        }

        /*make sure player is present */
    io.in(room).allSockets().then((sockets) =>{
        /*invitees not in room */
        if ((typeof sockets == 'undefined') || (sockets === null) || !sockets.has(requested_user)){
            response = {
                result: 'fail',
                message:'user that was invited is no longer in the room',
            }
            socket.emit('invite_response',response);
            serverLog('invite command failed', JSON.stringify(response));
            return;
        }
/*invitee is in the room */
        else{
            response = {
                result: 'success',
                socket_id: requested_user
            }
            socket.emit("invite_response", response);
            response = {
                result: 'success',
                socket_id: socket.id
            }
            socket.to(requested_user).emit("invited", response);
            serverLog('invite command succeeded', JSON.stringify(response));

        }
    }
        );
});

socket.on('disconnect', () => {
    serverLog('a page disconnected from the server: '+socket.id);
    if((typeof players[socket.id] != 'undefined') && (players[socket.id] != null)){
        let payload = {
            username: players[socket.id].username,
            room: players[socket.id].room,
            count: Object.keys(players).length - 1,
            socket_id: socket.id,
        };

        let room = players[socket.id].room;
        delete players[socket.id];
        /*who left the room */
        io.of("/").to(room).emit('player_disconnected',payload);
        serverLog('player_disconnected succeeded ',JSON.stringify(payload));
    }
});

/*send chat message */
socket.on('send_chat_message', (payload) => {
    serverLog('Server received a command','\'send_chat_message\'',JSON.stringify(payload));
    if ((typeof payload == 'undefined') || (payload === null)){
        response = {};
        response.result = 'fail';
        response.message = 'client did not send a payload';
        socket.emit('send_chat_message_response',response);
        serverLog('send_chat_message_response command failed', JSON.stringify(response));
        return;
    }
    let room = payload.room;
    let username = payload.username;
    let message = payload.message;
    if ((typeof room == 'undefined') || (room === null)){
        response = {};
        response.result = 'fail';
        response.message = 'client did not send a valid room to message';
        socket.emit('send_chat_message',response);
        serverLog('send_chat_message command failed', JSON.stringify(response));
        return;
    }
    if ((typeof username == 'undefined') || (username === null)){
        response = {};
        response.result = 'fail';
        response.message = 'client did not send a valid username as a message source';
        socket.emit('send_chat_message',response);
        serverLog('send_chat_message command failed', JSON.stringify(response));
        return;
    }
    if ((typeof message == 'undefined') || (message === null)){
        response = {};
        response.result = 'fail';
        response.message = 'client did not send a valid message';
        socket.emit('send_chat_message',response);
        serverLog('send_chat_message command failed', JSON.stringify(response));
        return;
    }

    let response = {};
    response.result = 'success';
    response.username = username;
    response.room = room;
    response.message = message;
    io.of('/').to(room).emit('send_chat_message_response',response);
    serverLog('send_chat_message command succeeded', JSON.stringify(response));

});
});