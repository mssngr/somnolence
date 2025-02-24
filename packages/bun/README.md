# @somnolence/bun

To install:

```bash
bun add @somnolence/bun
```

To use:

```typescript
import { createSomnolenceServer } from '@somnolence/bun'

export type Routes = {
  hello: () => string
}

const somnolence = createSomnolenceServer<Routes>({
  routes: {
    hello: () => 'Hello, world!',
  },
})

somnolence.start()
```

```bash
curl http://localhost:3000/hello
```
