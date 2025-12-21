/**
 * Shared utilities for handling public names based on user privacy settings.
 * Centralizes the logic for determining which name to display publicly.
 */

type ProfileWithNames = {
  displayName: string | null;
  realName: string | null;
  useDisplayName: boolean;
};

/**
 * Returns the name to display publicly based on useDisplayName setting.
 * - If useDisplayName is true or realName is not set, returns displayName
 * - Otherwise returns realName
 * - Falls back to "Anonymous" if no name is available
 */
export function getPublicName(profile: ProfileWithNames): string {
  if (profile.useDisplayName || !profile.realName) {
    return profile.displayName || "Anonymous";
  }
  return profile.realName;
}

/**
 * Add publicName property to a profile object based on the useDisplayName setting.
 * This is a convenience function that spreads the original object and adds publicName.
 */
export function addPublicName<T extends ProfileWithNames>(
  profile: T
): T & { publicName: string } {
  return {
    ...profile,
    publicName: getPublicName(profile),
  };
}
