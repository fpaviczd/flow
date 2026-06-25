const express = require('express');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');

// Send email via local Postfix
const { execFileSync } = require('child_process');

const sendMail = (to, subject, body, from = 'flow@arcadian.hr') => {
  try {
    const msg = `From: Flow <${from}>\nTo: ${to}\nSubject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=\nContent-Type: text/plain; charset=UTF-8\n\n${body}`;
    execFileSync('/usr/sbin/sendmail', ['-t', '-f', from], { input: msg, encoding: 'utf8' });
    console.log(`[mail] Sent to ${to}: ${subject}`);
  } catch(e) {
    console.error('[mail] Error:', e.message);
  }
};

const rateLimit = require('express-rate-limit');

const authLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minuta
  max: 10,
  message: { error: 'Previše pokušaja. Pokušajte za minutu.' },
  standardHeaders: true,
  legacyHeaders: false,
});

const app = express();
const PORT = 3010;

const dataDir = path.join(__dirname, 'data');
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir, { recursive: true });

const db = new Database(path.join(dataDir, 'flow.db'));
db.pragma('foreign_keys = ON');

// Schema
db.exec(`
  CREATE TABLE IF NOT EXISTS settings (
    key   TEXT PRIMARY KEY,
    value TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS projects (
    id          TEXT PRIMARY KEY,
    name        TEXT NOT NULL,
    client_name TEXT DEFAULT '',
    access_code TEXT NOT NULL UNIQUE,
    description TEXT DEFAULT '',
    created_at  TEXT NOT NULL
  );
  CREATE TABLE IF NOT EXISTS tasks (
    id         TEXT PRIMARY KEY,
    project_id TEXT NOT NULL,
    text       TEXT NOT NULL,
    done       INTEGER DEFAULT 0,
    note       TEXT DEFAULT '',
    priority   TEXT DEFAULT 'normal',
    position   INTEGER DEFAULT 0,
    created_at TEXT NOT NULL,
    FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE
  );
  CREATE TABLE IF NOT EXISTS comments (
    id         TEXT PRIMARY KEY,
    task_id    TEXT NOT NULL,
    text       TEXT NOT NULL,
    created_at TEXT NOT NULL,
    FOREIGN KEY (task_id) REFERENCES tasks(id) ON DELETE CASCADE
  );
`);

// Migration: add columns if missing
try { db.exec("ALTER TABLE tasks ADD COLUMN priority TEXT DEFAULT 'normal'"); } catch(e) {}
try { db.exec("ALTER TABLE tasks ADD COLUMN status TEXT DEFAULT 'active'"); } catch(e) {}
try { db.exec("ALTER TABLE tasks ADD COLUMN updated_at TEXT"); } catch(e) {}
try { db.exec("ALTER TABLE projects ADD COLUMN client_email TEXT DEFAULT ''"); } catch(e) {}
try { db.exec("ALTER TABLE projects ADD COLUMN archived INTEGER DEFAULT 0"); } catch(e) {}
try { db.exec("ALTER TABLE comments ADD COLUMN author TEXT DEFAULT 'admin'"); } catch(e) {}
try { db.exec("ALTER TABLE comments ADD COLUMN resolved INTEGER DEFAULT 0"); } catch(e) {}

// Default admin password
if (!db.prepare("SELECT value FROM settings WHERE key='admin_password'").get()) {
  db.prepare("INSERT INTO settings (key,value) VALUES ('admin_password','admin2024')").run();
}

const genId = () => crypto.randomBytes(8).toString('hex');
const getAdminPass = () => db.prepare("SELECT value FROM settings WHERE key='admin_password'").get().value;
const checkAdmin = (pw, res) => {
  if (pw !== getAdminPass()) { res.status(403).json({ error: 'Unauthorized' }); return false; }
  return true;
};

const getTasksWithComments = (projectId) => {
  const tasks = db.prepare("SELECT * FROM tasks WHERE project_id=? ORDER BY position,created_at").all(projectId);
  return tasks.map(t => ({
    ...t,
    comments: db.prepare("SELECT * FROM comments WHERE task_id=? ORDER BY created_at ASC").all(t.id)
  }));
};

const getProjectWithTasks = (projectId) => {
  const proj = db.prepare("SELECT * FROM projects WHERE id=?").get(projectId);
  if (!proj) return null;
  return { ...proj, tasks: getTasksWithComments(projectId) };
};

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// ── Auth ─────────────────────────────────────────────────────────────────────
app.post('/api/auth/admin', authLimiter,, (req, res) => {
  res.json({ ok: req.body.password === getAdminPass() });
});

app.post('/api/auth/client', authLimiter,, (req, res) => {
  const proj = db.prepare("SELECT * FROM projects WHERE access_code=?").get(req.body.code?.trim());
  if (!proj) return res.json({ ok: false });
  res.json({ ok: true, project: { ...proj, tasks: getTasksWithComments(proj.id) } });
});

// ── Settings ─────────────────────────────────────────────────────────────────
app.put('/api/settings/password', (req, res) => {
  const { currentPassword, newPassword } = req.body;
  if (!checkAdmin(currentPassword, res)) return;
  if (!newPassword || newPassword.length < 4) return res.status(400).json({ error: 'Lozinka prekratka.' });
  db.prepare("UPDATE settings SET value=? WHERE key='admin_password'").run(newPassword);
  res.json({ ok: true });
});

// ── Projects ─────────────────────────────────────────────────────────────────
app.get('/api/projects', (req, res) => {
  if (!checkAdmin(req.headers['x-admin-password'], res)) return;
  const projects = db.prepare("SELECT * FROM projects WHERE archived=0 OR archived IS NULL ORDER BY created_at DESC").all();
  res.json(projects.map(p => ({ ...p, tasks: getTasksWithComments(p.id) })));
});

app.post('/api/projects', (req, res) => {
  if (!checkAdmin(req.headers['x-admin-password'], res)) return;
  const { name, clientName, accessCode, description, clientEmail } = req.body;
  if (!name?.trim() || !accessCode?.trim()) return res.status(400).json({ error: 'Naziv i kod su obavezni.' });
  if (db.prepare("SELECT id FROM projects WHERE access_code=?").get(accessCode.trim()))
    return res.status(400).json({ error: 'Taj pristupni kod već postoji.' });
  const id = genId();
  db.prepare("INSERT INTO projects (id,name,client_name,access_code,description,client_email,created_at) VALUES (?,?,?,?,?,?,?)")
    .run(id, name.trim(), clientName?.trim() || '', accessCode.trim(), description?.trim() || '', clientEmail?.trim() || '', new Date().toISOString());
  res.json({ ...db.prepare("SELECT * FROM projects WHERE id=?").get(id), tasks: [] });
});

app.put('/api/projects/:id', (req, res) => {
  if (!checkAdmin(req.headers['x-admin-password'], res)) return;
  const { name, clientName, accessCode, description, clientEmail } = req.body;
  if (db.prepare("SELECT id FROM projects WHERE access_code=? AND id!=?").get(accessCode?.trim(), req.params.id))
    return res.status(400).json({ error: 'Taj pristupni kod već postoji.' });
  db.prepare("UPDATE projects SET name=?,client_name=?,access_code=?,description=?,client_email=? WHERE id=?")
    .run(name.trim(), clientName?.trim() || '', accessCode.trim(), description?.trim() || '', clientEmail?.trim() || '', req.params.id);
  res.json(getProjectWithTasks(req.params.id));
});

app.put('/api/projects/:id/archive', (req, res) => {
  if (!checkAdmin(req.headers['x-admin-password'], res)) return;
  const p = db.prepare("SELECT * FROM projects WHERE id=?").get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Nije pronađen.' });
  db.prepare("UPDATE projects SET archived=? WHERE id=?").run(p.archived ? 0 : 1, req.params.id);
  res.json({ ok: true, archived: !p.archived });
});

// Get archived projects
app.get('/api/projects/archived', (req, res) => {
  if (!checkAdmin(req.headers['x-admin-password'], res)) return;
  const projects = db.prepare("SELECT * FROM projects WHERE archived=1 ORDER BY created_at DESC").all();
  const full = projects.map(p => ({
    ...p,
    tasks: db.prepare("SELECT * FROM tasks WHERE project_id=? ORDER BY position ASC").all(p.id).map(t => ({
      ...t,
      comments: db.prepare("SELECT * FROM comments WHERE task_id=? ORDER BY created_at ASC").all(t.id)
    }))
  }));
  res.json(full);
});

