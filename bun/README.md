# @somnolence/bun

To install:

```bash
bun add @somnolence/bun
```

To use:

```typescript
import { createNapServer } from '@nap/bun'

const napServer = createNapServer({routes: {
  '/': () => 'Hello, world!'
}})

napServer.start()
```
