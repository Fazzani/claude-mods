export type ToolKind = 'builtin' | 'mcp' | 'skill' | 'agent' | 'plugin' | 'hook'

export type ToolStat = {
  /** `Bash`, `mcp__github__search`, `skill:pdf`, `agent:Explore`, `hook:PreToolUse`. */
  key: string
  /** What the row shows. */
  label: string
  kind: ToolKind
  /** The MCP server, plugin or skill namespace the tool belongs to, when it has one. */
  source: string | null
  calls: number
  errors: number
  running: number
  /** Estimated tokens of the arguments the model wrote (output tokens). */
  inTokens: number
  /** Estimated tokens of the results the model read back (input tokens). */
  outTokens: number
  /** Estimated tokens of the tool's description sent with each request. */
  defTokens: number
  lastAt: number
}

export type ToolsSort = 'tokens' | 'calls' | 'name'

declare module 'claude-code' {
  interface PluginState {
    'tools-usage': {
      tools: ToolStat[]
      sort: ToolsSort
    }
  }
}
