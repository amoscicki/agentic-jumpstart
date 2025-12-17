import { createServerFn } from "@tanstack/react-start";
import {
  authenticatedMiddleware,
  adminMiddleware,
  unauthenticatedMiddleware,
} from "~/lib/auth";
import { createFeatureFlagMiddleware } from "~/lib/feature-flags";
import {
  createLaunchKitUseCase,
  updateLaunchKitUseCase,
  deleteLaunchKitUseCase,
  getAllLaunchKitsUseCase,
  getLaunchKitByIdUseCase,
  getLaunchKitBySlugUseCase,
  cloneLaunchKitUseCase,
  createCategoryUseCase,
  updateCategoryUseCase,
  deleteCategoryUseCase,
  getAllCategoriesUseCase,
  createTagUseCase,
  updateTagUseCase,
  deleteTagUseCase,
  getAllTagsUseCase,
  getTagsByCategoryUseCase,
  getLaunchKitCommentsUseCase,
  createLaunchKitCommentUseCase,
  updateLaunchKitCommentUseCase,
  deleteLaunchKitCommentUseCase,
  trackLaunchKitViewUseCase,
  getLaunchKitStatsUseCase,
  type CreateLaunchKitInput,
  type UpdateLaunchKitInput,
  type CreateCategoryInput,
  type UpdateCategoryInput,
  type CreateTagInput,
  type UpdateTagInput,
  type CreateCommentInput,
} from "~/use-cases/launch-kits";

const launchKitsFeatureMiddleware = createFeatureFlagMiddleware("LAUNCH_KITS_FEATURE");

// Public functions
export const getAllLaunchKitsFn = createServerFn({
  method: "POST",
})
  .middleware([unauthenticatedMiddleware, launchKitsFeatureMiddleware])
  .validator((data: { tags?: string[]; search?: string }) => data)
  .handler(async ({ data }) => {
    return getAllLaunchKitsUseCase(data);
  });

export const getLaunchKitBySlugFn = createServerFn({
  method: "POST",
})
  .middleware([unauthenticatedMiddleware, launchKitsFeatureMiddleware])
  .validator((data: { slug: string }) => data)
  .handler(async ({ data }) => {
    return getLaunchKitBySlugUseCase(data.slug);
  });

export const getLaunchKitByIdFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .validator((data: { id: number }) => data)
  .handler(async ({ data }) => {
    return getLaunchKitByIdUseCase(data.id);
  });

export const trackLaunchKitViewFn = createServerFn({
  method: "POST",
})
  .middleware([unauthenticatedMiddleware, launchKitsFeatureMiddleware])
  .validator((data: { slug: string }) => data)
  .handler(async ({ data, context }) => {
    return trackLaunchKitViewUseCase(data.slug, context.userId);
  });

export const cloneLaunchKitFn = createServerFn({
  method: "POST",
})
  .middleware([unauthenticatedMiddleware, launchKitsFeatureMiddleware])
  .validator((data: { slug: string }) => data)
  .handler(async ({ data, context }) => {
    return cloneLaunchKitUseCase(data.slug, context.userId);
  });

// Admin functions
export const createLaunchKitFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .validator((data: CreateLaunchKitInput) => data)
  .handler(async ({ data, context }) => {
    return createLaunchKitUseCase(context.userId, data);
  });

export const updateLaunchKitFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .validator((data: { id: number; updates: UpdateLaunchKitInput }) => data)
  .handler(async ({ data, context }) => {
    return updateLaunchKitUseCase(context.userId, data.id, data.updates);
  });

export const deleteLaunchKitFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .validator((data: { id: number }) => data)
  .handler(async ({ data, context }) => {
    return deleteLaunchKitUseCase(context.userId, data.id);
  });

export const getLaunchKitStatsFn = createServerFn({
  method: "GET",
})
  .middleware([adminMiddleware])
  .handler(async ({ context }) => {
    return getLaunchKitStatsUseCase(context.userId);
  });

// Category management (Admin)
export const createCategoryFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .validator((data: CreateCategoryInput) => data)
  .handler(async ({ data, context }) => {
    return createCategoryUseCase(context.userId, data);
  });

export const updateCategoryFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .validator((data: { id: number; updates: UpdateCategoryInput }) => data)
  .handler(async ({ data, context }) => {
    return updateCategoryUseCase(context.userId, data.id, data.updates);
  });

export const deleteCategoryFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .validator((data: { id: number }) => data)
  .handler(async ({ data, context }) => {
    return deleteCategoryUseCase(context.userId, data.id);
  });

export const getAllCategoriesFn = createServerFn({
  method: "GET",
})
  .middleware([unauthenticatedMiddleware, launchKitsFeatureMiddleware])
  .handler(async () => {
    return getAllCategoriesUseCase();
  });

// Tag management (Admin)
export const createTagFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .validator((data: CreateTagInput) => data)
  .handler(async ({ data, context }) => {
    return createTagUseCase(context.userId, data);
  });

export const updateTagFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .validator((data: { id: number; updates: UpdateTagInput }) => data)
  .handler(async ({ data, context }) => {
    return updateTagUseCase(context.userId, data.id, data.updates);
  });

export const getAllTagsFn = createServerFn({
  method: "GET",
})
  .middleware([unauthenticatedMiddleware, launchKitsFeatureMiddleware])
  .handler(async () => {
    return getAllTagsUseCase();
  });

export const getTagsByCategoryFn = createServerFn({
  method: "GET",
})
  .middleware([unauthenticatedMiddleware, launchKitsFeatureMiddleware])
  .handler(async () => {
    return getTagsByCategoryUseCase();
  });

export const deleteTagFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .validator((data: { id: number }) => data)
  .handler(async ({ data, context }) => {
    return deleteTagUseCase(context.userId, data.id);
  });

// Comments
export const getLaunchKitCommentsFn = createServerFn({
  method: "POST",
})
  .middleware([unauthenticatedMiddleware, launchKitsFeatureMiddleware])
  .validator((data: { launchKitId: number }) => data)
  .handler(async ({ data }) => {
    return getLaunchKitCommentsUseCase(data.launchKitId);
  });

export const createLaunchKitCommentFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .validator((data: { launchKitId: number } & CreateCommentInput) => data)
  .handler(async ({ data, context }) => {
    return createLaunchKitCommentUseCase(context.userId, data.launchKitId, {
      content: data.content,
      parentId: data.parentId,
    });
  });

export const updateLaunchKitCommentFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .validator((data: { commentId: number; content: string }) => data)
  .handler(async ({ data, context }) => {
    return updateLaunchKitCommentUseCase(
      context.userId,
      data.commentId,
      data.content
    );
  });

export const deleteLaunchKitCommentFn = createServerFn({
  method: "POST",
})
  .middleware([authenticatedMiddleware])
  .validator((data: { commentId: number }) => data)
  .handler(async ({ data, context }) => {
    return deleteLaunchKitCommentUseCase(context.userId, data.commentId);
  });
