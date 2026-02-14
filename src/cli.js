#!/usr/bin/env node

const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const DB_PATH = path.join(__dirname, '../haiku.db');
let db;

function openDb() {
  return new Promise((resolve, reject) => {
    db = new sqlite3.Database(DB_PATH, (err) => {
      if (err) reject(err);
      else resolve();
    });
  });
}

// Mode 1: Search metadata (fast)
async function searchMetadata(query) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT conversation_id, project, date, title, message_count, summary, status
      FROM conversations_metadata
      WHERE project LIKE ? OR key_topics LIKE ? OR summary LIKE ? OR title LIKE ?
      LIMIT 20
    `;
    const param = '%' + query + '%';

    db.all(sql, [param, param, param, param], (err, rows) => {
      if (err) reject(err);
      else {
        if (rows.length === 0) {
          console.log(`No results found for "${query}"`);
        } else {
          console.log(`Found ${rows.length} result(s):\n`);
          rows.forEach((row, idx) => {
            console.log(`[${idx + 1}] ${row.conversation_id} | ${row.project} | ${row.date} | ${row.message_count} messages`);
            console.log(`    Status: ${row.status}`);
            console.log(`    ${row.summary}\n`);
          });
        }
        resolve();
      }
    });
  });
}

// Mode 2: View full conversation
async function viewConversation(convId) {
  return new Promise((resolve, reject) => {
    const metaSql = 'SELECT * FROM conversations_metadata WHERE conversation_id = ?';
    const fullSql = 'SELECT full_text FROM conversations_full WHERE conversation_id = ?';

    db.get(metaSql, [convId], (err, meta) => {
      if (err) return reject(err);
      if (!meta) {
        console.log(`Conversation ${convId} not found`);
        return resolve();
      }

      console.log(`\n=== Conversation: ${convId} ===`);
      console.log(`Project: ${meta.project}`);
      console.log(`Date: ${meta.date}`);
      console.log(`Title: ${meta.title}`);
      console.log(`Messages: ${meta.message_count}`);
      console.log(`Status: ${meta.status}`);
      console.log(`Topics: ${meta.key_topics || 'None'}`);
      console.log(`\n---\n`);

      db.get(fullSql, [convId], (err, row) => {
        if (err) return reject(err);
        if (row) console.log(row.full_text);
        console.log(`\n---\n`);
        resolve();
      });
    });
  });
}

// Mode 3: Search specific messages
async function searchMessages(query) {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT m.conversation_id, m.role, m.content, m.timestamp
      FROM messages m
      WHERE m.content LIKE ?
      LIMIT 50
    `;
    const param = '%' + query + '%';

    db.all(sql, [param], (err, rows) => {
      if (err) reject(err);
      else {
        if (rows.length === 0) {
          console.log(`No messages found containing "${query}"`);
        } else {
          console.log(`Found ${rows.length} message(s):\n`);
          rows.forEach((row, idx) => {
            console.log(`[${idx + 1}] In conversation: ${row.conversation_id}`);
            console.log(`    [${row.role}] ${row.content.substring(0, 100)}${row.content.length > 100 ? '...' : ''}`);
            console.log(`    ${row.timestamp}\n`);
          });
        }
        resolve();
      }
    });
  });
}

// Mode 4: List all projects
async function listProjects() {
  return new Promise((resolve, reject) => {
    const sql = `
      SELECT project, COUNT(*) as count
      FROM conversations_metadata
      WHERE project IS NOT NULL AND project != ''
      GROUP BY project
      ORDER BY count DESC
    `;

    db.all(sql, (err, rows) => {
      if (err) reject(err);
      else {
        if (rows.length === 0) {
          console.log('No projects found');
        } else {
          console.log(`Projects (${rows.length}):\n`);
          rows.forEach(row => {
            console.log(`  ${row.project}: ${row.count} conversation(s)`);
          });
        }
        console.log();
        resolve();
      }
    });
  });
}

// Mode 5: Export for Claude.ai
async function exportConversation(convId) {
  return new Promise((resolve, reject) => {
    const sql = 'SELECT full_text FROM conversations_full WHERE conversation_id = ?';

    db.get(sql, [convId], (err, row) => {
      if (err) reject(err);
      else if (!row) {
        console.log(`Conversation ${convId} not found`);
        resolve();
      } else {
        console.log(`\n${'='.repeat(50)}`);
        console.log('HAIKU-INDEX: Exported Conversation');
        console.log('='.repeat(50));
        console.log(row.full_text);
        console.log('='.repeat(50));
        console.log('\n✓ Formatted for pasting to Claude.ai\n');
        resolve();
      }
    });
  });
}

// Show usage
function showUsage() {
  console.log(`
HAIKU-INDEX: Searchable conversation index

Usage:
  haiku search <query>               Search metadata (fast)
  haiku view <conversation-id>       View full conversation
  haiku search-message <query>       Search specific messages
  haiku list-projects                List all projects
  haiku export <conversation-id>     Export for Claude.ai

Examples:
  haiku search "Q19 avatar"
  haiku view abc123def456
  haiku search-message "HeyGen pricing"
  haiku list-projects
  haiku export abc123def456
`);
}

// Main
async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    showUsage();
    process.exit(0);
  }

  try {
    await openDb();

    const command = args[0];
    const query = args.slice(1).join(' ');

    switch (command) {
      case 'search':
        await searchMetadata(query);
        break;
      case 'view':
        await viewConversation(query);
        break;
      case 'search-message':
        await searchMessages(query);
        break;
      case 'list-projects':
        await listProjects();
        break;
      case 'export':
        await exportConversation(query);
        break;
      default:
        console.log(`Unknown command: ${command}`);
        showUsage();
    }

    db.close();
  } catch (err) {
    console.error('Error:', err.message);
    process.exit(1);
  }
}

main();
