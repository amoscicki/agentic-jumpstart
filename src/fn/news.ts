import { createServerFn } from "@tanstack/react-start";
import { adminMiddleware, unauthenticatedMiddleware } from "~/lib/auth";
import { createFeatureFlagMiddleware } from "~/lib/feature-flags";
import {
  createNewsEntryUseCase,
  createNewsTagUseCase,
  deleteNewsEntryUseCase,
  deleteNewsTagUseCase,
  getAllNewsTagsUseCase,
  getNewsEntriesWithTagsUseCase,
  getNewsEntryByIdUseCase,
  getPublishedNewsEntriesUseCase,
  updateNewsEntryUseCase,
  updateNewsTagUseCase,
  type CreateNewsEntryInput,
  type CreateNewsTagInput,
  type UpdateNewsEntryInput,
  type UpdateNewsTagInput,
} from "~/use-cases/news";

const newsFeatureMiddleware = createFeatureFlagMiddleware("NEWS_FEATURE");

// Public news functions (no authentication required)
export const getPublishedNewsEntriesFn = createServerFn({
  method: "GET",
})
  .middleware([unauthenticatedMiddleware, newsFeatureMiddleware])
  .handler(async () => {
    return getPublishedNewsEntriesUseCase();
  });

export const getAllNewsTagsFn = createServerFn({
  method: "GET",
})
  .middleware([unauthenticatedMiddleware, newsFeatureMiddleware])
  .handler(async () => {
    return getAllNewsTagsUseCase();
  });

// Admin-only news entry functions
export const getNewsEntriesWithTagsFn = createServerFn({
  method: "GET",
})
  .middleware([adminMiddleware])
  .handler(async () => {
    const start = Date.now();
    const result = await getNewsEntriesWithTagsUseCase();
    const end = Date.now();
    console.log(`getNewsEntriesWithTagsUseCase took ${end - start}ms`);
    return result;
  });

export const getNewsEntryByIdFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .validator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    return getNewsEntryByIdUseCase(data.id);
  });

export const createNewsEntryFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .validator((data: CreateNewsEntryInput) => data)
  .handler(async ({ data, context }) => {
    return createNewsEntryUseCase(context.userId, data);
  });

export const updateNewsEntryFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .validator((data: { id: number; updates: UpdateNewsEntryInput }) => data)
  .handler(async ({ data, context }) => {
    return updateNewsEntryUseCase(context.userId, data.id, data.updates);
  });

export const deleteNewsEntryFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .validator((data: { id: number }) => data)
  .handler(async ({ data, context }) => {
    return deleteNewsEntryUseCase(context.userId, data.id);
  });

// Admin-only tag functions
export const createNewsTagFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .validator((data: CreateNewsTagInput) => data)
  .handler(async ({ data, context }) => {
    return createNewsTagUseCase(context.userId, data);
  });

export const updateNewsTagFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .validator((data: { id: number; updates: UpdateNewsTagInput }) => data)
  .handler(async ({ data, context }) => {
    return updateNewsTagUseCase(context.userId, data.id, data.updates);
  });

export const deleteNewsTagFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .validator((data: { id: number }) => data)
  .handler(async ({ data, context }) => {
    return deleteNewsTagUseCase(context.userId, data.id);
  });
