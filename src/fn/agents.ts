import { createServerFn } from "@tanstack/react-start";
import { authenticatedMiddleware, unauthenticatedMiddleware } from "~/lib/auth";
import { createFeatureFlagMiddleware } from "~/lib/feature-flags";
import {
  createAgentUseCase,
  deleteAgentUseCase,
  getAgentBySlugUseCase,
  getPublicAgentsUseCase,
  getUserAgentsUseCase,
  updateAgentUseCase,
  type CreateAgentInput,
  type UpdateAgentInput,
} from "~/use-cases/agents";

const agentsFeatureMiddleware = createFeatureFlagMiddleware("AGENTS_FEATURE");

export const getPublicAgentsFn = createServerFn({
  method: "GET",
})
  .middleware([unauthenticatedMiddleware, agentsFeatureMiddleware])
  .handler(async () => {
    return getPublicAgentsUseCase();
  });

export const getAgentBySlugFn = createServerFn({
  method: "POST",
})
  .middleware([unauthenticatedMiddleware, agentsFeatureMiddleware])
  .validator((data: { slug: string }) => data)
  .handler(async ({ data }: { data: { slug: string } }) => {
    return getAgentBySlugUseCase(data.slug);
  });

export const getUserAgentsFn = createServerFn({
  method: "GET",
})
  .middleware([authenticatedMiddleware, agentsFeatureMiddleware])
  .validator((data: { userId: number }) => data)
  .handler(async ({ context }) => {
    return getUserAgentsUseCase(context.userId);
  });

export const createAgentFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware, agentsFeatureMiddleware])
  .validator((data: CreateAgentInput) => data)
  .handler(async ({ data, context }) => {
    return createAgentUseCase(context.userId, data);
  });

export const updateAgentFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware, agentsFeatureMiddleware])
  .validator((data: { id: number; updates: UpdateAgentInput }) => data)
  .handler(
    async ({
      data,
      context,
    }: {
      data: { id: number; updates: UpdateAgentInput };
      context: { userId: number };
    }) => {
      return updateAgentUseCase(context.userId, data.id, data.updates);
    }
  );

export const deleteAgentFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware, agentsFeatureMiddleware])
  .validator((data: { id: number }) => data)
  .handler(async ({ data, context }) => {
    return deleteAgentUseCase(context.userId, data.id);
  });
