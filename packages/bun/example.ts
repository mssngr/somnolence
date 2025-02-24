import { createSomnolenceServer, createRoute, t } from './'

const example = createSomnolenceServer({
  routes: {
    '/': createRoute({
      input: t.Null(),
      output: t.String(),
      handler: () => 'I am root!',
    }),
    hello: createRoute({
      input: t.Object({ name: t.String() }),
      output: t.Object({ greeting: t.String() }),
      handler: ({ name }) => ({ greeting: `Hello, ${name}!` }),
    }),
    parent: {
      '/': createRoute({
        input: t.Null(),
        output: t.String(),
        handler: () => 'Parent route',
      }),
      child: createRoute({
        input: t.Null(),
        output: t.String(),
        handler: () => 'Child route',
      }),
    },
  },
})

example.start()
