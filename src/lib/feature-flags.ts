import { createMiddleware } from "@tanstack/react-start";
import { redirect } from "@tanstack/react-router";
import { isFeatureEnabledForUser } from "~/data-access/app-settings";
import { type FlagKey } from "~/config";

export function createFeatureFlagMiddleware(flagKey: FlagKey) {
  return createMiddleware({ type: "function" }).server(async ({ next, context }) => {
    const userId = (context as unknown as { userId?: number })?.userId ?? null;
    const enabled = await isFeatureEnabledForUser(flagKey, userId);
    if (!enabled) {
      throw new Error(`Feature "${flagKey}" is not available`);
    }
    return next();
  });
}

export async function assertFeatureEnabled(flagKey: FlagKey) {
  const { isFeatureEnabledForUserFn } = await import("~/fn/app-settings");
  const enabled = await isFeatureEnabledForUserFn({ data: { flagKey } });
  if (!enabled) {
    throw redirect({ to: "/" });
  }
}
