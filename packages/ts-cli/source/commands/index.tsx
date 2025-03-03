import fs from 'node:fs/promises'
import { Text } from 'ink'
import { compile } from 'json-schema-to-typescript'
import type { JSONSchema } from 'json-schema-to-typescript/dist/src/types/JSONSchema.js'
import React from 'react'
import titleize from 'titleize'
import zod from 'zod'

const utils = `export function stringifyQuery(query?: Record<string, unknown>) {
  if (query) {
    return Object.entries(query).reduce((accum, [key, value]) => {
      return accum ? accum + '&' + key + '=' + value : '?' + key + '=' + value
    }, '')
  }
  return ''
}
`

function createRoute({
  typeScript,
  titlePath,
  url,
  method,
}: { typeScript: string; titlePath: string; url: string; method: string }) {
  return `import { stringifyQuery } from './utils'

${typeScript}
type ${titlePath}InputObj = Omit<${titlePath}, 'path' | 'method' | 'response'>
export type ${titlePath}Input = keyof ${titlePath}InputObj extends never ? void : ${titlePath}InputObj

export async function ${titlePath}(
  args: ${titlePath}Input
): Promise<${titlePath}['response']> {
  const unknownArgs = args as unknown
  const unknownArgsObj = unknownArgs
    ? unknownArgs as Record<string, unknown>
    : {}
  const queryString = stringifyQuery(unknownArgsObj.query as Record<string, unknown>)
  const bodyObj = unknownArgsObj.body
    ? {
        body: JSON.stringify(unknownArgsObj.body),
        headers: {
          'Content-Type': 'application/json',
        },
      }
    : {}
  const response = await fetch('${url}' + queryString, {
    method: '${method}',
    ...bodyObj,
  })
  return response.json()
}
`
}

export const options = zod.object({
  endpoint: zod
    .string()
    .default('http://localhost:3000')
    .describe('Endpoint for your Somnolence Server'),
  outdir: zod
    .string()
    .default('node_modules/@somnolence/ts-client')
    .describe('Output directory for generated, type-safe client'),
})

type Props = {
  options: zod.infer<typeof options>
}

export default function Index({ options }: Props) {
  try {
    fetch(`${options.endpoint}/__schema`).then(response =>
      response.json().then(async routes => {
        await fs.rm(options.outdir, { recursive: true, force: true })
        await fs.mkdir(`${options.outdir}/types`, { recursive: true })
        await fs.writeFile(`${options.outdir}/types/index.d.ts`, '')
        await fs.writeFile(
          `${options.outdir}/types/__Routes.d.ts`,
          "import type * as T from './'\n\nexport type Routes = {\n",
        )
        await fs.mkdir(`${options.outdir}/routes`, { recursive: true })
        await fs.writeFile(`${options.outdir}/routes/index.ts`, '')
        await fs.writeFile(
          `${options.outdir}/index.ts`,
          "import * as routes from './routes'\n\nexport default {\n",
        )
        await Promise.all(
          Object.entries(routes).map(async ([path, route]) => {
            const pathWithSpaces = path
              .replace(/([A-Z])/g, ' $1')
              .replace(/\./g, ' ')
              .trim()
            const titlePath =
              path === '__root'
                ? '__Root'
                : titleize(pathWithSpaces).replace(/ /g, '')
            return compile(route as JSONSchema, titlePath, {
              additionalProperties: false,
              bannerComment: '',
            }).then(ts => {
              const fileName = `${titlePath}.d.ts`
              return Promise.all([
                fs.writeFile(`${options.outdir}/types/${fileName}`, ts),
                fs.writeFile(
                  `${options.outdir}/routes/${titlePath}.ts`,
                  createRoute({
                    titlePath,
                    typeScript: ts,
                    url: `${options.endpoint}/${path}`,
                    method: (
                      route as { properties: { method: { const: string } } }
                    ).properties.method.const,
                  }),
                ),
                fs.appendFile(
                  `${options.outdir}/types/index.d.ts`,
                  `export type * from './${fileName}'\n`,
                ),
                fs.appendFile(
                  `${options.outdir}/types/__Routes.d.ts`,
                  `  '${path}': T.${titlePath}\n`,
                ),
                fs.appendFile(
                  `${options.outdir}/routes/index.ts`,
                  `export * from './${titlePath}.ts'\n`,
                ),
                fs.appendFile(
                  `${options.outdir}/index.ts`,
                  `  '${path}': routes.${titlePath},\n`,
                ),
              ])
            })
          }),
        )
        fs.appendFile(`${options.outdir}/types/__Routes.d.ts`, '}\n')
        fs.appendFile(`${options.outdir}/index.ts`, '}\n')
        fs.writeFile(`${options.outdir}/routes/utils.ts`, utils)
      }),
    )

    return (
      <Text>
        💤 Generated Somnolence Client at{' '}
        <Text color="green">{options.outdir}</Text>
      </Text>
    )
  } catch (err) {
    const error = err as Error
    return <Text color="red">{error.message}</Text>
  }
}