// Copy project
app.post('/api/projects/:id/copy', (req, res) => {
  if (!checkAdmin(req.headers['x-admin-password'], res)) return;
  const p = db.prepare("SELECT * FROM projects WHERE id=?").get(req.params.id);
  if (!p) return res.status(404).json({ error: 'Nije pronađen.' });
  const newId = genId();
  const newCode = Math.random().toString(36).substring(2,6)+'-'+Math.random().toString(36).substring(2,6)+'-'+Math.random().toString(36).substring(2,6);
  db.prepare("INSERT INTO projects (id,name,client_name,client_email,access_code,description,created_at) VALUES (?,?,?,?,?,?,?)").run(
    newId, p.name+' (kopija)', p.client_name, p.client_email, newCode, p.description, new Date().toISOString()
  );
  // Copy tasks without done status
  const tasks = db.prepare("SELECT * FROM tasks WHERE project_id=? ORDER BY position ASC").all(p.id);
  tasks.forEach(t => {
    const tid = genId();
    db.prepare("INSERT INTO tasks (id,project_id,text,done,note,priority,status,position,created_at) VALUES (?,?,?,0,?,?,?,?,?)").run(
      tid, newId, t.text, t.note||'', t.priority||'normal', 'active', t.position, new Date().toISOString()
    );
  });
  const newProj = db.prepare("SELECT * FROM projects WHERE id=?").get(newId);
  const newTasks = db.prepare("SELECT * FROM tasks WHERE project_id=? ORDER BY position ASC").all(newId).map(t => ({...t, comments:[]}));
  res.json({...newProj, tasks: newTasks});
});

