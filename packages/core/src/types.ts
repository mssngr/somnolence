import type { IncomingMessage } from 'node:http'
import type { Static, TSchema } from '@sinclair/typebox'

export type Route = {
  query?: TSchema
  body?: TSchema
  response: TSchema
  handler: (_: {
    query: Static<TSchema>
    body: Static<TSchema>
  }) => Static<TSchema> | Promise<Static<TSchema>>
  authorizer?: (_: {
    req: Request | IncomingMessage
    query: Static<TSchema>
    body: Static<TSchema>
  }) => boolean | Promise<boolean>
  onStart?: (_: {
    req: Request | IncomingMessage
    query: Static<TSchema>
    body: Static<TSchema>
  }) => void
  onFinish?: (_: {
    req: Request | IncomingMessage
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
  query?: Q
  body?: B
  response: R
  handler: (_: { query: Static<Q>; body: Static<B> }) =>
    | Static<R>
    | Promise<Static<R>>
  authorizer?: (_: {
    req: Request | IncomingMessage
    query: Static<Q>
    body: Static<B>
  }) => boolean | Promise<boolean>
  onStart?: (_: {
    req: Request | IncomingMessage
    query: Static<Q>
    body: Static<B>
  }) => void
  onFinish?: (_: {
    req: Request | IncomingMessage
    query: Static<Q>
    body: Static<B>
    response: Static<R>
  }) => void
}

export const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'] as const
export type Method = (typeof METHODS)[number]

export type RouteObj = Partial<Record<Method, Route>>

export type Routes =
  | {
      [route: string]: Routes | RouteObj
    }
  | RouteObj

export type FlattenedRoutes = Record<string, RouteObj>

export type Schema = Record<string, Partial<Record<Method, TSchema>>>
