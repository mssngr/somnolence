import { createSomnolenceServer } from '@somnolence/bun'

const somnolence = createSomnolenceServer({
  routes: {
    hello: () => 'Hello, world!',
    parent: {
      '/': () => 'Parent route',
      child: {
        '/': () => 'Child route',
        grandchild: () => 'Grandchild route',
      },
    },
  },
  routesType: {
    configPath: './tsconfig.json',
    path: './main',
  },
})

somnolence.start()
