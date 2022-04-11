const express = require('express');
const app = express();
const https = require('https');
const http = require('http');
const maxFileSize = process.env.MAXFILESIZE || 1e+9;
const port = process.env.PORT || 3000;

let clients = [];
let messages = [];
let unserved = [];

const byteCount = (s) => encodeURI(s).split(/%..|./).length - 1;

// const fs = require('fs');
// const cors = require('cors');
// app.use(cors());
// const key = fs.readFileSync('selfsigned.key');
// const cert = fs.readFileSync('selfsigned.crt');
// const options = {
//     key: key,
//     cert: cert
// };

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// const server = https.createServer(options, app);
const server = http.createServer(app);
const { Server } = require("socket.io");
const io = new Server(server, {
    maxHttpBufferSize: maxFileSize,
});

io.on('connection', (socket) => {
    clients.push(socket.id);
    console.log('a user connected, clients:', clients);

    // console.log("first socket is:", io.sockets.sockets.get(clients[0]).id);

    if (socket.id !== clients[0]) {
        console.log("requesting messages...");
        io.sockets.sockets.get(clients[0]).emit("give messages");
        unserved.push(socket.id);
        unserved.forEach((clientId) => io.sockets.sockets.get(clientId).emit('loading'));
    }

    socket.on("take messages", (msgs) => {
        // console.log(byteCount(msgs));
        if (byteCount(msgs) > maxFileSize) {
            clients.forEach((clientId) => {
                io.sockets.sockets.get(clientId).emit("will disconnect all");
                io.sockets.sockets.get(clientId).disconnect();
            })
            clients = [];
        } else {
            messages = JSON.parse(msgs);
            unserved.forEach((clientId) => {
                messages.forEach((msg) => io.sockets.sockets.get(clientId).emit('chat message', msg));
                io.sockets.sockets.get(clientId).emit('stop loading');
            });
        }
        unserved = [];
        messages = [];
    });

    socket.on('disconnect', () => {
        io.emit("user disconnect", "someone disconnected");
        clients = clients.filter((id) => id !== socket.id)
        console.log('user disconnected, clients:', clients);
    });

    socket.on('chat message', (msg) => {
        if (byteCount(msg) > maxFileSize) {
            clients.forEach((clientId) => {
                io.sockets.sockets.get(clientId).emit("will disconnect all");
                io.sockets.sockets.get(clientId).disconnect();
            })
            clients = [];
            unserved = [];
            messages = [];
        } else {
            socket.broadcast.emit('chat message', msg);
            // console.log('message: ' + msg);
        }
    });

    socket.on('sending', () => {
        socket.broadcast.emit('loading');
    });

    socket.on('finished sending', () => {
        socket.broadcast.emit('stop loading');
    });

    socket.emit("init", "welcome");
});

server.listen(port, () => {
    console.log(`Port: ${port}`);
});