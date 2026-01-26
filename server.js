const express = require('express');
const http = require('http');
const { Server } = require('socket.io');

const app = express();
const server = http.createServer(app);

// 限制上传大小为 10MB，防止发送大图时服务器崩溃
const io = new Server(server, {
    maxHttpBufferSize: 1e7 
});

// 托管首页
app.get('/', (req, res) => {
    res.sendFile(__dirname + '/index.html');
});

// 处理通讯逻辑
io.on('connection', (socket) => {
    console.log('新用户已连接');

    // 接收并转发消息包 (包含文字、图片和时间)
    socket.on('send message', (data) => {
        io.emit('receive message', data);
    });

    socket.on('disconnect', () => {
        console.log('用户已断开');
    });
});

// 使用云端端口或本地 3000 端口
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`服务器运行在端口: ${PORT}`);
});