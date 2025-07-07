const express = require('express');
const session = require('express-session');
const path = require('path');
const bcrypt = require('bcrypt');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const Database = require('better-sqlite3');
const fs = require('fs');
const expressLayouts = require('express-ejs-layouts');

// Initialize database (SQLite)
const db = new Database('data.db');
db.exec(`
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  username TEXT UNIQUE,
  password TEXT
);

CREATE TABLE IF NOT EXISTS files (
  id TEXT PRIMARY KEY,
  original_name TEXT,
  stored_name TEXT,
  uploader_id INTEGER,
  uploaded_at DATETIME DEFAULT CURRENT_TIMESTAMP
);
`);

const app = express();
const PORT = process.env.PORT || 3000;

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir);
}

// Configure Multer for handling file uploads
const storage = multer.diskStorage({
  destination: uploadsDir,
  filename: (req, file, cb) => {
    const id = uuidv4();
    const ext = path.extname(file.originalname);
    const storedName = id + ext;
    cb(null, storedName);
  }
});
const upload = multer({ storage });

// View engine setup
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));
app.use(expressLayouts);

// Middleware
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));
app.use(
  session({
    secret: 'supersecretkey', // In production, keep this secret safe!
    resave: false,
    saveUninitialized: false
  })
);

// Expose user info to templates
app.use((req, res, next) => {
  res.locals.username = req.session.username;
  next();
});

// Helper middleware to protect routes
function requireLogin(req, res, next) {
  if (!req.session.userId) {
    return res.redirect('/login');
  }
  next();
}

// Routes
app.get('/', (req, res) => {
  if (req.session.userId) {
    return res.redirect('/dashboard');
  }
  res.render('index');
});

// Sign-up
app.get('/signup', (req, res) => {
  res.render('signup', { error: null });
});

app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.render('signup', { error: 'All fields are required.' });
  }
  try {
    const hashed = await bcrypt.hash(password, 10);
    const stmt = db.prepare('INSERT INTO users (username, password) VALUES (?, ?)');
    stmt.run(username, hashed);
    res.redirect('/login');
  } catch (err) {
    res.render('signup', { error: 'Username already exists.' });
  }
});

// Login
app.get('/login', (req, res) => {
  res.render('login', { error: null });
});

app.post('/login', async (req, res) => {
  const { username, password } = req.body;
  const stmt = db.prepare('SELECT * FROM users WHERE username = ?');
  const user = stmt.get(username);
  if (!user) {
    return res.render('login', { error: 'Invalid credentials.' });
  }
  const valid = await bcrypt.compare(password, user.password);
  if (!valid) {
    return res.render('login', { error: 'Invalid credentials.' });
  }
  req.session.userId = user.id;
  req.session.username = user.username;
  res.redirect('/dashboard');
});

// Logout
app.get('/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Dashboard
app.get('/dashboard', requireLogin, (req, res) => {
  const stmt = db.prepare('SELECT * FROM files WHERE uploader_id = ? ORDER BY uploaded_at DESC');
  const files = stmt.all(req.session.userId);
  res.render('dashboard', { files });
});

// File upload
app.post('/upload', requireLogin, upload.single('file'), (req, res) => {
  const { file } = req;
  const id = path.parse(file.filename).name; // uuid without extension
  const insert = db.prepare('INSERT INTO files (id, original_name, stored_name, uploader_id) VALUES (?, ?, ?, ?)');
  insert.run(id, file.originalname, file.filename, req.session.userId);

  const link = `${req.protocol}://${req.get('host')}/file/${id}`;
  res.render('upload_success', { link });
});

// Public link page
app.get('/file/:id', (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('SELECT * FROM files WHERE id = ?');
  const file = stmt.get(id);
  if (!file) {
    return res.status(404).send('File not found');
  }
  res.render('file', { file });
});

// Download route
app.get('/download/:id', (req, res) => {
  const { id } = req.params;
  const stmt = db.prepare('SELECT * FROM files WHERE id = ?');
  const file = stmt.get(id);
  if (!file) {
    return res.status(404).send('File not found');
  }
  const filePath = path.join(uploadsDir, file.stored_name);
  res.download(filePath, file.original_name);
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running at http://localhost:${PORT}`);
});