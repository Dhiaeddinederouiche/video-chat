const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["*"],
        credentials: true
    },
    transports: ['websocket', 'polling']
});

// Middleware
app.use(express.static(path.join(__dirname)));
app.use(express.json());

// CORS configuration
app.use((req, res, next) => {
    res.header("Access-Control-Allow-Origin", "*");
    res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
    next();
});

// Store connected users
const users = new Map();
const waitingQueue = [];

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'video-chat.html'));
});

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);
    
    // Broadcast initial stats
    io.emit('stats-update', { onlineUsers: users.size + 1 });
    
    // Add user to waiting queue
    users.set(socket.id, {
        id: socket.id,
        connectedWith: null,
        socket: socket
    });
    
    // Try to match with waiting user
    if (waitingQueue.length > 0) {
        const partnerId = waitingQueue.shift();
        const partner = users.get(partnerId);
        
        if (partner) {
            // Create connection between two users
            const user1 = users.get(socket.id);
            user1.connectedWith = partnerId;
            partner.connectedWith = socket.id;
            
            console.log(`Matched: ${socket.id} <-> ${partnerId}`);
            
            // Notify both users
            socket.emit('user-connected', { partnerId });
            io.to(partnerId).emit('user-connected', { partnerId: socket.id });
        }
    } else {
        // Add to queue
        waitingQueue.push(socket.id);
        socket.emit('waiting', { message: 'في انتظار شخص آخر...' });
    }
    // Handle WebRTC offer
    socket.on('offer', (data) => {
        const { to, offer } = data;
        if (users.get(to)) {
            io.to(to).emit('offer', { from: socket.id, offer });
        }
    });
    
    // Handle WebRTC answer
    socket.on('answer', (data) => {
        const { to, answer } = data;
        if (users.get(to)) {
            io.to(to).emit('answer', { from: socket.id, answer });
        }
    });
    
    // Handle ICE candidates
    socket.on('ice-candidate', (data) => {
        const { to, candidate } = data;
        if (users.get(to)) {
            io.to(to).emit('ice-candidate', { from: socket.id, candidate });
        }
    });
    
    // Handle messages
    socket.on('message', (data) => {
        const user = users.get(socket.id);
        if (user && user.connectedWith) {
            io.to(user.connectedWith).emit('message', {
                from: socket.id,
                text: data.text,
                timestamp: new Date()
            });
        }
    });
    
    // Handle skip
    socket.on('skip', () => {
        const user = users.get(socket.id);
        if (user && user.connectedWith) {
            const partnerId = user.connectedWith;
            const partner = users.get(partnerId);
            
            if (partner) {
                partner.connectedWith = null;
                io.to(partnerId).emit('user-disconnected', { message: 'الشخص الآخر تخطى' });
                waitingQueue.push(partnerId);
            }
            
            user.connectedWith = null;
            
            // Add current user back to queue
            waitingQueue.push(socket.id);
            socket.emit('waiting', { message: 'في انتظار شخص آخر...' });
        }
    });
    
    // Handle disconnect
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        
        const user = users.get(socket.id);
        if (user) {
            // Notify connected partner
            if (user.connectedWith) {
                const partnerId = user.connectedWith;
                const partner = users.get(partnerId);
                if (partner) {
                    partner.connectedWith = null;
                    io.to(partnerId).emit('user-disconnected', { 
                        message: 'انقطع الاتصال بالشخص الآخر' 
                    });
                    io.to(partnerId).emit('waiting', { message: 'الشخص الآخر انقطع. جاري البحث عن شخص جديد...' });
                    waitingQueue.push(partnerId);
                }
            } else {
                // Remove from waiting queue
                const index = waitingQueue.indexOf(socket.id);
                if (index > -1) {
                    waitingQueue.splice(index, 1);
                }
            }
            
            users.delete(socket.id);
        }
        
        // Broadcast stats
        io.emit('stats-update', { onlineUsers: users.size });
        
        console.log(`Active users: ${users.size}, Waiting: ${waitingQueue.length}`);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log('Waiting for connections...');
});

// Broadcast stats every 5 seconds
setInterval(() => {
    io.emit('stats-update', { onlineUsers: users.size });
}, 5000);
