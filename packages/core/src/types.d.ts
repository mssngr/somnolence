import type { Static, TSchema } from '@sinclair/typebox'

export type Route = {
  method: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  query?: TSchema
  body?: TSchema
  response: TSchema
  handler: (_: {
    query: Static<TSchema>
    body: Static<TSchema>
  }) => Static<TSchema>
  authorizer?: (_: {
    req: Request
    query: Static<TSchema>
    body: Static<TSchema>
  }) => boolean
  onStart?: (_: {
    req: Request
    query: Static<TSchema>
    body: Static<TSchema>
  }) => void
  onFinish?: (_: {
    req: Request
    query: Static<TSchema>
    body: Static<TSchema>
    response: Static<TSchema>
  }) => void
}

export type UserDefinedRoute<
  Q extends TSchema,
  B extends TSchema,
  R extends TSchema,
> = {
  method: Route['method']
  query?: Q
  body?: B
  response: R
  handler: (_: { query: Static<Q>; body: Static<B> }) => Static<R>
  authorizer?: (_: {
    req: Request
    query: Static<Q>
    body: Static<B>
  }) => boolean
  onStart?: (_: { req: Request; query: Static<Q>; body: Static<B> }) => void
  onFinish?: (_: {
    req: Request
    query: Static<Q>
    body: Static<B>
    response: Static<R>
  }) => void
}

export type Routes = {
  [route: string]: Route | Routes
}

export type Schema = Record<
  string,
  { query?: TSchema; body?: TSchema; response: TSchema }
>

export type CreateSomnolenceServerArgs = {
  port?: number
  routes: Routes
}
