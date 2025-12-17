import {createServerFn} from "@tanstack/react-start";
import {adminMiddleware} from "~/lib/auth";
import {z} from "zod";
import {getFeatureFlagTargetingUseCase, updateFeatureFlagTargetingUseCase,} from "~/use-cases/feature-flags";
import {FLAG_KEYS, TARGET_MODES} from "~/config";
import {database} from "~/db";
import {users} from "~/db/schema";
import {ilike} from "drizzle-orm";

const flagKeySchema = z.enum(FLAG_KEYS);

const targetModeSchema = z.enum([
  TARGET_MODES.ALL,
  TARGET_MODES.PREMIUM,
  TARGET_MODES.NON_PREMIUM,
  TARGET_MODES.CUSTOM,
]);

export const getFeatureFlagTargetingFn = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .validator(z.object({ flagKey: flagKeySchema }))
  .handler(async ({ data }) => {
    return getFeatureFlagTargetingUseCase(data.flagKey);
  });

export const updateFeatureFlagTargetingFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(
    z.object({
      flagKey: flagKeySchema,
      targetMode: targetModeSchema,
      userIds: z.array(z.number()).max(1000).optional(),
    })
  )
  .handler(async ({ data }) => {
    await updateFeatureFlagTargetingUseCase(
      data.flagKey,
      data.targetMode,
      data.userIds
    );
    return { success: true };
  });

export const searchUsersForFlagFn = createServerFn({ method: "GET" })
  .middleware([adminMiddleware])
  .validator(z.object({ query: z.string().min(1) }))
  .handler(async ({ data }) => {
    // Escape LIKE pattern special characters to prevent pattern injection
    const sanitizedQuery = data.query.replace(/[%_\\]/g, "\\$&");

    const results = await database
      .select({
        id: users.id,
        email: users.email,
        isPremium: users.isPremium,
      })
      .from(users)
      .where(ilike(users.email, `%${sanitizedQuery}%`))
      .limit(20);

    return results.filter((u) => u.email !== null);
  });

export const getUsersByIdsFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(z.object({ userIds: z.array(z.number()).max(1000) }))
  .handler(async ({ data }) => {
    if (data.userIds.length === 0) return [];

    return await database.query.users.findMany({
        where: (users, {inArray}) => inArray(users.id, data.userIds),
        columns: {
            id: true,
            email: true,
            isPremium: true,
        },
    });
  });

export const getUsersByEmailsFn = createServerFn({ method: "POST" })
  .middleware([adminMiddleware])
  .validator(z.object({ emails: z.array(z.email()).max(1000) }))
  .handler(async ({ data }) => {
    if (data.emails.length === 0) return [];

    const results = await database.query.users.findMany({
      where: (users, { inArray }) => inArray(users.email, data.emails),
      columns: {
        id: true,
        email: true,
        isPremium: true,
      },
    });

    return results;
  });
