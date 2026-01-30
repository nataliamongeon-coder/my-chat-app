const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { 
    maxHttpBufferSize: 1e7, // 允许传输最大 10MB 的图片
    cors: { origin: "*" } 
});

// --- 1. 数据库配置 (拿到地址后填在这里) ---
const MONGO_URI = '这里填入你申请到的mongodb+srv://连接字符串'; 

if (MONGO_URI.startsWith('mongodb')) {
    mongoose.connect(MONGO_URI)
        .then(() => console.log('✅ 数据库连接成功'))
        .catch(err => console.error('❌ 数据库连接失败:', err));
}

// 定义消息保存模型
const MsgSchema = new mongoose.Schema({
    user: String,
    type: String,
    content: String,
    time: String,
    id: String
});
const Msg = mongoose.model('Msg', MsgSchema);

// --- 2. 修复图片存储：使用临时目录 ---
const uploadDir = path.join('/tmp', 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}
const storage = multer.diskStorage({
    destination: (req, file, cb) => { cb(null, uploadDir); },
    filename: (req, file, cb) => { cb(null, Date.now() + path.extname(file.originalname)); }
});
const upload = multer({ storage: storage });

app.use('/uploads', express.static(uploadDir));
app.get('/', (req, res) => { res.sendFile(__dirname + '/index.html'); });

// 图片上传接口
app.post('/upload', upload.single('chatImage'), (req, res) => {
    if (!req.file) return res.status(400).json({ error: '上传失败' });
    res.json({ url: `/uploads/${req.file.filename}` });
});

// --- 3. 实时通讯逻辑 ---
io.on('connection', async (socket) => {
    console.log('一位用户已连接');

    // 如果数据库已连，自动拉取最近 50 条记录
    if (mongoose.connection.readyState === 1) {
        const history = await Msg.find().sort({_id: -1}).limit(50);
        socket.emit('history', history.reverse());
    }

    socket.on('send message', async (data) => {
        // 保存消息到数据库
        if (mongoose.connection.readyState === 1) {
            await new Msg(data).save();
        }
        // 全体广播
        io.emit('receive message', data);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => { console.log(`服务已运行在端口 ${PORT}`); });