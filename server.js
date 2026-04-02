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

    // Broadcast initial stats (include this socket)
    io.emit('stats-update', { onlineUsers: users.size + 1 });

    // Register user without matching until they tap "ابدأ الدردشة"
    users.set(socket.id, {
        id: socket.id,
        connectedWith: null,
        socket: socket,
        ready: false
    });

    // Notify the client it is connected and should press start
    socket.emit('connected', { message: 'تم الاتصال بالخادم. اضغط ابدأ الدردشة.' });

    // Handle join request from client
    socket.on('join', () => {
        const user = users.get(socket.id);
        if (!user || user.ready) return;

        user.ready = true;

        // If user is already connected to someone else, ignore join
        if (user.connectedWith) return;

        // Try to match with waiting partner
        if (waitingQueue.length > 0) {
            const partnerId = waitingQueue.shift();
            const partner = users.get(partnerId);

            if (partner && partner.ready && !partner.connectedWith) {
                user.connectedWith = partnerId;
                partner.connectedWith = socket.id;

                console.log(`Matched: ${socket.id} <-> ${partnerId}`);

                socket.emit('user-connected', { partnerId, initiator: true });
                io.to(partnerId).emit('user-connected', { partnerId: socket.id, initiator: false });
                return;
            }

            // partner not suitable, try finding next in queue recursively
            if (partner) {
                waitingQueue.push(partnerId);
            }
        }

        // No one available, push this user into waiting queue
        waitingQueue.push(socket.id);
        socket.emit('waiting', { message: 'في انتظار شخص آخر...' });
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
