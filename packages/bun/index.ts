import type { TSchema, Static } from '@sinclair/typebox'
import { type AssertError, Value } from '@sinclair/typebox/value'
import queryString from 'query-string'

export type Route = {
  input: TSchema
  output: TSchema
  handler: (input: Static<TSchema>) => Static<TSchema>
  authorize?: (req: Request, input: Static<TSchema>) => boolean
}
export type Routes = {
  [route: string]: Route | Routes
}
export type Schema = Record<string, { input: TSchema; output: TSchema }>

function dotNotatePath(path: string): string {
  // Take off leading and trailing slashes and replace remaining slashes with dots
  return path.replace(/^\//, '').replace(/\/$/, '').replace(/\//g, '.')
}

function flattenRoutes(
  routes: Routes,
  parentPath?: string,
): Record<string, Route> {
  const dotNotationParentPath = parentPath ? dotNotatePath(parentPath) : ''
  return Object.entries(routes).reduce<Record<string, Route>>(
    (accum, [path, route]) => {
      const dotNotationPath = dotNotatePath(path)
      if (route.input && route.output && route.handler) {
        return Object.assign(accum, {
          [`${dotNotationParentPath}${dotNotationParentPath && dotNotationPath && '.'}${dotNotationPath}`]:
            route,
        })
      }
      return Object.assign(
        accum,
        flattenRoutes(
          route as Routes,
          `${dotNotationParentPath}${dotNotatePath(path)}`,
        ),
      )
    },
    {} as Record<string, Route>,
  )
}

export function createSomnolenceServer({
  port = 3000,
  routes,
}: {
  port?: number
  routes: Routes
}) {
  const flattenedRoutes = flattenRoutes(routes)
  const schema = Object.entries(flattenedRoutes).reduce<Schema>(
    (accum, [path, { input, output }]) =>
      Object.assign(accum, {
        [path]: { input, output },
      }),
    {} as Schema,
  )
  return {
    start() {
      console.info(`💤 Somnolence is running at http://localhost:${port}`)
      Bun.serve({
        port,
        async fetch(req) {
          try {
            const url = new URL(req.url)
            if (url.pathname === '/__schema') {
              console.log(schema)
              return Response.json(schema)
            }
            const route: Route | undefined =
              flattenedRoutes[dotNotatePath(url.pathname)]
            if (route?.handler) {
              const queryParams = queryString.parse(
                url.searchParams.toString(),
                {
                  parseBooleans: true,
                  parseNumbers: true,
                  arrayFormat: 'comma',
                },
              )
              const body = req.body && (await req.json())
              const input = { ...queryParams, ...(body || {}) }
              try {
                Value.Assert(route.input, input)
              } catch (err) {
                const error = err as AssertError
                console.error(error.message)
                return new Response(error.message, { status: 400 })
              }
              const output = route.handler(input)
              return Response.json({ output })
            }
            return new Response('Not Found', { status: 404 })
          } catch (err) {
            const error = err as Error
            console.error(error)
            return new Response(error.message, { status: 500 })
          }
        },
      })
    },
  }
}

export function createRoute<Input extends TSchema, Output extends TSchema>({
  input,
  output,
  handler,
}: {
  input: Input
  output: Output
  handler: (input: Static<Input>) => Static<Output>
}): Route {
  return { input, output, handler }
}

export { default as t } from './t'
