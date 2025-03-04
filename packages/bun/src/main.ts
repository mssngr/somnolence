import {
  type CreateSomnolenceServerArgs,
  flattenRoutes,
  generateSchema,
  handleRequest,
} from '@somnolence/core'

export function createSomnolenceServer({
  port = 3000,
  routes,
}: CreateSomnolenceServerArgs) {
  const flattenedRoutes = flattenRoutes(routes)
  const schema = generateSchema(flattenedRoutes)
  return {
    start() {
      console.info(`💤 Somnolence is running at http://localhost:${port}`)
      Bun.serve({
        port,
        async fetch(req) {
          return handleRequest(req, {
            flattenedRoutes,
            schema,
            handleResponse(response) {
              if (typeof response === 'object' && response !== null) {
                return Response.json(response)
              }
              return new Response(response as BodyInit)
            },
            handleError(errorMsg, status) {
              return new Response(errorMsg, { status })
            },
          })
        },
      })
    },
  }
}
