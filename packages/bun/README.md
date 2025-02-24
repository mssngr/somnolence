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
      input: t.Object({ name: t.String() }),
      output: t.Object({ greeting: t.String() }),
      handler: ({ name }) => ({ greeting: `Hello, ${name}!` }),
    }),
  },
})

somnolence.start()
```

### Use the server:
```bash
curl http://localhost:3000/hello\?name\=Gabriel
# {"output":{"greeting":"Hello, Gabriel!"}}
```
Or...
```bash
curl -d '{"name":"Gabriel"}' -H "Content-Type: application/json" -X POST http://localhost:3000/hello
# {"output":{"greeting":"Hello, Gabriel!"}}
```

### Out of the box schema validation:
```bash
curl http://localhost:3000/hello\?name\=1
# Expected string
curl http://localhost:3000/hello\?name\=false
# Expected string
curl http://localhost:3000/hello\?name\=comma,delimited,values,make,an,array
# Expected string
curl -d '{"name":"comma,delimited,values,make,an,array"}' -H "Content-Type: application/json" -X POST http://localhost:3000/hello
# {"output":{"greeting":"Hello, comma,delimited,values,make,an,array!"}}
```

### Get the raw JSON Schema:
```bash
curl http://localhost:3000/__schema
```
```json
{
  "hello": {
    "input": {
      "type": "object",
      "properties": { "name": { "type": "string" } },
      "required": ["name"]
    },
    "output": {
      "type": "object",
      "properties": { "greeting": { "type": "string" } },
      "required": ["greeting"]
    }
  }
}
```

### Auto-generate a type-safe client:
