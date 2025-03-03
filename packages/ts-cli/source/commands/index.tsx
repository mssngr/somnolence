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
): Promise<{
  body: ${titlePath}['response']
  status: number
} | {
  error: string
  status: number
}> {
  try {
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
    const contentType = response.headers.get('content-type')
    const content = contentType === 'application/json'
      ? await response.json()
      : await response.text()
    return response.status === 200
      ? { body: content, status: response.status }
      : { error: content, status: response.status }
  } catch (err) {
    const error = err as Error
    return { error: error.message, status: 500 }
  }
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
    .default('node_modules/@somnolence/client')
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
              const fileName = `${titlePath}.ts`
              return Promise.all([
                fs.writeFile(
                  `${options.outdir}/routes/${fileName}`,
                  createRoute({
                    titlePath,
                    typeScript: ts,
                    url: `${options.endpoint}/${path === '__root' ? '' : path}`,
                    method: (
                      route as { properties: { method: { const: string } } }
                    ).properties.method.const,
                  }),
                ),
                fs.appendFile(
                  `${options.outdir}/routes/index.ts`,
                  `export * from './${fileName}'\n`,
                ),
                fs.appendFile(
                  `${options.outdir}/index.ts`,
                  `  '${path}': routes.${titlePath},\n`,
                ),
              ])
            })
          }),
        )
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
