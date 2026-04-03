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
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const multer = require('multer');
const fs = require('fs');

const app = express();
const server = http.createServer(app);
const io = socketIo(server, {
    cors: {
        origin: process.env.NODE_ENV === 'production' ? false : ["http://localhost:3000"],
        methods: ["GET", "POST"],
        allowedHeaders: ["*"],
        credentials: true
    }
});

// Security middleware
app.use(helmet({
    contentSecurityPolicy: {
        directives: {
            defaultSrc: ["'self'"],
            styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://accounts.google.com"],
            scriptSrc: ["'self'", "https://accounts.google.com", "https://apis.google.com"],
            imgSrc: ["'self'", "data:", "https:", "blob:"],
            connectSrc: ["'self'", "https://accounts.google.com", "ws:", "wss:"],
        },
    },
}));

// Rate limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // limit each IP to 100 requests per windowMs
    message: 'Too many requests from this IP, please try again later.'
});
app.use('/api/', limiter);

// Google OAuth Configuration
const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com';
const client = new OAuth2Client(GOOGLE_CLIENT_ID);

// File upload configuration
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = path.join(__dirname, 'uploads');
        if (!fs.existsSync(uploadDir)) {
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = uuidv4() + path.extname(file.originalname);
        cb(null, uniqueName);
    }
});

const upload = multer({
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 }, // 5MB limit
    fileFilter: (req, file, cb) => {
        const allowedTypes = /jpeg|jpg|png|gif|mp4|mov|avi/;
        const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
        const mimetype = allowedTypes.test(file.mimetype);

        if (mimetype && extname) {
            return cb(null, true);
        } else {
            cb(new Error('Invalid file type'));
        }
    }
});

// Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ extended: true, limit: '10mb' }));
app.use(cors());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// JWT Authentication middleware
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.status(401).json({ error: 'Access token required' });

    jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
        if (err) return res.status(403).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
};

