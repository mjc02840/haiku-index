#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const readline = require('readline');
const sqlite3 = require('sqlite3').verbose();
const os = require('os');

// Get projects to ingest from command line
const projectsToIngest = process.argv.slice(2) || ['Q19'];
const dbPath = path.join(__dirname, '../haiku.db');
const baseProjectDir = path.join(os.homedir(), '.claude/projects');

const db = new sqlite3.Database(dbPath);

let totalConversations = 0;
let totalMessages = 0;

// Find JSONL file for a project
function findProjectFile(project) {
  const projectDir = path.join(baseProjectDir, `-var-www-html-${project}`);
  if (!fs.existsSync(projectDir)) {
    console.error(`✗ Directory not found: ${projectDir}`);
    return null;
  }

  const files = fs.readdirSync(projectDir)
    .filter(f => f.endsWith('.jsonl') && f !== 'sessions-index.json')
    .sort((a, b) => fs.statSync(path.join(projectDir, b)).size -
                    fs.statSync(path.join(projectDir, a)).size);

  if (files.length === 0) {
    console.error(`✗ No JSONL files found in ${projectDir}`);
    return null;
  }

  return path.join(projectDir, files[0]);
}

// Parse JSONL file
function ingestProject(project) {
  return new Promise((resolve) => {
    const filePath = findProjectFile(project);
    if (!filePath) {
      resolve();
      return;
    }

    console.log(`\n✓ Processing ${project}`);
    console.log(`  File: ${path.basename(filePath)}`);
    console.log(`  Size: ${(fs.statSync(filePath).size / 1024 / 1024).toFixed(1)}M`);

    const fileStream = fs.createReadStream(filePath);
    const rl = readline.createInterface({
      input: fileStream,
      crlfDelay: Infinity
    });

    const conversations = {};
    let lineCount = 0;
    let startTime = Date.now();

    rl.on('line', (line) => {
      try {
        const msg = JSON.parse(line);

        // Skip non-message types
        if (msg.type === 'file-history-snapshot' || !msg.sessionId) return;

        // Extract conversation ID from sessionId
        const convId = msg.sessionId;
        if (!conversations[convId]) {
          conversations[convId] = {
            id: convId,
            messages: [],
            date: msg.timestamp || new Date().toISOString()
          };
        }

        // Handle nested message structure
        let role = msg.type; // 'user' or 'assistant'
        let content = '';
        let messageId = msg.uuid || lineCount;

        if (msg.message) {
          role = msg.message.role || msg.type;

          // Extract content from various formats
          if (typeof msg.message.content === 'string') {
            content = msg.message.content;
          } else if (Array.isArray(msg.message.content)) {
            // Extract text from content array
            content = msg.message.content
              .map(c => {
                if (c.type === 'text' && c.text) return c.text;
                if (c.type === 'thinking' && c.thinking) return `[THINKING] ${c.thinking}`;
                return '';
              })
              .filter(Boolean)
              .join('\n');
          }

          messageId = msg.message.id || msg.uuid || lineCount;
        }

        // Only add if we have content
        if (content.length > 0) {
          conversations[convId].messages.push({
            id: messageId,
            role: role,
            content: content,
            timestamp: msg.timestamp || new Date().toISOString()
          });
        }

        lineCount++;
      } catch (e) {
        // Skip malformed JSON
      }
    });

    rl.on('close', () => {
      let convCount = 0;
      let msgCount = 0;

      // Insert each conversation
      Object.values(conversations).forEach((conv) => {
        if (conv.messages.length === 0) return;

        convCount++;
        msgCount += conv.messages.length;

        // Extract metadata
        const fullText = conv.messages
          .map(m => `${m.role.toUpperCase()}: ${m.content}`)
          .join('\n\n');

        const content = fullText.toLowerCase();
        const hasProjects = ['Q8', 'Q10', 'Q11', 'Q12', 'Q14', 'Q18', 'Q19', 'Q21', 'ESLTP']
          .filter(p => content.includes(p.toLowerCase()))
          .join(', ') || project;

        const keywords = (hasProjects + ', ' +
          ['avatar', 'phone', 'api', 'database', 'deployment', 'automation', 'multi-language', 'voice', 'inventory', 'component', 'circuit']
            .filter(k => content.includes(k))
            .join(', ')).split(', ').filter(Boolean).slice(0, 5).join(', ');

        const summary = conv.messages.length > 0
          ? `User: ${conv.messages[0].content.substring(0, 50)}... | ` +
            `Assistant: ${conv.messages[conv.messages.length - 1].content.substring(0, 50)}...`
          : 'No summary';

        const hasStatus = content.includes('todo') || content.includes('next') ||
                         content.includes('pending') || content.includes('incomplete') ||
                         content.includes('done') || content.includes('complete');
        const status = (content.includes('pending') || content.includes('incomplete')) ? 'incomplete' : 'complete';

        const date = conv.date.split('T')[0];
        const tokenEst = Math.ceil(fullText.length / 4);

        // Insert into conversations_metadata
        db.run(
          `INSERT OR REPLACE INTO conversations_metadata
           (conversation_id, project, date, title, message_count, key_topics, summary, status, has_todos, last_updated)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now'))`,
          [conv.id, project, date, `${project} conversation`, conv.messages.length, keywords, summary, status, (status === 'incomplete') ? 1 : 0]
        );

        // Insert into conversations_full
        db.run(
          `INSERT OR REPLACE INTO conversations_full
           (conversation_id, full_text, token_estimate, created_at)
           VALUES (?, ?, ?, ?)`,
          [conv.id, fullText, tokenEst, conv.date]
        );

        // Insert individual messages
        conv.messages.forEach((msg, idx) => {
          db.run(
            `INSERT OR IGNORE INTO messages
             (conversation_id, message_id, role, content, timestamp)
             VALUES (?, ?, ?, ?, ?)`,
            [conv.id, msg.id || idx, msg.role, msg.content, msg.timestamp]
          );
        });
      });

      const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
      console.log(`  Conversations: ${convCount}`);
      console.log(`  Messages: ${msgCount}`);
      console.log(`  Time: ${elapsed}s`);
      totalConversations += convCount;
      totalMessages += msgCount;
      resolve();
    });

    rl.on('error', (err) => {
      console.error(`✗ Error reading file: ${err.message}`);
      resolve();
    });
  });
}

