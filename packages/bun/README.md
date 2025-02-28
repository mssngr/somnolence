# @somnolence/bun

## Installation

```bash
bun add @somnolence/bun
```

## Usage

### Create & run the server:
```typescript
import { createRoute, createSomnolenceServer, t } from '@somnolence/bun'

const somnolence = createSomnolenceServer({
  routes: {
    hello: createRoute({
      method: 'GET',
      query: t.Object({ name: t.String() }),
      response: t.String(),
      handler: ({ query: { name } }) => `Hello, ${name}!`,
    }),
  },
})

somnolence.start()
```

### Use the server:
```bash
curl http://localhost:3000/hello\?name\=Gabriel
# Hello, Gabriel!
```

### Out of the box schema validation:
```bash
curl http://localhost:3000/hello\?name\=1
# Expected string
curl http://localhost:3000/hello\?name\=false
# Expected string
curl http://localhost:3000/hello\?name\=comma,delimited,values,make,an,array
# Expected string
```

### Utilize JSON bodies, too:
```typescript
const somnolence = createSomnolenceServer({
  routes: {
    hello: createRoute({
      method: 'POST',
      body: t.Object({ name: t.String() }),
      response: t.String(),
      handler: ({ body: { name } }) => `Hello, ${name}!`,
    }),
  },
})
```
```bash
curl -d '{"name":"Gabriel"}' -H "Content-Type: application/json" -X POST http://localhost:3000/hello
# Hello, Gabriel!
```

### Get the raw JSON Schema:
```bash
curl http://localhost:3000/__schema
```
```json
{
  "hello": {
    "query": {
      "type": "object",
      "properties": { "name": { "type": "string" } },
      "required": ["name"]
    },
    "response": {
      "type": "string"
    }
  }
}
```

### Auto-generate a type-safe client:
