// HAIKU-INDEX: Utility Functions

// Extract keywords and projects from text
function extractKeywords(text) {
  const projectRegex = /Q\d+|ESLTP|AAA|BBB|CCCMPS|DOCTOR|IDEAVOICE/gi;
  const projects = [...new Set(text.match(projectRegex) || [])];

  // Extract common topics
  const topics = new Set();
  const keywords = ['avatar', 'voice', 'tts', 'stt', 'component', 'circuit', 'inventory', 'api', 'database', 'nodejs', 'nginx', 'postgres', 'cli', 'ui', 'frontend', 'backend', 'deployment', 'failover', 'sync'];
  keywords.forEach(kw => {
    if (text.toLowerCase().includes(kw)) {
      topics.add(kw);
    }
  });

  return {
    projects: projects.sort(),
    topics: Array.from(topics).sort()
  };
}

// Generate summary from messages
function generateSummary(messages) {
  if (!messages || messages.length === 0) return 'No summary available';

  const userMsg = messages.find(m => m.role === 'user');
  const lastAssistantMsg = [...messages].reverse().find(m => m.role === 'assistant');

  let summary = '';
  if (userMsg) {
    summary += 'User: ' + userMsg.content.substring(0, 50);
    if (userMsg.content.length > 50) summary += '...';
  }
  summary += ' | ';
  if (lastAssistantMsg) {
    summary += 'Assistant: ' + lastAssistantMsg.content.substring(0, 50);
    if (lastAssistantMsg.content.length > 50) summary += '...';
  }

  return summary;
}

// Detect status (complete/incomplete)
function detectStatus(text) {
  const incompleteKeywords = ['TODO', 'PENDING', 'NEXT', 'upcoming', 'future', 'incomplete', 'wip', 'work in progress'];
  const hasIncomplete = incompleteKeywords.some(kw => text.toUpperCase().includes(kw));
  return hasIncomplete ? 'incomplete' : 'complete';
}

// Detect TODOs
function detectTodos(text) {
  const todoRegex = /TODO|PENDING|NEXT|upcoming|future/gi;
  return todoRegex.test(text);
}

// Format conversation for Claude.ai export
function formatForExport(fullText) {
  return `
==========================================
HAIKU-INDEX: Exported Conversation
==========================================
${fullText}
==========================================
`.trim();
}

// Estimate tokens (chars / 4 is rough approximation)
function estimateTokens(text) {
  return Math.ceil((text || '').length / 4);
}

// Format timestamp
function formatTimestamp(ts) {
  const d = new Date(ts);
  return d.toISOString().split('T')[0];
}

module.exports = {
  extractKeywords,
  generateSummary,
  detectStatus,
  detectTodos,
  formatForExport,
  estimateTokens,
  formatTimestamp
};
