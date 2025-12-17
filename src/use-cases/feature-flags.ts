import {
  getFeatureFlagTarget,
  getFeatureFlagUsers,
  updateFeatureFlagTargeting,
} from "~/data-access/feature-flags";
import { type TargetMode, TARGET_MODES, type FlagKey } from "~/config";

export async function getFeatureFlagTargetingUseCase(flagKey: FlagKey) {
  const [target, users] = await Promise.all([
    getFeatureFlagTarget(flagKey),
    getFeatureFlagUsers(flagKey),
  ]);

  return {
    targetMode: (target?.targetMode ?? TARGET_MODES.ALL) as TargetMode,
    users: users.map((u) => ({
      userId: u.userId,
      email: u.userEmail,
      enabled: u.enabled,
      isPremium: u.userIsPremium,
    })),
  };
}

export async function updateFeatureFlagTargetingUseCase(
  flagKey: FlagKey,
  targetMode: TargetMode,
  userIds?: number[]
) {
  await updateFeatureFlagTargeting(flagKey, targetMode, userIds);
}
