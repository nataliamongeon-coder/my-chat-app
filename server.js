const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const mongoose = require('mongoose');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = new Server(server, { maxHttpBufferSize: 1e7 });

// --- 1. 数据库连接 (已填入您的专属地址和密码) ---
const DB_URL = 'mongodb+srv://pai:aafc1688@admin.4p3yf9x.mongodb.net/?appName=admin'; 

mongoose.connect(DB_URL)
    .then(() => console.log("✅ 数据库连接成功！历史消息功能已激活"))
    .catch(err => console.error("❌ 数据库连接失败，请检查密码:", err));

// 定义消息模型
const Msg = mongoose.model('Msg', { user: String, type: String, content: String, time: String });

// --- 2. 图片存储逻辑 (兼容 Render 临时目录) ---
const uploadDir = path.join('/tmp', 'uploads');
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir, { recursive: true });
const upload = multer({ storage: multer.diskStorage({
    destination: (req, file, cb) => cb(null, uploadDir),
    filename: (req, file, cb) => cb(null, Date.now() + path.extname(file.originalname))
})});

app.use('/uploads', express.static(uploadDir));
app.get('/', (req, res) => res.sendFile(__dirname + '/index.html'));

// 图片上传接口
app.post('/upload', upload.single('chatImage'), (req, res) => {
    if (!req.file) return res.status(400).send('上传失败');
    res.json({ url: `/uploads/${req.file.filename}` });
});

// --- 3. 实时通讯逻辑 ---
io.on('connection', async (socket) => {
    // 用户上线，自动从云端数据库拉取最近 50 条聊天记录
    try {
        const history = await Msg.find().sort({_id: -1}).limit(50);
        socket.emit('history', history.reverse());
    } catch (e) { console.log("加载历史记录出错:", e); }

    // 接收新消息：先存入数据库，再发给所有人
    socket.on('send message', async (data) => {
        try {
            const newMsg = new Msg(data);
            await newMsg.save(); // 这行代码保证了“退出后也有记录”
            io.emit('receive message', data);
        } catch (e) { console.log("保存消息出错:", e); }
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => console.log(`🚀 聊天 App 后端已在端口 ${PORT} 启动`));