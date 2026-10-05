import { expect, test } from 'claude-code/testing'

import { findSecrets, maskText } from '../hooks/patterns'

const KEY = 'sk-ant-api03-AbCdEfGhIjKlMnOpQrStUvWxYz0123456789'

test('finds common secrets and leaves placeholders alone', async () => {
  expect(findSecrets(`ANTHROPIC_API_KEY=${KEY}`).length).toBe(1)
  expect(findSecrets('password = "hunter2hunter2"').length).toBe(1)
  expect(findSecrets('postgres://admin:S3cr3tPass@db:5432/app').length).toBe(1)
  expect(findSecrets('AKIAIOSFODNN7EXAMPLE').length).toBe(1)
  expect(findSecrets('token: ${GITHUB_TOKEN}').length).toBe(0)
  expect(findSecrets('nothing to see here').length).toBe(0)
  expect(maskText(`key ${KEY} end`)).not.toContain(KEY)
})

for (const surface of ['terminal', 'desktop'] as const) {
  test(`assistant message draws a hover reveal on ${surface}`, async $ => {
    const drawn = await $.ui.mount({
      plugin: 'secret-mask',
      surface,
      component: 'AssistantMessage',
      props: { text: `Your key is ${KEY}\nkeep it safe`, isFirstOfReply: true },
    })
    expect(await drawn.find({ key: 'secret-0-1' })).toBeDefined()
    expect(await drawn.find({ text: /••••/ })).toBeDefined()
  })

  test(`bash output draws a hover reveal on ${surface}`, async $ => {
    const drawn = await $.ui.mount({
      plugin: 'secret-mask',
      surface,
      component: 'ToolResult',
      props: {
        tool_use_id: 't1',
        tool: 'Bash',
        output: { stdout: `DB_PASSWORD=supersecretvalue\nOK\n`, stderr: '', interrupted: false },
        isErrored: false,
      },
    })
    expect(await drawn.find({ key: 'secret-0-1' })).toBeDefined()
  })
}
