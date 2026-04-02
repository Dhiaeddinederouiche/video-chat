const express = require('express');
const http = require('http');
const socketIo = require('socket.io');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const { v4: uuidv4 } = require('uuid');
const bodyParser = require('body-parser');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { OAuth2Client } = require('google-auth-library');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"],
        allowedHeaders: ["*"],
        credentials: true
    }
});

// Google OAuth Configuration
// استبدل بـ Google Client ID الخاص بك
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// Middleware
app.use(bodyParser.json());
app.use(cors());
app.use(express.static(path.join(__dirname)));

// SQLite Database
const db = new sqlite3.Database(path.join(__dirname, 'social.db'), (err) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    // Users table
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            avatar TEXT DEFAULT 'https://via.placeholder.com/150',
            bio TEXT DEFAULT '',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Posts table
    db.run(`
        CREATE TABLE IF NOT EXISTS posts (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            content TEXT NOT NULL,
            image TEXT,
            likes_count INTEGER DEFAULT 0,
            comments_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // Comments table
    db.run(`
        CREATE TABLE IF NOT EXISTS comments (
            id TEXT PRIMARY KEY,
            post_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            content TEXT NOT NULL,
            likes_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES posts(id),
            FOREIGN KEY (user_id) REFERENCES users(id)
        )
    `);

    // Likes table
    db.run(`
        CREATE TABLE IF NOT EXISTS likes (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            post_id TEXT,
            comment_id TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (post_id) REFERENCES posts(id),
            FOREIGN KEY (comment_id) REFERENCES comments(id)
        )
    `);

    // Friends table
    db.run(`
        CREATE TABLE IF NOT EXISTS friendships (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            friend_id TEXT NOT NULL,
            status TEXT DEFAULT 'pending',
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id),
            FOREIGN KEY (friend_id) REFERENCES users(id)
        )
    `);
}

// Store online users
const onlineUsers = new Map();

// API Routes

// Google OAuth Login
app.post('/api/auth/google', async (req, res) => {
    const { token } = req.body;

    try {
        // تحقق من صحة التوكن من Google
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const googleId = payload.sub;
        const email = payload.email;
        const name = payload.name;
        const picture = payload.picture;

        // ابحث عن المستخدم في قاعدة البيانات
        db.get(
            `SELECT * FROM users WHERE email = ?`,
            [email],
            (err, user) => {
                if (err) {
                    return res.status(500).json({ error: 'Database error' });
                }

                let userId = user ? user.id : uuidv4();

                if (!user) {
                    // أنشئ مستخدم جديد
                    db.run(
                        `INSERT INTO users (id, username, email, name, avatar) VALUES (?, ?, ?, ?, ?)`,
                        [userId, email.split('@')[0], email, name, picture],
                        function(err) {
                            if (err) {
                                return res.status(500).json({ error: 'Failed to create user' });
                            }
                            // أرسل JWT token
                            const jwtToken = jwt.sign(
                                { userId, email, name },
                                process.env.JWT_SECRET || 'your-secret-key',
                                { expiresIn: '7d' }
                            );
                            res.json({ userId, name, email, picture, token: jwtToken });
                        }
                    );
                } else {
                    // أرسل JWT token للمستخدم الموجود
                    const jwtToken = jwt.sign(
                        { userId, email, name },
                        process.env.JWT_SECRET || 'your-secret-key',
                        { expiresIn: '7d' }
                    );
                    res.json({ userId, name, email, picture, token: jwtToken });
                }
            }
        );
    } catch (error) {
        console.error('Google auth error:', error);
        res.status(401).json({ error: 'Invalid token' });
    }
});

// Create/Login user
app.post('/api/user', (req, res) => {
    const { username, email, name } = req.body;
    const userId = uuidv4();

    db.run(
        `INSERT INTO users (id, username, email, name) VALUES (?, ?, ?, ?)`,
        [userId, username, email, name],
        function(err) {
            if (err) {
                if (err.message.includes('UNIQUE constraint failed')) {
                    return res.status(400).json({ error: 'Username or email already exists' });
                }
                return res.status(500).json({ error: 'Database error' });
            }
            res.json({ userId, username, name });
        }
    );
});

// Get user profile
app.get('/api/user/:userId', (req, res) => {
    const { userId } = req.params;

    db.get(
        `SELECT id, username, name, avatar, bio, created_at FROM users WHERE id = ?`,
        [userId],
        (err, user) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (!user) return res.status(404).json({ error: 'User not found' });
            res.json(user);
        }
    );
});

// Get feed (all posts)
app.get('/api/feed', (req, res) => {
    db.all(
        `SELECT p.*, u.username, u.name, u.avatar FROM posts p 
         JOIN users u ON p.user_id = u.id 
         ORDER BY p.created_at DESC LIMIT 50`,
        (err, posts) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json(posts || []);
        }
    );
});

// Create post
app.post('/api/posts', (req, res) => {
    const { userId, content, image } = req.body;
    const postId = uuidv4();

    db.run(
        `INSERT INTO posts (id, user_id, content, image) VALUES (?, ?, ?, ?)`,
        [postId, userId, content, image],
        function(err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            
            // Broadcast to all connected users
            io.emit('new-post', { postId, userId, content, image });
            res.json({ postId, success: true });
        }
    );
});

// Get post with comments
app.get('/api/posts/:postId', (req, res) => {
    const { postId } = req.params;

    db.get(
        `SELECT p.*, u.username, u.name, u.avatar FROM posts p 
         JOIN users u ON p.user_id = u.id 
         WHERE p.id = ?`,
        [postId],
        (err, post) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (!post) return res.status(404).json({ error: 'Post not found' });

            // Get comments
            db.all(
                `SELECT c.*, u.username, u.name, u.avatar FROM comments c 
                 JOIN users u ON c.user_id = u.id 
                 WHERE c.post_id = ? 
                 ORDER BY c.created_at DESC`,
                [postId],
                (err, comments) => {
                    if (err) return res.status(500).json({ error: 'Database error' });
                    res.json({ ...post, comments: comments || [] });
                }
            );
        }
    );
});

// Add comment
app.post('/api/comments', (req, res) => {
    const { postId, userId, content } = req.body;
    const commentId = uuidv4();

    db.run(
        `INSERT INTO comments (id, post_id, user_id, content) VALUES (?, ?, ?, ?)`,
        [commentId, postId, userId, content],
        function(err) {
            if (err) return res.status(500).json({ error: 'Database error' });

            // Update comment count
            db.run(`UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?`, [postId]);

            io.emit('new-comment', { commentId, postId, userId, content });
            res.json({ commentId, success: true });
        }
    );
});

// Like/Unlike post
app.post('/api/likes', (req, res) => {
    const { userId, postId, commentId } = req.body;
    const likeId = uuidv4();

    // Check if already liked
    const likeColumn = postId ? 'post_id' : 'comment_id';
    const likeValue = postId || commentId;

    db.get(
        `SELECT id FROM likes WHERE user_id = ? AND ${likeColumn} = ?`,
        [userId, likeValue],
        (err, like) => {
            if (err) return res.status(500).json({ error: 'Database error' });

            if (like) {
                // Unlike
                db.run(`DELETE FROM likes WHERE user_id = ? AND ${likeColumn} = ?`, [userId, likeValue]);
                if (postId) {
                    db.run(`UPDATE posts SET likes_count = likes_count - 1 WHERE id = ?`, [postId]);
                } else {
                    db.run(`UPDATE comments SET likes_count = likes_count - 1 WHERE id = ?`, [commentId]);
                }
                io.emit('unlike', { userId, postId, commentId });
                res.json({ liked: false });
            } else {
                // Like
                db.run(
                    `INSERT INTO likes (id, user_id, post_id, comment_id) VALUES (?, ?, ?, ?)`,
                    [likeId, userId, postId || null, commentId || null],
                    function(err) {
                        if (err) return res.status(500).json({ error: 'Database error' });
                        if (postId) {
                            db.run(`UPDATE posts SET likes_count = likes_count + 1 WHERE id = ?`, [postId]);
                        } else {
                            db.run(`UPDATE comments SET likes_count = likes_count + 1 WHERE id = ?`, [commentId]);
                        }
                        io.emit('new-like', { userId, postId, commentId });
                        res.json({ liked: true });
                    }
                );
            }
        }
    );
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Socket.io connections
io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    socket.on('user-online', (userData) => {
        onlineUsers.set(socket.id, userData);
        io.emit('users-online-count', onlineUsers.size);
        socket.broadcast.emit('user-came-online', userData);
    });

    // Real-time notifications
    socket.on('send-notification', (data) => {
        io.emit('notification', data);
    });

    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);
        onlineUsers.delete(socket.id);
        io.emit('users-online-count', onlineUsers.size);
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Social Network Server running on http://localhost:${PORT}`);
    console.log('Database initialized');
});