app.delete('/api/projects/:id', (req, res) => {
  if (!checkAdmin(req.headers['x-admin-password'], res)) return;
  db.prepare("DELETE FROM projects WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

// ── Tasks ─────────────────────────────────────────────────────────────────────
app.post('/api/projects/:id/tasks', (req, res) => {
  if (!checkAdmin(req.headers['x-admin-password'], res)) return;
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Tekst je obavezan.' });
  const maxPos = db.prepare("SELECT COALESCE(MIN(position),0) as m FROM tasks WHERE project_id=?").get(req.params.id);
  const id = genId();
  db.prepare("INSERT INTO tasks (id,project_id,text,done,note,priority,position,created_at) VALUES (?,?,?,0,'','normal',?,?)")
    .run(id, req.params.id, text.trim(), (maxPos.m || 0) + 1, new Date().toISOString());
  const task = db.prepare("SELECT * FROM tasks WHERE id=?").get(id);
  res.json({ ...task, comments: [] });
});

app.put('/api/tasks/:id', (req, res) => {
  if (!checkAdmin(req.headers['x-admin-password'], res)) return;
  const task = db.prepare("SELECT * FROM tasks WHERE id=?").get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Nije pronađen.' });
  const { done, note, text, priority, status } = req.body;
  const updated_at = new Date().toISOString();
  const wasDone = task.done;
  db.prepare("UPDATE tasks SET done=?,note=?,text=?,priority=?,status=?,updated_at=? WHERE id=?").run(
    done !== undefined ? (done ? 1 : 0) : task.done,
    note !== undefined ? note : task.note,
    text !== undefined ? text.trim() : task.text,
    priority !== undefined ? priority : task.priority,
    status !== undefined ? status : (task.status || 'active'),
    updated_at,
    req.params.id
  );

  // Email klijentu kad admin označi zadatak kao gotov
  if (done && !wasDone) {
    const proj = db.prepare("SELECT * FROM projects WHERE id=?").get(task.project_id);
    if (proj && proj.client_email) {
      const emails = proj.client_email.split(',').map(e => e.trim()).filter(Boolean);
      const taskText = text !== undefined ? text.trim() : task.text;
      const subject = `[Flow] Zadatak završen – ${proj.name}`;
      const body = `Poštovani${proj.client_name ? ' ' + proj.client_name : ''},\n\nZadatak je označen kao završen:\n\n"${taskText}"\n\nPovežite se na Flow za pregled projekta:\nhttps://flow.arcadian.hr`;
      emails.forEach(email => sendMail(email, subject, body));
    }
  }
  const updated = db.prepare("SELECT * FROM tasks WHERE id=?").get(req.params.id);
  res.json({ ...updated, comments: db.prepare("SELECT * FROM comments WHERE task_id=? ORDER BY created_at ASC").all(req.params.id) });
});

app.delete('/api/tasks/:id', (req, res) => {
  if (!checkAdmin(req.headers['x-admin-password'], res)) return;
  db.prepare("DELETE FROM tasks WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});

// Task move (reorder)
app.post('/api/tasks/:id/move', (req, res) => {
  if (!checkAdmin(req.headers['x-admin-password'], res)) return;
  const { direction } = req.body;
  const task = db.prepare("SELECT * FROM tasks WHERE id=?").get(req.params.id);
  if (!task) return res.status(404).json({ error: 'Nije pronađen.' });
  const adjacent = direction === 'up'
    ? db.prepare("SELECT * FROM tasks WHERE project_id=? AND position < ? ORDER BY position DESC LIMIT 1").get(task.project_id, task.position)
    : db.prepare("SELECT * FROM tasks WHERE project_id=? AND position > ? ORDER BY position ASC LIMIT 1").get(task.project_id, task.position);
  if (adjacent) {
    db.prepare("UPDATE tasks SET position=? WHERE id=?").run(adjacent.position, task.id);
    db.prepare("UPDATE tasks SET position=? WHERE id=?").run(task.position, adjacent.id);
  }
  res.json(getTasksWithComments(task.project_id));
});

// ── Comments ──────────────────────────────────────────────────────────────────
app.post('/api/tasks/:id/comments', (req, res) => {
  if (!checkAdmin(req.headers['x-admin-password'], res)) return;
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Tekst je obavezan.' });
  const id = genId();
  db.prepare("INSERT INTO comments (id,task_id,text,author,created_at) VALUES (?,?,?,'admin',?)")
    .run(id, req.params.id, text.trim(), new Date().toISOString());
  const row = db.prepare(`
    SELECT p.client_email, p.name as proj_name, p.client_name, t.text as task_text
    FROM tasks t JOIN projects p ON t.project_id = p.id WHERE t.id=?
  `).get(req.params.id);
  if (row?.client_email) {
    const emails = row.client_email.split(',').map(e => e.trim()).filter(Boolean);
    const subject = `[Flow] Novi odgovor – ${row.proj_name}`;
    const body = `Poštovani${row.client_name ? ' ' + row.client_name : ''},\n\nDobili ste novi komentar na zadatak:\n\n"${row.task_text}"\n\nKomentar:\n${text.trim()}\n\nPovežite se na Flow za pregled projekta:\nhttps://flow.prplus.hr`;
    emails.forEach(email => sendMail(email, subject, body));
  }

  res.json(db.prepare("SELECT * FROM comments WHERE id=?").get(id));
});

app.put('/api/comments/:id/resolve', (req, res) => {
  if (!checkAdmin(req.headers['x-admin-password'], res)) return;
  const c = db.prepare("SELECT * FROM comments WHERE id=?").get(req.params.id);
  if (!c) return res.status(404).json({ error: 'Nije pronađen.' });
  db.prepare("UPDATE comments SET resolved=? WHERE id=?").run(c.resolved ? 0 : 1, req.params.id);
  res.json(db.prepare("SELECT * FROM comments WHERE id=?").get(req.params.id));
});

app.delete('/api/comments/:id', (req, res) => {
  if (!checkAdmin(req.headers['x-admin-password'], res)) return;
  db.prepare("DELETE FROM comments WHERE id=?").run(req.params.id);
  res.json({ ok: true });
});


// Client edit task text
app.put('/api/client/tasks/:id', (req, res) => {
  const code = req.headers['x-access-code'];
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Tekst je obavezan.' });
  const task = db.prepare(`SELECT t.* FROM tasks t JOIN projects p ON t.project_id = p.id WHERE t.id=? AND p.access_code=?`).get(req.params.id, code);
  if (!task) return res.status(403).json({ error: 'Unauthorized' });
  db.prepare("UPDATE tasks SET text=? WHERE id=?").run(text.trim(), req.params.id);
  const proj2 = db.prepare("SELECT * FROM projects WHERE id=?").get(task.project_id);
  const subject2 = `[Flow] Klijent uredio zadatak – ${proj2.name}`;
  const body2 = `Klijent ${proj2.client_name||''} je uredio zadatak:\n\nNovi tekst: "${text.trim()}"\n\nhttps://flow.arcadian.hr`;
  sendMail('franko.pavic@gmail.com', subject2, body2);
  res.json({ ...db.prepare("SELECT * FROM tasks WHERE id=?").get(req.params.id), comments: db.prepare("SELECT * FROM comments WHERE task_id=? ORDER BY created_at ASC").all(req.params.id) });
});

// Client delete task
app.delete('/api/client/tasks/:id', (req, res) => {
  const code = req.headers['x-access-code'];
  const task = db.prepare(`SELECT t.* FROM tasks t JOIN projects p ON t.project_id = p.id WHERE t.id=? AND p.access_code=?`).get(req.params.id, code);
  if (!task) return res.status(403).json({ error: 'Unauthorized' });
  db.prepare("DELETE FROM tasks WHERE id=?").run(req.params.id);
  const proj3 = db.prepare("SELECT * FROM projects WHERE id=?").get(task.project_id);
  const subject3 = `[Flow] Klijent obrisao zadatak – ${proj3.name}`;
  const body3 = `Klijent ${proj3.client_name||''} je obrisao zadatak:\n\n"${task.text}"\n\nhttps://flow.arcadian.hr`;
  sendMail('franko.pavic@gmail.com', subject3, body3);
  res.json({ ok: true });
});
app.post('/api/client/tasks', (req, res) => {
  const code = req.headers['x-access-code'];
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Tekst je obavezan.' });
  const proj = db.prepare("SELECT * FROM projects WHERE access_code=?").get(code);
  if (!proj) return res.status(403).json({ error: 'Unauthorized' });
  const maxPos = db.prepare("SELECT COALESCE(MIN(position),0) as m FROM tasks WHERE project_id=?").get(proj.id);
  const id = genId();
  db.prepare("INSERT INTO tasks (id,project_id,text,done,note,priority,status,position,created_at) VALUES (?,?,?,0,'','normal','active',?,?)")
    .run(id, proj.id, text.trim(), (maxPos.m||0)-1, new Date().toISOString());

  // Notify admin
  const task = db.prepare("SELECT * FROM tasks WHERE id=?").get(id);
  const subject = `[Flow] Novi zadatak – ${proj.name}`;
  const body = `Klijent ${proj.client_name||''} je dodao novi zadatak u projekt "${proj.name}":\n\n"${text.trim()}"\n\nhttps://flow.prplus.hr`;
  sendMail('franko.pavic@gmail.com', subject, body);

  res.json({ ...task, comments: [] });
});


app.post('/api/client/tasks/:id/comments', (req, res) => {
  const code = req.headers['x-access-code'];
  const { text } = req.body;
  if (!text?.trim()) return res.status(400).json({ error: 'Tekst je obavezan.' });
  const task = db.prepare(`
    SELECT t.*, p.name as proj_name, p.client_name FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE t.id=? AND p.access_code=?
  `).get(req.params.id, code);
  if (!task) return res.status(403).json({ error: 'Unauthorized' });
  const id = genId();
  db.prepare("INSERT INTO comments (id,task_id,text,author,created_at) VALUES (?,?,?,'client',?)")
    .run(id, req.params.id, text.trim(), new Date().toISOString());

  // Email notification
  const subject = `[Flow] Novi komentar – ${task.proj_name}`;
  const body = `Klijent ${task.client_name || 'nepoznat'} je ostavio komentar na zadatak:\n\n"${task.text}"\n\nKomentar:\n${text.trim()}\n\nProjekt: ${task.proj_name}\nhttps://flow.prplus.hr`;
  sendMail('franko.pavic@gmail.com', subject, body);

  res.json(db.prepare("SELECT * FROM comments WHERE id=?").get(id));
});


app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => console.log(`Flow @ ${PORT}`));