// SQLite Database
const dbPath = process.env.NODE_ENV === 'production' ? '/tmp/social.db' : path.join(__dirname, 'social.db');
const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error('Database connection error:', err);
    } else {
        console.log('Connected to SQLite database');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    // Users table with enhanced fields
    db.run(`
        CREATE TABLE IF NOT EXISTS users (
            id TEXT PRIMARY KEY,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            name TEXT NOT NULL,
            avatar TEXT DEFAULT 'https://via.placeholder.com/150',
            bio TEXT DEFAULT '',
            cover_photo TEXT,
            location TEXT,
            website TEXT,
            birthday DATE,
            gender TEXT,
            is_online BOOLEAN DEFAULT 0,
            last_seen DATETIME,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
        )
    `);

    // Posts table with enhanced fields
    db.run(`
        CREATE TABLE IF NOT EXISTS posts (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            content TEXT NOT NULL,
            image TEXT,
            video TEXT,
            type TEXT DEFAULT 'text', -- text, image, video, link
            privacy TEXT DEFAULT 'public', -- public, friends, private
            likes_count INTEGER DEFAULT 0,
            comments_count INTEGER DEFAULT 0,
            shares_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Comments table with threading support
    db.run(`
        CREATE TABLE IF NOT EXISTS comments (
            id TEXT PRIMARY KEY,
            post_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            parent_id TEXT, -- for nested comments
            content TEXT NOT NULL,
            likes_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE
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
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
            FOREIGN KEY (comment_id) REFERENCES comments(id) ON DELETE CASCADE,
            UNIQUE(user_id, post_id),
            UNIQUE(user_id, comment_id)
        )
    `);

    // Friendships table with enhanced status
    db.run(`
        CREATE TABLE IF NOT EXISTS friendships (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            friend_id TEXT NOT NULL,
            status TEXT DEFAULT 'pending', -- pending, accepted, blocked
            requested_by TEXT NOT NULL,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (friend_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(user_id, friend_id)
        )
    `);

    // Stories table
    db.run(`
        CREATE TABLE IF NOT EXISTS stories (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            content TEXT,
            image TEXT,
            video TEXT,
            type TEXT DEFAULT 'text', -- text, image, video
            expires_at DATETIME NOT NULL,
            views_count INTEGER DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Story views table
    db.run(`
        CREATE TABLE IF NOT EXISTS story_views (
            id TEXT PRIMARY KEY,
            story_id TEXT NOT NULL,
            user_id TEXT NOT NULL,
            viewed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (story_id) REFERENCES stories(id) ON DELETE CASCADE,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
            UNIQUE(story_id, user_id)
        )
    `);

    // Messages table
    db.run(`
        CREATE TABLE IF NOT EXISTS messages (
            id TEXT PRIMARY KEY,
            sender_id TEXT NOT NULL,
            receiver_id TEXT NOT NULL,
            content TEXT NOT NULL,
            message_type TEXT DEFAULT 'text', -- text, image, file
            file_url TEXT,
            is_read BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (sender_id) REFERENCES users(id) ON DELETE CASCADE,
            FOREIGN KEY (receiver_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Notifications table
    db.run(`
        CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            user_id TEXT NOT NULL,
            type TEXT NOT NULL, -- like, comment, friend_request, message, etc.
            title TEXT NOT NULL,
            content TEXT,
            related_id TEXT, -- post_id, comment_id, user_id, etc.
            is_read BOOLEAN DEFAULT 0,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
        )
    `);

    // Create indexes for better performance
    db.run(`CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at DESC)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_likes_post_id ON likes(post_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_friendships_user_id ON friendships(user_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_messages_sender ON messages(sender_id, receiver_id)`);
    db.run(`CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read)`);
}

// API Routes

// ===== AUTHENTICATION =====

// Google OAuth Login
app.post('/api/auth/google', async (req, res) => {
    const { token } = req.body;

    try {
        const ticket = await client.verifyIdToken({
            idToken: token,
            audience: GOOGLE_CLIENT_ID
        });

        const payload = ticket.getPayload();
        const googleId = payload.sub;
        const email = payload.email;
        const name = payload.name;
        const picture = payload.picture;

        db.get(
            `SELECT * FROM users WHERE email = ?`,
            [email],
            (err, user) => {
                if (err) {
                    return res.status(500).json({ error: 'Database error' });
                }

                let userId = user ? user.id : uuidv4();

                if (!user) {
                    db.run(
                        `INSERT INTO users (id, username, email, name, avatar) VALUES (?, ?, ?, ?, ?)`,
                        [userId, email.split('@')[0], email, name, picture],
                        function(err) {
                            if (err) {
                                return res.status(500).json({ error: 'Failed to create user' });
                            }
                            const jwtToken = jwt.sign(
                                { userId, email, name },
                                process.env.JWT_SECRET || 'your-secret-key',
                                { expiresIn: '7d' }
                            );
                            res.json({ userId, name, email, picture, token: jwtToken });
                        }
                    );
                } else {
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

// Logout
app.post('/api/auth/logout', authenticateToken, (req, res) => {
    // In a real app, you might want to blacklist the token
    res.json({ success: true, message: 'Logged out successfully' });
});

// ===== USERS =====

// Get user profile
app.get('/api/user/:userId', (req, res) => {
    const { userId } = req.params;

    db.get(
        `SELECT id, username, name, avatar, bio, cover_photo, location, website, birthday, gender, is_online, last_seen, created_at FROM users WHERE id = ?`,
        [userId],
        (err, user) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (!user) return res.status(404).json({ error: 'User not found' });
            res.json(user);
        }
    );
});

// Update user profile
app.put('/api/user/:userId', authenticateToken, (req, res) => {
    const { userId } = req.params;
    const { bio, location, website, birthday, gender } = req.body;

    if (req.user.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

    db.run(
        `UPDATE users SET bio = ?, location = ?, website = ?, birthday = ?, gender = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
        [bio, location, website, birthday, gender, userId],
        function(err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ success: true, message: 'Profile updated successfully' });
        }
    );
});

// Search users
app.get('/api/users/search', (req, res) => {
    const { q } = req.query;
    if (!q || q.length < 2) {
        return res.json([]);
    }

    const searchTerm = `%${q}%`;
    db.all(
        `SELECT id, username, name, avatar, bio FROM users WHERE name LIKE ? OR username LIKE ? LIMIT 20`,
        [searchTerm, searchTerm],
        (err, users) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json(users || []);
        }
    );
});

// ===== POSTS =====

// Get feed (all posts from friends and public posts)
app.get('/api/feed', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    // Get posts from user and friends
    const query = `
        SELECT DISTINCT p.*, u.username, u.name, u.avatar,
               CASE WHEN l.id IS NOT NULL THEN 1 ELSE 0 END as is_liked
        FROM posts p
        JOIN users u ON p.user_id = u.id
        LEFT JOIN likes l ON p.id = l.post_id AND l.user_id = ?
        WHERE (p.privacy = 'public'
               OR p.user_id = ?
               OR p.user_id IN (
                   SELECT CASE WHEN user_id = ? THEN friend_id ELSE user_id END
                   FROM friendships
                   WHERE (user_id = ? OR friend_id = ?) AND status = 'accepted'
               ))
        ORDER BY p.created_at DESC
        LIMIT ? OFFSET ?
    `;

    db.all(query, [userId, userId, userId, userId, userId, limit, offset], (err, posts) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(posts || []);
    });
});

