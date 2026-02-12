/**
 * Linear issue reference detection and prompt hint formatting.
 */

// Matches: https://linear.app/{workspace}/issue/{ID}/...
// Also handles Slack-formatted links: <https://linear.app/...|LIN-123>
const LINEAR_URL_RE = /https?:\/\/linear\.app\/[\w-]+\/issue\/([\w]+-\d+)/gi;

// Matches bare identifiers like LIN-123, ENG-456 (2-10 uppercase letters, dash, digits)
const LINEAR_ID_RE = /\b([A-Z]{2,10}-\d+)\b/g;

/**
 * Extract unique Linear issue references from text.
 * Detects both URLs (linear.app/team/issue/ENG-123) and bare IDs (ENG-123).
 */
export function extractLinearRefs(text: string): string[] {
  const refs = new Set<string>();

  for (const match of text.matchAll(LINEAR_URL_RE)) {
    refs.add(match[1].toUpperCase());
  }

  for (const match of text.matchAll(LINEAR_ID_RE)) {
    refs.add(match[1]);
  }

  return [...refs];
}

/**
 * Format a prompt prefix hinting the agent to use Linear MCP tools.
 */
export function formatLinearHint(refs: string[]): string {
  const issueList = refs.join(", ");
  return `The user is referencing Linear issue(s): ${issueList}. Use your Linear MCP tools to fetch the full issue details before starting work.`;
}
