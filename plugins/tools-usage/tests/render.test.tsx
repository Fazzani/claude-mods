import { expect, test } from 'claude-code/testing'

for (const surface of ['terminal', 'desktop'] as const) {
  test(`pane lists tools by kind on ${surface}`, async ($, on) => {
    on('tool.call', () => ({ result: 'ok', text: 'a result the model reads' }) as never)
    await $.tool.call({ tool: 'Bash', command: 'ls' } as never)
    await $.tool.call({ tool: 'mcp__github__search_code', q: 'x' } as never)
    await $.tool.call({ tool: 'Skill', skill: 'anthropic-skills:pdf' } as never)

    const drawn = await $.ui.mount({
      plugin: 'tools-usage',
      surface,
      component: 'Pane',
      requestId: 'tools-usage',
      props: { title: 'Tools', isFocused: false, bodyColumns: 58, placement: 'dock', scroll: { top: 0 } } as never,
    })
    expect(await drawn.find({ key: 'tool-Bash' })).toBeDefined()
    expect(await drawn.find({ key: 'tool-mcp__github__search_code' })).toBeDefined()
    expect(await drawn.find({ key: 'tool-skill:anthropic-skills:pdf' })).toBeDefined()
    expect(await drawn.find({ key: 'sort-calls' })).toBeDefined()
  })
}
