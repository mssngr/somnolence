import { describe, expect, test } from 'bun:test'
import { createRoute, createSomnolenceServer, t } from './'

describe('createSomonlenceServer', () => {
  test('should create a functional server', async () => {
    const server = createSomnolenceServer({
      port: 3000,
      routes: {
        '/hello': {
          GET: createRoute({
            query: t.Object({
              name: t.String(),
            }),
            response: t.String(),
            handler: ({ query }) => `Hello, ${query.name}!`,
          }),
          ':name': {
            GET: createRoute({
              response: t.String(),
              handler: ({ params }) => `Hello, ${params?.name}!`,
            }),
          },
        },
      },
    })
    expect(server).toBeDefined()
    server.start()
    const response1 = await fetch('http://localhost:3000/hello?name=World')
    const text1 = await response1.text()
    expect(text1).toBe('Hello, World!')
    const response2 = await fetch('http://localhost:3000/hello/World')
    const text2 = await response2.text()
    expect(text2).toBe('Hello, World!')
  })
})
