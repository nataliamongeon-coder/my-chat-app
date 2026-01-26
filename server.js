const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

io.on('connection', (socket) => {
    socket.on('send message', (data) => {
        io.emit('receive message', data);
    });
});

// 优化点：process.env.PORT 是为了让云服务器能直接运行
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`服务器已启动：http://localhost:${PORT}`);
});