import { createSomnolenceServer } from '@somnolence/bun/main'

const somnolence = createSomnolenceServer({
  port: 9876, // Defaults to 3000
  routes: {
    hello: () => 'Hello, world!',
    parent: {
      '/': () => 'Parent route',
      child: () => 'Child route',
    },
  },
})

somnolence.start()
