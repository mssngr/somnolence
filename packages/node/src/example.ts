import { createRoute, createSomnolenceServer, t } from './'

const example = createSomnolenceServer({
  routes: {
    GET: createRoute({
      response: t.String(),
      handler: () => 'I am root!',
    }),
    hello: {
      GET: createRoute({
        query: t.Object({ name: t.String() }),
        response: t.String(),
        handler: ({ query: { name } }) => `Hello, ${name}!`,
      }),
      POST: createRoute({
        body: t.Object({ name: t.String() }),
        response: t.String(),
        handler: ({ body: { name } }) => `Hello, ${name}!`,
      }),
    },
    parent: {
      GET: createRoute({
        response: t.String(),
        handler: () => 'Parent route',
      }),
      child: {
        GET: createRoute({
          response: t.String(),
          handler: () => 'Child route',
        }),
        grandchild: {
          GET: createRoute({
            response: t.String(),
            handler: () => 'Grandchild route',
          }),
        },
      },
    },
    authorized: {
      GET: createRoute({
        response: t.String(),
        handler: () => 'Authorized route',
        authorizer: ({ req }) => req.headers.authorization === 'Bearer 1234',
      }),
    },
    lifecycle: {
      GET: createRoute({
        response: t.String(),
        handler: () => 'Lifecycle route',
        onStart: () => console.log('Starting...'),
        onFinish: () => console.log('Finishing...'),
      }),
    },
  },
})

example.start()
