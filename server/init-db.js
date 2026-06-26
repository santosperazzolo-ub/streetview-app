import db from './db.js';

// Crear usuarios demo
const users = [
  { username: 'admin', password: 'santos', role: 'admin', company: 'Main' },
  { username: 'chubut', password: '123', role: 'user', company: 'Chubut' },
  { username: 'zarate', password: '123', role: 'user', company: 'Zárate' }
];

try {
  // Limpiar datos relacionados primero
  db.prepare('DELETE FROM gps_points').run();
  db.prepare('DELETE FROM project_frames').run();
  db.prepare('DELETE FROM project_videos').run();
  db.prepare('DELETE FROM project_access').run();

  // Limpiar usuarios y proyectos
  db.prepare('DELETE FROM projects').run();
  db.prepare('DELETE FROM users').run();

  const stmt = db.prepare(
    'INSERT INTO users (username, password, role, company) VALUES (?, ?, ?, ?)'
  );

  users.forEach(u => {
    stmt.run(u.username, u.password, u.role, u.company);
  });

  console.log('✓ BD inicializada');
  console.log('👤 Usuarios creados:');
  console.log('  admin / santos (admin - ve todos)');
  console.log('  chubut / 123 (Chubut)');
  console.log('  zarate / 123 (Zárate)');
  process.exit(0);
} catch (e) {
  console.error('Error:', e.message);
  process.exit(1);
}
