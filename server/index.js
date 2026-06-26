import express from "express";
import cors from "cors";
import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import exifr from "exifr";
import { createCanvas, loadImage } from "canvas";
import jwt from "jsonwebtoken";
import db from "./db.js";
import { extractFramesFromVideo } from "./frameExtractor.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = "tu_clave_secreta_123"; // Cambiar en producción

// ── Middleware ────────────────────────────────────────────────────────────────

app.use(cors());
app.use(express.json());

// Servir archivos estáticos del frontend
app.use(express.static(path.join(__dirname, '../dist')));

const upload = multer({ storage: multer.memoryStorage() });

// Middleware de autenticación
function verifyToken(req, res, next) {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Sin token" });
  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (e) {
    res.status(401).json({ error: "Token inválido" });
  }
}

function isAdmin(req, res, next) {
  if (req.user?.role !== "admin") {
    return res.status(403).json({ error: "Solo admins" });
  }
  next();
}

// ── Auth ──────────────────────────────────────────────────────────────────────

app.post("/api/auth/register", (req, res) => {
  const { username, password, email, company } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Falta username/password" });
  }

  try {
    const stmt = db.prepare(
      "INSERT INTO users (username, password, email, role, company) VALUES (?, ?, ?, ?, ?)"
    );
    const result = stmt.run(username, password, email || null, "user", company || null);
    const user = db.prepare("SELECT id, username, role, company FROM users WHERE id = ?").get(result.lastInsertRowid);
    const token = jwt.sign({ id: user.id, username: user.username, role: user.role }, JWT_SECRET);
    res.json({ user, token });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/api/auth/login", (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).json({ error: "Falta username/password" });
  }

  try {
    const user = db.prepare("SELECT * FROM users WHERE username = ? AND password = ?").get(username, password);
    if (!user) return res.status(401).json({ error: "Credenciales inválidas" });

    const token = jwt.sign(
      { id: user.id, username: user.username, role: user.role },
      JWT_SECRET
    );
    res.json({
      user: { id: user.id, username: user.username, role: user.role, company: user.company },
      token
    });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ── Proyectos ─────────────────────────────────────────────────────────────────

app.get("/api/projects", verifyToken, (req, res) => {
  try {
    let projects;
    if (req.user.role === "admin") {
      // Admin ve todos los proyectos
      projects = db.prepare("SELECT * FROM projects").all();
    } else {
      // Usuarios normales solo ven proyectos a los que tienen acceso
      projects = db.prepare(`
        SELECT p.* FROM projects p
        INNER JOIN project_access pa ON p.id = pa.projectId
        WHERE pa.userId = ?
      `).all(req.user.id);
    }
    res.json(projects);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.post("/api/projects", verifyToken, isAdmin, (req, res) => {
  const { name, description, userIds } = req.body;
  if (!name) return res.status(400).json({ error: "Falta nombre" });

  try {
    const stmt = db.prepare(
      "INSERT INTO projects (name, userId, description) VALUES (?, ?, ?)"
    );
    const result = stmt.run(name, req.user.id, description || null);
    const projectId = result.lastInsertRowid;

    // Asignar acceso a usuarios específicos
    if (userIds && Array.isArray(userIds) && userIds.length > 0) {
      const accessStmt = db.prepare(
        "INSERT INTO project_access (projectId, userId) VALUES (?, ?)"
      );
      const addAccess = db.transaction((ids) => {
        for (const uid of ids) {
          accessStmt.run(projectId, uid);
        }
      });
      addAccess(userIds);
    }

    const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId);
    res.json(project);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Asignar acceso a usuarios en un proyecto existente
app.post("/api/projects/:projectId/access", verifyToken, isAdmin, (req, res) => {
  const { projectId } = req.params;
  const { userIds } = req.body;

  try {
    const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId);
    if (!project) return res.status(404).json({ error: "Proyecto no encontrado" });

    // Limpiar accesos anteriores
    db.prepare("DELETE FROM project_access WHERE projectId = ?").run(projectId);

    // Asignar nuevos accesos
    const stmt = db.prepare("INSERT INTO project_access (projectId, userId) VALUES (?, ?)");
    const addAccess = db.transaction((ids) => {
      for (const uid of ids) {
        stmt.run(projectId, uid);
      }
    });

    if (userIds && Array.isArray(userIds)) {
      addAccess(userIds);
    }

    res.json({ ok: true, count: userIds?.length || 0 });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Obtener usuarios disponibles
app.get("/api/users", verifyToken, isAdmin, (req, res) => {
  try {
    const users = db.prepare("SELECT id, username, company FROM users WHERE role = ?").all("user");
    res.json(users);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Obtener usuarios asignados a un proyecto
app.get("/api/projects/:projectId/users", verifyToken, isAdmin, (req, res) => {
  const { projectId } = req.params;
  try {
    const userIds = db.prepare(
      "SELECT userId FROM project_access WHERE projectId = ?"
    ).all(projectId).map(row => row.userId);
    res.json(userIds);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Eliminar un proyecto y todos sus datos asociados
app.delete("/api/projects/:projectId", verifyToken, isAdmin, (req, res) => {
  const { projectId } = req.params;
  try {
    const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId);
    if (!project) return res.status(404).json({ error: "Proyecto no encontrado" });

    // Eliminar en orden: datos asociados primero, luego el proyecto
    const deleteTransaction = db.transaction(() => {
      // Eliminar GPS points
      db.prepare("DELETE FROM gps_points WHERE projectId = ?").run(projectId);

      // Eliminar frames
      db.prepare("DELETE FROM project_frames WHERE projectId = ?").run(projectId);

      // Eliminar videos
      db.prepare("DELETE FROM project_videos WHERE projectId = ?").run(projectId);

      // Eliminar accesos de usuarios
      db.prepare("DELETE FROM project_access WHERE projectId = ?").run(projectId);

      // Eliminar proyecto
      db.prepare("DELETE FROM projects WHERE id = ?").run(projectId);
    });

    deleteTransaction();

    console.log(`🗑️ Proyecto ${projectId} (${project.name}) eliminado completamente`);
    res.json({ ok: true, message: `Proyecto "${project.name}" eliminado` });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ── GPS Points ────────────────────────────────────────────────────────────────

app.post("/api/projects/:projectId/gps", verifyToken, isAdmin, (req, res) => {
  const { projectId } = req.params;
  const points = req.body;

  if (!Array.isArray(points)) {
    return res.status(400).json({ error: "points debe ser array" });
  }

  try {
    const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId);
    if (!project) return res.status(404).json({ error: "Proyecto no encontrado" });

    // Limpiar puntos anteriores
    db.prepare("DELETE FROM gps_points WHERE projectId = ?").run(projectId);

    // Agregar nuevos puntos
    const insertStmt = db.prepare(
      "INSERT INTO gps_points (projectId, lat, lon, heading, accuracy, timestamp) VALUES (?, ?, ?, ?, ?, ?)"
    );

    const insertMany = db.transaction((points) => {
      for (const p of points) {
        insertStmt.run(projectId, p.lat, p.lon, p.heading || null, p.accuracy || null, p.timestamp || Date.now());
      }
    });

    insertMany(points);
    res.json({ ok: true, count: points.length });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/api/projects/:projectId/gps", verifyToken, (req, res) => {
  const { projectId } = req.params;

  try {
    const points = db.prepare("SELECT * FROM gps_points WHERE projectId = ? ORDER BY timestamp ASC").all(projectId);
    res.json(points);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ── Videos ────────────────────────────────────────────────────────────────────

const UPLOADS_DIR = path.join(__dirname, "uploads");
fs.mkdirSync(UPLOADS_DIR, { recursive: true });
app.use("/uploads", express.static(UPLOADS_DIR));

app.post("/api/projects/:projectId/video", verifyToken, isAdmin, upload.single("video"), async (req, res) => {
  const { projectId } = req.params;
  if (!req.file) return res.status(400).json({ error: "Sin video" });

  try {
    const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId);
    if (!project) return res.status(404).json({ error: "Proyecto no encontrado" });

    const ext = path.extname(req.file.originalname).toLowerCase() || ".mp4";
    const filename = `project_${projectId}_video${ext}`;
    const uploadDir = path.join(UPLOADS_DIR, `project_${projectId}`);
    fs.mkdirSync(uploadDir, { recursive: true });

    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, req.file.buffer);

    const videoUrl = `/uploads/project_${projectId}/${filename}`;
    const stmt = db.prepare("INSERT INTO project_videos (projectId, videoPath) VALUES (?, ?)");
    stmt.run(projectId, videoUrl);

    // Automáticamente extraer frames si hay puntos GPS
    const gpsPoints = db.prepare("SELECT * FROM gps_points WHERE projectId = ? ORDER BY timestamp ASC").all(projectId);

    if (gpsPoints.length > 0) {
      console.log(`🎬 Extrayendo frames para proyecto ${projectId}...`);
      try {
        const frames = await extractFramesFromVideo(filepath, gpsPoints, projectId);

        // Guardar frames en la BD
        const insertStmt = db.prepare(
          "INSERT INTO project_frames (projectId, frameIndex, framePath, lat, lon, heading) VALUES (?, ?, ?, ?, ?, ?)"
        );

        const insertMany = db.transaction((frames) => {
          for (const frame of frames) {
            insertStmt.run(projectId, frame.index, frame.framePath, frame.lat, frame.lon, frame.heading);
          }
        });

        insertMany(frames);
        console.log(`✓ ${frames.length} frames guardados en BD`);

        res.json({ ok: true, videoUrl, framesExtracted: frames.length });
      } catch (frameError) {
        console.error("Error extrayendo frames:", frameError.message);
        res.json({ ok: true, videoUrl, framesExtracted: 0, frameError: frameError.message });
      }
    } else {
      res.json({ ok: true, videoUrl, framesExtracted: 0, message: "Sin puntos GPS para extraer frames" });
    }
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/api/projects/:projectId/video", verifyToken, (req, res) => {
  const { projectId } = req.params;
  try {
    const video = db.prepare("SELECT * FROM project_videos WHERE projectId = ? ORDER BY uploadedAt DESC LIMIT 1").get(projectId);
    res.json(video || { videoPath: null });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// ── Frames (extraídos del video) ───────────────────────────────────────────────

app.post("/api/projects/:projectId/frames", verifyToken, isAdmin, upload.single("frame"), (req, res) => {
  const { projectId } = req.params;
  const { index, lat, lon, heading } = req.body;

  if (!req.file) return res.status(400).json({ error: "Sin frame" });

  try {
    const project = db.prepare("SELECT * FROM projects WHERE id = ?").get(projectId);
    if (!project) return res.status(404).json({ error: "Proyecto no encontrado" });

    const ext = ".jpg";
    const filename = `frame_${index}${ext}`;
    const uploadDir = path.join(UPLOADS_DIR, `project_${projectId}_frames`);
    fs.mkdirSync(uploadDir, { recursive: true });

    const filepath = path.join(uploadDir, filename);
    fs.writeFileSync(filepath, req.file.buffer);

    const frameUrl = `/uploads/project_${projectId}_frames/${filename}`;
    const stmt = db.prepare(
      "INSERT INTO project_frames (projectId, frameIndex, framePath, lat, lon, heading) VALUES (?, ?, ?, ?, ?, ?)"
    );
    stmt.run(projectId, parseInt(index), frameUrl, parseFloat(lat), parseFloat(lon), parseFloat(heading) || null);

    res.json({ ok: true, frameUrl });
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

app.get("/api/projects/:projectId/frames", verifyToken, (req, res) => {
  const { projectId } = req.params;
  try {
    const frames = db.prepare("SELECT * FROM project_frames WHERE projectId = ? ORDER BY frameIndex ASC").all(projectId);
    res.json(frames);
  } catch (e) {
    res.status(400).json({ error: e.message });
  }
});

// Servir index.html para todas las rutas que no sean API (SPA)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../dist/index.html'));
});

// ── Server start ──────────────────────────────────────────────────────────────

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Streetview server on http://0.0.0.0:${PORT}`);
  console.log(`📦 Database: streetview.db`);
  console.log(`🌐 Frontend served from /dist`);
});
