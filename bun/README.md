# @yep/bun

To install:

```bash
bun add @yep/bun
```

To use:

```typescript
import { createNapServer } from '@nap/bun'

const napServer = createNapServer({routes: {
  '/': () => 'Hello, world!'
}})

napServer.start()
```
