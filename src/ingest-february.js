#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const path = require('path');
const readline = require('readline');
const os = require('os');
const utils = require('./utils');

const DB_PATH = path.join(__dirname, '../haiku.db');
const PROJECTS_DIR = path.join(os.homedir(), '.claude/projects');

let db;
let ingestedCount = 0;
let fileCount = 0;

// Expand ~ in path
String.prototype.expandUser = function() {
  return this.replace(/^~/, process.env.HOME || process.env.USERPROFILE);
};

// Initialize database
function initDatabase() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) {
        reject(err);
      } else {
        // Load schema
        const schemaPath = path.join(__dirname, '../sql/schema.sql');
        const schema = fs.readFileSync(schemaPath, 'utf8');
        db.exec(schema, (err) => {
          if (err) reject(err);
          else resolve();
        });
      }
    });
  });
}

// Find all JSONL files in projects directory and main history
function findJsonlFiles() {
  const files = [];

  // Add main history file
  const historyFile = path.join(os.homedir(), '.claude/history.jsonl');
  if (fs.existsSync(historyFile)) {
    files.push(historyFile);
  }

  function walkDir(dir) {
    try {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      entries.forEach(entry => {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.name.endsWith('.jsonl')) {
          const stat = fs.statSync(fullPath);
          const modTime = stat.mtime;
          // Check if file was modified in February 2026 or later (to get recent data)
          if (modTime.getFullYear() === 2026 && modTime.getMonth() >= 1) {
            files.push(fullPath);
          }
        }
      });
    } catch (e) {
      // Ignore read errors
    }
  }

  walkDir(PROJECTS_DIR);
  return files;
}

// Parse JSONL file
function parseJsonlFile(filePath) {
  return new Promise((resolve, reject) => {
    const messages = [];
    const rl = readline.createInterface({
      input: fs.createReadStream(filePath)
    });

    rl.on('line', (line) => {
      try {
        const msg = JSON.parse(line);
        messages.push(msg);
      } catch (e) {
        // Skip malformed lines
      }
    });

    rl.on('close', () => {
      resolve(messages);
    });

    rl.on('error', reject);
  });
}

// Group messages by conversation (sessionId)
function groupByConversation(messages) {
  const conversations = {};
  messages.forEach((msg, idx) => {
    // Use sessionId as conversation ID
    const convId = msg.sessionId || msg.conversation_id || 'unknown_' + idx;
    if (!conversations[convId]) {
      conversations[convId] = [];
    }

    // Transform message format if needed
    const transformedMsg = {
      conversation_id: convId,
      message_id: msg.messageId || msg.message_id || idx.toString(),
      role: msg.role || (msg.display ? 'user' : 'unknown'),
      content: msg.display || msg.content || '',
      timestamp: msg.timestamp ? (typeof msg.timestamp === 'number' ? new Date(msg.timestamp) : new Date(msg.timestamp)) : new Date(),
      project: msg.project || 'unknown'
    };

    conversations[convId].push(transformedMsg);
  });
  return conversations;
}

// Insert conversation into database
function insertConversation(convId, messages) {
  return new Promise((resolve, reject) => {
    if (!messages || messages.length === 0) {
      resolve();
      return;
    }

    // Extract metadata
    const firstMsg = messages[0];
    const date = utils.formatTimestamp(firstMsg.timestamp || new Date());
    const title = firstMsg.content?.substring(0, 60) || 'Untitled';
    const keywordsData = utils.extractKeywords(messages.map(m => m.content).join(' '));
    const fullText = messages.map(m => `[${m.role}] ${m.content}`).join('\n\n');
    const status = utils.detectStatus(fullText);
    const hasTodos = utils.detectTodos(fullText);
    const summary = utils.generateSummary(messages);
    const tokenEstimate = utils.estimateTokens(fullText);

    // Extract project from message.project field or from keywords
    let project = firstMsg.project || 'unknown';
    if (project.startsWith('/')) {
      // Extract project name from path like "/var/www/html/Q19"
      const parts = project.split('/');
      project = parts[parts.length - 1] || 'unknown';
    }
    // Fallback to keywords if still unknown
    if (project === 'unknown' && keywordsData.projects.length > 0) {
      project = keywordsData.projects[0];
    }

    // Insert metadata
    db.run(
      `INSERT OR REPLACE INTO conversations_metadata
       (conversation_id, project, date, title, message_count, key_topics, summary, status, has_todos, last_updated)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [convId, project, date, title, messages.length, keywordsData.topics.join(', '), summary, status, hasTodos ? 1 : 0, new Date().toISOString()],
      (err) => {
        if (err) return reject(err);

        // Insert full text
        db.run(
          `INSERT OR REPLACE INTO conversations_full (conversation_id, full_text, token_estimate)
           VALUES (?, ?, ?)`,
          [convId, fullText, tokenEstimate],
          (err) => {
            if (err) return reject(err);

            // Insert individual messages
            let msgCount = 0;
            messages.forEach((msg, idx) => {
              db.run(
                `INSERT INTO messages (conversation_id, message_id, role, content, timestamp)
                 VALUES (?, ?, ?, ?, ?)`,
                [convId, msg.message_id || idx, msg.role || 'unknown', msg.content || '', msg.timestamp || new Date().toISOString()],
                (err) => {
                  if (!err) msgCount++;
                  if (msgCount === messages.length - 1) {
                    console.log(`  ✓ ${convId} | ${project} | ${messages.length} messages | ${status}`);
                    ingestedCount += messages.length;
                    resolve();
                  }
                }
              );
            });

            if (messages.length === 0) resolve();
          }
        );
      }
    );
  });
}

// Main ingest process
async function ingest() {
  try {
    console.log('[' + new Date().toISOString() + '] Starting February ingest...\n');

    await initDatabase();
    const files = findJsonlFiles();
    fileCount = files.length;

    if (files.length === 0) {
      console.log('ℹ️  No February 2026 files found to ingest');
      db.close();
      return;
    }

    console.log(`Processing ${files.length} file(s):\n`);

    for (const file of files) {
      console.log(`✓ ${path.basename(file)}`);
      const messages = await parseJsonlFile(file);
      const conversations = groupByConversation(messages);

      for (const [convId, convMessages] of Object.entries(conversations)) {
        await insertConversation(convId, convMessages);
      }
    }

    console.log(`\n✓ [${new Date().toISOString()}] Ingested ${ingestedCount} messages from ${fileCount} files`);
    console.log(`✓ [${new Date().toISOString()}] Indexed ${Object.keys(groupByConversation([])).length || fileCount} conversations in haiku.db\n`);

    db.close();
  } catch (err) {
    console.error('❌ Ingest error:', err.message);
    if (db) db.close();
    process.exit(1);
  }
}

ingest();
