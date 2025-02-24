# @somnolence/bun

To install:

```bash
bun add @somnolence/bun
```

To use:

```typescript
import { createSomnolenceServer } from '@somnolence/bun'

const somnolence = createSomnolenceServer({
  port: 9876, // Defaults to 3000
  routes: {
    hello: () => 'Hello, world!',
  },
})

somnolence.start()
```
