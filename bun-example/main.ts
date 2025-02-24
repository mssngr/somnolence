import { createSomnolenceServer } from '@somnolence/bun/main'

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
})

somnolence.start()
