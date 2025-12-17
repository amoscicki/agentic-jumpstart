import { createServerFn } from "@tanstack/react-start";
import { adminMiddleware, unauthenticatedMiddleware } from "~/lib/auth";
import { z } from "zod";
import { FLAG_KEYS, type FlagKey } from "~/config";
import {
  getAppSettingsUseCase,
  toggleEarlyAccessModeUseCase,
  getEarlyAccessModeUseCase,
  getAgentsFeatureEnabledUseCase,
  toggleAgentsFeatureUseCase,
  getLaunchKitsFeatureEnabledUseCase,
  toggleLaunchKitsFeatureUseCase,
  getAffiliatesFeatureEnabledUseCase,
  toggleAffiliatesFeatureUseCase,
  getBlogFeatureEnabledUseCase,
  toggleBlogFeatureUseCase,
  getNewsFeatureEnabledUseCase,
  toggleNewsFeatureUseCase,
  getVideoSegmentContentTabsEnabledUseCase,
  toggleVideoSegmentContentTabsUseCase,
  getFeatureFlagEnabledUseCase,
  toggleFeatureFlagUseCase,
} from "~/use-cases/app-settings";
import { isFeatureEnabledForUser } from "~/data-access/app-settings";

// Zod enum schema for validating flag keys
const flagKeySchema = z.enum(FLAG_KEYS);

export const getAppSettingsFn = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .validator(z.void())
  .handler(async () => {
    return getAppSettingsUseCase();
  });

export const toggleEarlyAccessModeFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(z.object({ enabled: z.boolean() }))
  .handler(async ({ data }) => {
    await toggleEarlyAccessModeUseCase(data.enabled);
    return { success: true };
  });

export const getEarlyAccessModeFn = createServerFn({ method: "GET" })
  .middleware([unauthenticatedMiddleware])
  .validator(z.void())
  .handler(async () => {
    return getEarlyAccessModeUseCase();
  });

export const getAgentsFeatureEnabledFn = createServerFn({ method: "GET" })
  .middleware([unauthenticatedMiddleware])
  .validator(z.void())
  .handler(async () => {
    return getAgentsFeatureEnabledUseCase();
  });

export const toggleAgentsFeatureFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(z.object({ enabled: z.boolean() }))
  .handler(async ({ data }) => {
    await toggleAgentsFeatureUseCase(data.enabled);
    return { success: true };
  });

export const getLaunchKitsFeatureEnabledFn = createServerFn({ method: "GET" })
  .middleware([unauthenticatedMiddleware])
  .validator(z.void())
  .handler(async () => {
    return getLaunchKitsFeatureEnabledUseCase();
  });

export const toggleLaunchKitsFeatureFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(z.object({ enabled: z.boolean() }))
  .handler(async ({ data }) => {
    await toggleLaunchKitsFeatureUseCase(data.enabled);
    return { success: true };
  });

export const getAffiliatesFeatureEnabledFn = createServerFn({ method: "GET" })
  .middleware([unauthenticatedMiddleware])
  .validator(z.void())
  .handler(async () => {
    return getAffiliatesFeatureEnabledUseCase();
  });

export const toggleAffiliatesFeatureFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(z.object({ enabled: z.boolean() }))
  .handler(async ({ data }) => {
    await toggleAffiliatesFeatureUseCase(data.enabled);
    return { success: true };
  });

export const getBlogFeatureEnabledFn = createServerFn({ method: "GET" })
  .middleware([unauthenticatedMiddleware])
  .validator(z.void())
  .handler(async () => {
    return getBlogFeatureEnabledUseCase();
  });

export const getNewsFeatureEnabledFn = createServerFn({ method: "GET" })
  .middleware([unauthenticatedMiddleware])
  .validator(z.void())
  .handler(async () => {
    return getNewsFeatureEnabledUseCase();
  });

export const toggleBlogFeatureFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(z.object({ enabled: z.boolean() }))
  .handler(async ({ data }) => {
    await toggleBlogFeatureUseCase(data.enabled);
    return { success: true };
  });

export const toggleNewsFeatureFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(z.object({ enabled: z.boolean() }))
  .handler(async ({ data }) => {
    await toggleNewsFeatureUseCase(data.enabled);
    return { success: true };
  });

export const getVideoSegmentContentTabsEnabledFn = createServerFn({
  method: "GET",
})
  .middleware([unauthenticatedMiddleware])
  .validator(z.void())
  .handler(async () => {
    return getVideoSegmentContentTabsEnabledUseCase();
  });

export const toggleVideoSegmentContentTabsFn = createServerFn({
  method: "POST",
})
  .middleware([adminMiddleware])
  .validator(z.object({ enabled: z.boolean() }))
  .handler(async ({ data }) => {
    await toggleVideoSegmentContentTabsUseCase(data.enabled);
    return { success: true };
  });

export const isFeatureEnabledForUserFn = createServerFn({ method: "GET" })
  .middleware([unauthenticatedMiddleware])
  .validator(z.object({ flagKey: flagKeySchema }))
  .handler(async ({ data, context }) => {
    return isFeatureEnabledForUser(data.flagKey, context.user?.id ?? null);
  });

/**
 * Generic server function to get the enabled state of any feature flag.
 * Use this for new flags instead of creating individual server functions.
 */
export const getFeatureFlagEnabledFn = createServerFn({ method: "GET" })
  .middleware([unauthenticatedMiddleware])
  .validator(z.object({ flagKey: flagKeySchema }))
  .handler(async ({ data }) => {
    return getFeatureFlagEnabledUseCase(data.flagKey);
  });

/**
 * Generic server function to toggle any feature flag.
 * Use this for new flags instead of creating individual server functions.
 */
export const toggleFeatureFlagFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(z.object({ flagKey: flagKeySchema, enabled: z.boolean() }))
  .handler(async ({ data }) => {
    await toggleFeatureFlagUseCase(data.flagKey, data.enabled);
    return { success: true };
  });
