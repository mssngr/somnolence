import { Text } from 'ink'
import { compile } from 'json-schema-to-typescript'
import type { JSONSchema } from 'json-schema-to-typescript/dist/src/types/JSONSchema.js'
import React from 'react'
import zod from 'zod'

export const options = zod.object({
  name: zod.string().default('Stranger').describe('Name'),
})

type Props = {
  options: zod.infer<typeof options>
}

function capitalizeFirstLetter(str: string) {
  return String(str).charAt(0).toUpperCase() + String(str).slice(1)
}

export default function Index({ options }: Props) {
  fetch(`${options.name}/__schema`).then(response =>
    response.json().then(routes => {
      Object.entries(routes).forEach(([path, route]) => {
        console.log(route)
        compile(
          { properties: route as JSONSchema },
          capitalizeFirstLetter(path),
          { additionalProperties: false, bannerComment: '' },
        ).then(ts => {
          console.log(ts)
        })
      })
    }),
  )

  return (
    <Text>
      Hello, <Text color="green">{options.name}</Text>
    </Text>
  )
}
