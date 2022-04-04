const express = require('express');
const app = express();
const http = require('http');
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server);

let clients = [];
let messages = [];
let unserved = [];

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    clients.push(socket.id);
    console.log('a user connected, clients:', clients);

    // console.log("first socket is:", io.sockets.sockets.get(clients[0]).id);

    if (socket.id !== clients[0]) {
        console.log("requesting messages");
        io.sockets.sockets.get(clients[0]).emit("give messages");
        unserved.push(socket.id);
    }

    socket.on("take messages", (msgs) => {
        messages = JSON.parse(msgs)
        unserved.forEach((clientId) =>
            messages.forEach((msg) => io.sockets.sockets.get(clientId).emit('chat message', msg)))
    });

    socket.on('disconnect', () => {
        io.emit("user disconnect", "someone disconnected");
        clients = clients.filter((id) => id !== socket.id)
        console.log('user disconnected, clients:', clients);
    });

    socket.on('chat message', (msg) => {
        socket.broadcast.emit('chat message', msg);
        console.log('message: ' + msg);
    });

    socket.emit("init", "welcome");
});

server.listen(3000, () => {
    console.log('listening on *:3000');
});