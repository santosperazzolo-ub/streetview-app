import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, 'streetview.db');

const db = new Database(dbPath);
db.pragma('journal_mode = WAL');

// ── Crear tablas ──
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    email TEXT UNIQUE,
    role TEXT DEFAULT 'user',
    company TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    userId INTEGER NOT NULL,
    description TEXT,
    createdAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (userId) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS gps_points (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    projectId INTEGER NOT NULL,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    heading REAL,
    accuracy REAL,
    timestamp INTEGER,
    FOREIGN KEY (projectId) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS project_videos (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    projectId INTEGER NOT NULL,
    videoPath TEXT NOT NULL,
    uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (projectId) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS project_frames (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    projectId INTEGER NOT NULL,
    frameIndex INTEGER NOT NULL,
    framePath TEXT NOT NULL,
    lat REAL NOT NULL,
    lon REAL NOT NULL,
    heading REAL,
    uploadedAt DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (projectId) REFERENCES projects(id)
  );

  CREATE TABLE IF NOT EXISTS project_access (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    projectId INTEGER NOT NULL,
    userId INTEGER NOT NULL,
    UNIQUE(projectId, userId),
    FOREIGN KEY (projectId) REFERENCES projects(id),
    FOREIGN KEY (userId) REFERENCES users(id)
  );
`);

export default db;
