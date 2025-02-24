# @somnolence/bun

To install:

```bash
bun add @somnolence/bun
```

To use:

```typescript
import { createSomnolenceServer } from '@somnolence/bun'

const somnolence = createSomnolenceServer({routes: {
  '/': () => 'Hello, world!'
}})

somnolence.start()
```
