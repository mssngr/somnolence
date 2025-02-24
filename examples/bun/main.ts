import { createSomnolenceServer } from '@somnolence/bun'

export type Routes = {
  hello: () => string
  parent: {
    '/': () => string
    child: {
      '/': () => string
      grandchild: () => string
    }
  }
}

const somnolence = createSomnolenceServer<Routes>({
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
    path: './main',
  },
})

somnolence.start()