// Main execution
async function main() {
  console.log(`\n═══════════════════════════════════════════════════`);
  console.log(`  HAIKU-INDEX: Q-Series Ingest`);
  console.log(`═══════════════════════════════════════════════════\n`);

  // Clear old data
  db.run(`DELETE FROM messages`);
  db.run(`DELETE FROM conversations_full`);
  db.run(`DELETE FROM conversations_metadata`);

  console.log(`✓ Cleared old data\n`);

  // Ingest each project sequentially
  for (const project of projectsToIngest) {
    await ingestProject(project);
  }

  // Final stats
  console.log(`\n✓ Summary:`);
  console.log(`  Total Conversations: ${totalConversations}`);
  console.log(`  Total Messages: ${totalMessages}`);

  // Verify data
  db.all(`SELECT COUNT(*) as count FROM conversations_metadata`, (err, rows) => {
    if (err) {
      console.error('✗ Error:', err);
      db.close();
      process.exit(1);
      return;
    }

    console.log(`  Database Conversations: ${rows[0].count}`);

    // Get project breakdown
    db.all(`SELECT project, COUNT(*) as count FROM conversations_metadata GROUP BY project ORDER BY project`, (err, projects) => {
      if (!err && projects.length > 0) {
        console.log(`\n  Projects:`);
        projects.forEach(p => {
          console.log(`    ${p.project}: ${p.count} conversation(s)`);
        });
      }

      console.log(`\n✓ Ingest Complete!\n`);
      db.close();
    });
  });
}

main().catch(err => {
  console.error('✗ Error:', err);
  db.close();
  process.exit(1);
});
