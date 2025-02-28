#!/usr/bin/env node
import Pastel from 'pastel'

const app = new Pastel({
  name: 'somnolence-ts',
  importMeta: import.meta,
})

await app.run()