// Create post
app.post('/api/posts', authenticateToken, upload.single('image'), (req, res) => {
    const { content, type = 'text', privacy = 'public' } = req.body;
    const userId = req.user.userId;
    const postId = uuidv4();
    const image = req.file ? `/uploads/${req.file.filename}` : null;

    db.run(
        `INSERT INTO posts (id, user_id, content, image, type, privacy) VALUES (?, ?, ?, ?, ?, ?)`,
        [postId, userId, content, image, type, privacy],
        function(err) {
            if (err) return res.status(500).json({ error: 'Database error' });

            // Create notification for friends
            createNotification(userId, 'post', `${req.user.name} نشر منشور جديد`, content.substring(0, 100), postId);

            io.emit('new-post', { postId, userId, content, image, type, privacy });
            res.json({ postId, success: true });
        }
    );
});

// Get single post with comments
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

            // Get comments with nested replies
            db.all(
                `SELECT c.*, u.username, u.name, u.avatar,
                        CASE WHEN l.id IS NOT NULL THEN 1 ELSE 0 END as is_liked
                 FROM comments c
                 JOIN users u ON c.user_id = u.id
                 LEFT JOIN likes l ON c.id = l.comment_id AND l.user_id = ?
                 WHERE c.post_id = ?
                 ORDER BY c.created_at ASC`,
                [req.user?.userId || '', postId],
                (err, comments) => {
                    if (err) return res.status(500).json({ error: 'Database error' });

                    // Organize comments into threads
                    const commentMap = {};
                    const rootComments = [];

                    comments.forEach(comment => {
                        comment.replies = [];
                        commentMap[comment.id] = comment;
                        if (comment.parent_id) {
                            if (commentMap[comment.parent_id]) {
                                commentMap[comment.parent_id].replies.push(comment);
                            }
                        } else {
                            rootComments.push(comment);
                        }
                    });

                    res.json({ ...post, comments: rootComments });
                }
            );
        }
    );
});

// Update post
app.put('/api/posts/:postId', authenticateToken, (req, res) => {
    const { postId } = req.params;
    const { content, privacy } = req.body;
    const userId = req.user.userId;

    // Check ownership
    db.get(`SELECT user_id FROM posts WHERE id = ?`, [postId], (err, post) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!post) return res.status(404).json({ error: 'Post not found' });
        if (post.user_id !== userId) return res.status(403).json({ error: 'Unauthorized' });

        db.run(
            `UPDATE posts SET content = ?, privacy = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
            [content, privacy, postId],
            function(err) {
                if (err) return res.status(500).json({ error: 'Database error' });
                res.json({ success: true, message: 'Post updated successfully' });
            }
        );
    });
});

// Delete post
app.delete('/api/posts/:postId', authenticateToken, (req, res) => {
    const { postId } = req.params;
    const userId = req.user.userId;

    db.get(`SELECT user_id FROM posts WHERE id = ?`, [postId], (err, post) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        if (!post) return res.status(404).json({ error: 'Post not found' });
        if (post.user_id !== userId) return res.status(403).json({ error: 'Unauthorized' });

        db.run(`DELETE FROM posts WHERE id = ?`, [postId], function(err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ success: true, message: 'Post deleted successfully' });
        });
    });
});

// ===== INTERACTIONS =====

// Like/Unlike post or comment
app.post('/api/likes', authenticateToken, (req, res) => {
    const { userId, postId, commentId } = req.body;
    const likeId = uuidv4();

    if (userId !== req.user.userId) {
        return res.status(403).json({ error: 'Unauthorized' });
    }

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

                        // Create notification
                        if (postId) {
                            createNotification(userId, 'like', `${req.user.name} أعجب بمنشورك`, '', postId);
                        }

                        io.emit('new-like', { userId, postId, commentId });
                        res.json({ liked: true });
                    }
                );
            }
        }
    );
});

// Add comment
app.post('/api/comments', authenticateToken, (req, res) => {
    const { postId, content, parentId } = req.body;
    const userId = req.user.userId;
    const commentId = uuidv4();

    db.run(
        `INSERT INTO comments (id, post_id, user_id, content, parent_id) VALUES (?, ?, ?, ?, ?)`,
        [commentId, postId, userId, content, parentId || null],
        function(err) {
            if (err) return res.status(500).json({ error: 'Database error' });

            db.run(`UPDATE posts SET comments_count = comments_count + 1 WHERE id = ?`, [postId]);

            // Create notification
            createNotification(userId, 'comment', `${req.user.name} علق على منشورك`, content.substring(0, 100), postId);

            io.emit('new-comment', { commentId, postId, userId, content, parentId });
            res.json({ commentId, success: true });
        }
    );
});

// ===== FRIENDS =====

// Send friend request
app.post('/api/friends/request', authenticateToken, (req, res) => {
    const { friendId } = req.body;
    const userId = req.user.userId;

    if (userId === friendId) {
        return res.status(400).json({ error: 'Cannot send friend request to yourself' });
    }

    // Check if friendship already exists
    db.get(
        `SELECT * FROM friendships WHERE (user_id = ? AND friend_id = ?) OR (user_id = ? AND friend_id = ?)`,
        [userId, friendId, friendId, userId],
        (err, friendship) => {
            if (err) return res.status(500).json({ error: 'Database error' });

            if (friendship) {
                return res.status(400).json({ error: 'Friendship already exists' });
            }

            const friendshipId = uuidv4();
            db.run(
                `INSERT INTO friendships (id, user_id, friend_id, status, requested_by) VALUES (?, ?, ?, 'pending', ?)`,
                [friendshipId, userId, friendId, userId],
                function(err) {
                    if (err) return res.status(500).json({ error: 'Database error' });

                    // Create notification
                    createNotification(userId, 'friend_request', `${req.user.name} أرسل لك طلب صداقة`, '', friendId);

                    io.emit('friend-request', { from: userId, to: friendId });
                    res.json({ success: true, friendshipId });
                }
            );
        }
    );
});

// Accept/Reject friend request
app.put('/api/friends/:friendshipId', authenticateToken, (req, res) => {
    const { friendshipId } = req.params;
    const { action } = req.body; // 'accept' or 'reject'
    const userId = req.user.userId;

    db.get(
        `SELECT * FROM friendships WHERE id = ? AND friend_id = ?`,
        [friendshipId, userId],
        (err, friendship) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            if (!friendship) return res.status(404).json({ error: 'Friend request not found' });

            const newStatus = action === 'accept' ? 'accepted' : 'rejected';

            db.run(
                `UPDATE friendships SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
                [newStatus, friendshipId],
                function(err) {
                    if (err) return res.status(500).json({ error: 'Database error' });

                    if (action === 'accept') {
                        // Create notification
                        createNotification(userId, 'friend_accepted', `${req.user.name} قبل طلب الصداقة`, '', friendship.user_id);
                        io.emit('friend-accepted', { userId: friendship.user_id, friendId: userId });
                    }

                    res.json({ success: true, status: newStatus });
                }
            );
        }
    );
});

// Get friends list
app.get('/api/friends', authenticateToken, (req, res) => {
    const userId = req.user.userId;

    db.all(
        `SELECT u.id, u.username, u.name, u.avatar, u.is_online, u.last_seen,
                CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END as friend_id
         FROM friendships f
         JOIN users u ON u.id = CASE WHEN f.user_id = ? THEN f.friend_id ELSE f.user_id END
         WHERE (f.user_id = ? OR f.friend_id = ?) AND f.status = 'accepted'`,
        [userId, userId, userId, userId],
        (err, friends) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json(friends || []);
        }
    );
});

// ===== STORIES =====

// Create story
app.post('/api/stories', authenticateToken, upload.single('media'), (req, res) => {
    const { content, type = 'text' } = req.body;
    const userId = req.user.userId;
    const storyId = uuidv4();

    // Stories expire after 24 hours
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    const media = req.file ? `/uploads/${req.file.filename}` : null;

    db.run(
        `INSERT INTO stories (id, user_id, content, image, video, type, expires_at) VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [storyId, userId, content, type === 'image' ? media : null, type === 'video' ? media : null, type, expiresAt],
        function(err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            io.emit('new-story', { storyId, userId, content, media, type });
            res.json({ storyId, success: true });
        }
    );
});

// Get active stories
app.get('/api/stories', authenticateToken, (req, res) => {
    const userId = req.user.userId;

    // Get stories from user and friends that haven't expired
    const query = `
        SELECT s.*, u.username, u.name, u.avatar,
               CASE WHEN sv.id IS NOT NULL THEN 1 ELSE 0 END as viewed
        FROM stories s
        JOIN users u ON s.user_id = u.id
        LEFT JOIN story_views sv ON s.id = sv.story_id AND sv.user_id = ?
        WHERE s.expires_at > CURRENT_TIMESTAMP
          AND (s.user_id = ? OR s.user_id IN (
              SELECT CASE WHEN user_id = ? THEN friend_id ELSE user_id END
              FROM friendships
              WHERE (user_id = ? OR friend_id = ?) AND status = 'accepted'
          ))
        ORDER BY s.created_at DESC
    `;

    db.all(query, [userId, userId, userId, userId, userId], (err, stories) => {
        if (err) return res.status(500).json({ error: 'Database error' });
        res.json(stories || []);
    });
});

// View story
app.post('/api/stories/:storyId/view', authenticateToken, (req, res) => {
    const { storyId } = req.params;
    const userId = req.user.userId;

    db.run(
        `INSERT OR IGNORE INTO story_views (id, story_id, user_id) VALUES (?, ?, ?)`,
        [uuidv4(), storyId, userId],
        function(err) {
            if (err) return res.status(500).json({ error: 'Database error' });

            // Update view count
            db.run(`UPDATE stories SET views_count = views_count + 1 WHERE id = ?`, [storyId]);
            res.json({ success: true });
        }
    );
});

// ===== MESSAGES =====

// Get conversation with user
app.get('/api/messages/:userId', authenticateToken, (req, res) => {
    const { userId: otherUserId } = req.params;
    const currentUserId = req.user.userId;

    db.all(
        `SELECT m.*, u.username, u.name, u.avatar
         FROM messages m
         JOIN users u ON m.sender_id = u.id
         WHERE (m.sender_id = ? AND m.receiver_id = ?) OR (m.sender_id = ? AND m.receiver_id = ?)
         ORDER BY m.created_at ASC`,
        [currentUserId, otherUserId, otherUserId, currentUserId],
        (err, messages) => {
            if (err) return res.status(500).json({ error: 'Database error' });

            // Mark messages as read
            db.run(
                `UPDATE messages SET is_read = 1 WHERE sender_id = ? AND receiver_id = ? AND is_read = 0`,
                [otherUserId, currentUserId]
            );

            res.json(messages || []);
        }
    );
});

// Send message
app.post('/api/messages', authenticateToken, upload.single('file'), (req, res) => {
    const { receiverId, content, messageType = 'text' } = req.body;
    const senderId = req.user.userId;
    const messageId = uuidv4();

    const fileUrl = req.file ? `/uploads/${req.file.filename}` : null;

    db.run(
        `INSERT INTO messages (id, sender_id, receiver_id, content, message_type, file_url) VALUES (?, ?, ?, ?, ?, ?)`,
        [messageId, senderId, receiverId, content, messageType, fileUrl],
        function(err) {
            if (err) return res.status(500).json({ error: 'Database error' });

            // Create notification
            createNotification(senderId, 'message', `${req.user.name} أرسل لك رسالة`, content.substring(0, 100), receiverId);

            io.to(receiverId).emit('new-message', {
                messageId,
                senderId,
                receiverId,
                content,
                messageType,
                fileUrl,
                created_at: new Date().toISOString()
            });

            res.json({ messageId, success: true });
        }
    );
});

// ===== NOTIFICATIONS =====

// Get notifications
app.get('/api/notifications', authenticateToken, (req, res) => {
    const userId = req.user.userId;
    const { page = 1, limit = 20 } = req.query;
    const offset = (page - 1) * limit;

    db.all(
        `SELECT * FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT ? OFFSET ?`,
        [userId, limit, offset],
        (err, notifications) => {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json(notifications || []);
        }
    );
});

// Mark notification as read
app.put('/api/notifications/:notificationId/read', authenticateToken, (req, res) => {
    const { notificationId } = req.params;
    const userId = req.user.userId;

    db.run(
        `UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?`,
        [notificationId, userId],
        function(err) {
            if (err) return res.status(500).json({ error: 'Database error' });
            res.json({ success: true });
        }
    );
});

// ===== UTILITIES =====

// Create notification helper function
function createNotification(userId, type, title, content, relatedId) {
    const notificationId = uuidv4();

    // Don't create notification for self-actions
    if (userId === relatedId) return;

    db.run(
        `INSERT INTO notifications (id, user_id, type, title, content, related_id) VALUES (?, ?, ?, ?, ?, ?)`,
        [notificationId, userId, type, title, content, relatedId]
    );
}

// Health check
app.get('/api/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString(),
        version: '2.0.0'
    });
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Endpoint not found' });
});

// Socket.io connections
const onlineUsers = new Map();
const userSockets = new Map(); // userId -> socketId mapping

io.on('connection', (socket) => {
    console.log('User connected:', socket.id);

    // User comes online
    socket.on('user-online', (userData) => {
        const { userId, name } = userData;

        // Store user socket mapping
        userSockets.set(userId, socket.id);
        onlineUsers.set(socket.id, { userId, name, socketId: socket.id });

        // Update user online status in database
        db.run(`UPDATE users SET is_online = 1, last_seen = CURRENT_TIMESTAMP WHERE id = ?`, [userId]);

        io.emit('users-online-count', onlineUsers.size);
        socket.broadcast.emit('user-came-online', { userId, name });

        console.log(`User ${name} (${userId}) came online`);
    });

    // Real-time notifications
    socket.on('send-notification', (data) => {
        const { to, type, title, content } = data;

        // Send to specific user if online
        const targetSocketId = userSockets.get(to);
        if (targetSocketId) {
            io.to(targetSocketId).emit('notification', {
                type,
                title,
                content,
                timestamp: new Date().toISOString()
            });
        }
    });

    // Private messaging
    socket.on('private-message', (data) => {
        const { to, content, messageType, fileUrl } = data;
        const fromUser = Array.from(onlineUsers.values()).find(u => u.socketId === socket.id);

        if (!fromUser) return;

        const targetSocketId = userSockets.get(to);
        if (targetSocketId) {
            io.to(targetSocketId).emit('private-message', {
                from: fromUser.userId,
                fromName: fromUser.name,
                content,
                messageType,
                fileUrl,
                timestamp: new Date().toISOString()
            });
        }
    });

    // Typing indicators
    socket.on('typing-start', (data) => {
        const { to } = data;
        const fromUser = Array.from(onlineUsers.values()).find(u => u.socketId === socket.id);

        if (fromUser) {
            const targetSocketId = userSockets.get(to);
            if (targetSocketId) {
                io.to(targetSocketId).emit('typing-start', { from: fromUser.userId });
            }
        }
    });

    socket.on('typing-stop', (data) => {
        const { to } = data;
        const fromUser = Array.from(onlineUsers.values()).find(u => u.socketId === socket.id);

        if (fromUser) {
            const targetSocketId = userSockets.get(to);
            if (targetSocketId) {
                io.to(targetSocketId).emit('typing-stop', { from: fromUser.userId });
            }
        }
    });

    // Story reactions
    socket.on('story-reaction', (data) => {
        const { storyId, reaction } = data;
        const fromUser = Array.from(onlineUsers.values()).find(u => u.socketId === socket.id);

        if (fromUser) {
            // Broadcast reaction to all users viewing the story
            socket.broadcast.emit('story-reaction', {
                storyId,
                reaction,
                from: fromUser.userId,
                fromName: fromUser.name
            });
        }
    });

    // Live post updates
    socket.on('join-post', (postId) => {
        socket.join(`post-${postId}`);
    });

    socket.on('leave-post', (postId) => {
        socket.leave(`post-${postId}`);
    });

    // Handle disconnection
    socket.on('disconnect', () => {
        console.log('User disconnected:', socket.id);

        // Find disconnected user
        const disconnectedUser = onlineUsers.get(socket.id);
        if (disconnectedUser) {
            const { userId, name } = disconnectedUser;

            // Update user offline status
            db.run(`UPDATE users SET is_online = 0, last_seen = CURRENT_TIMESTAMP WHERE id = ?`, [userId]);

            // Remove from mappings
            userSockets.delete(userId);
            onlineUsers.delete(socket.id);

            // Notify others
            io.emit('users-online-count', onlineUsers.size);
            socket.broadcast.emit('user-went-offline', { userId, name });

            console.log(`User ${name} (${userId}) went offline`);
        }
    });

    // Heartbeat to keep connection alive
    socket.on('heartbeat', () => {
        socket.emit('heartbeat-response');
    });
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, process.env.NODE_ENV === 'production' ? '0.0.0.0' : undefined, () => {
    console.log(`Social Network Server running on http://localhost:${PORT}`);
    console.log('Database initialized');
});
