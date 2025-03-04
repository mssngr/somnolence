import { createRoute, createSomnolenceServer, t } from './'

const example = createSomnolenceServer({
  routes: {
    '/': createRoute({
      method: 'GET',
      response: t.String(),
      handler: () => 'I am root!',
    }),
    helloGET: createRoute({
      method: 'GET',
      query: t.Object({ name: t.String() }),
      response: t.String(),
      handler: ({ query: { name } }) => `Hello, ${name}!`,
    }),
    helloPOST: createRoute({
      method: 'POST',
      body: t.Object({ name: t.String() }),
      response: t.String(),
      handler: ({ body: { name } }) => `Hello, ${name}!`,
    }),
    parent: {
      '/': createRoute({
        method: 'GET',
        response: t.String(),
        handler: () => 'Parent route',
      }),
      child: {
        '/': createRoute({
          method: 'GET',
          response: t.String(),
          handler: () => 'Child route',
        }),
        grandchild: createRoute({
          method: 'GET',
          response: t.String(),
          handler: () => 'Grandchild route',
        }),
      },
    },
    authorized: createRoute({
      method: 'GET',
      response: t.String(),
      handler: () => 'Authorized route',
      authorizer: ({ req }) => req.headers.authorization === 'Bearer 1234',
    }),
    lifecycle: createRoute({
      method: 'GET',
      response: t.String(),
      handler: () => 'Lifecycle route',
      onStart: () => console.log('Starting...'),
      onFinish: () => console.log('Finishing...'),
    }),
  },
})

example.start()
