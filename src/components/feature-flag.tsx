import { useQuery } from "@tanstack/react-query";
import { isFeatureEnabledForUserFn } from "~/fn/app-settings";
import { type FlagKey } from "~/config";

interface FeatureFlagProps {
  flag: FlagKey;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export function FeatureFlag({ flag, children, fallback }: FeatureFlagProps) {
  const { isEnabled, isLoading, isError } = useFeatureFlag(flag);

  if (isError) {
    console.error("Feature flag check failed for:", flag);
    return fallback ?? null;
  }

  if (isLoading) return fallback ?? null;

  if (!isEnabled) return fallback ?? null;

  return children;
}

export function useFeatureFlag(flag: FlagKey) {
  const { data: isEnabled, isLoading, isError } = useQuery({
    queryKey: ["featureFlag", flag],
    queryFn: () => isFeatureEnabledForUserFn({ data: { flagKey: flag } }),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  return { isEnabled: isEnabled ?? false, isLoading, isError };
}
