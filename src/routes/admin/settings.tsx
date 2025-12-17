import { useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { PageHeader } from "~/routes/admin/-components/page-header";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  toggleEarlyAccessModeFn,
  getEarlyAccessModeFn,
  toggleAgentsFeatureFn,
  getAgentsFeatureEnabledFn,
  toggleLaunchKitsFeatureFn,
  getLaunchKitsFeatureEnabledFn,
  toggleAffiliatesFeatureFn,
  getAffiliatesFeatureEnabledFn,
  toggleBlogFeatureFn,
  getBlogFeatureEnabledFn,
  getNewsFeatureEnabledFn,
  toggleNewsFeatureFn,
  getFeatureFlagEnabledFn,
  toggleFeatureFlagFn,
} from "~/fn/app-settings";
import { getFeatureFlagTargetingFn } from "~/fn/feature-flags";
import { assertIsAdminFn } from "~/fn/auth";
import { toast } from "sonner";
import { Page } from "./-components/page";
import { TargetingDialog } from "./settings/-components/targeting-dialog";
import { FeatureFlagCard } from "./settings/-components/feature-flag-card";
import { FEATURE_FLAGS_CONFIG } from "./settings/-components/feature-flags-config";
import { FLAGS, type FlagKey } from "~/config";

interface FlagHookConfig {
  queryKey: string;
  getFn: () => Promise<boolean>;
  toggleFn: (params: { data: { enabled: boolean } }) => Promise<unknown>;
  successMessage: string;
  errorMessage: string;
}

const FLAG_HOOKS: Record<FlagKey, FlagHookConfig> = {
  [FLAGS.EARLY_ACCESS_MODE]: {
    queryKey: "earlyAccessMode",
    getFn: getEarlyAccessModeFn,
    toggleFn: toggleEarlyAccessModeFn,
    successMessage: "Early access mode updated successfully",
    errorMessage: "Failed to update early access mode",
  },
  [FLAGS.AGENTS_FEATURE]: {
    queryKey: "agentsFeature",
    getFn: getAgentsFeatureEnabledFn,
    toggleFn: toggleAgentsFeatureFn,
    successMessage: "Agents feature updated successfully",
    errorMessage: "Failed to update agents feature",
  },
  [FLAGS.ADVANCED_AGENTS_FEATURE]: {
    queryKey: "advancedAgentsFeature",
    getFn: () => getFeatureFlagEnabledFn({ data: { flagKey: FLAGS.ADVANCED_AGENTS_FEATURE } }),
    toggleFn: (params: { data: { enabled: boolean } }) =>
      toggleFeatureFlagFn({ data: { flagKey: FLAGS.ADVANCED_AGENTS_FEATURE, enabled: params.data.enabled } }),
    successMessage: "Advanced agents feature updated successfully",
    errorMessage: "Failed to update advanced agents feature",
  },
  [FLAGS.LAUNCH_KITS_FEATURE]: {
    queryKey: "launchKitsFeature",
    getFn: getLaunchKitsFeatureEnabledFn,
    toggleFn: toggleLaunchKitsFeatureFn,
    successMessage: "Launch kits feature updated successfully",
    errorMessage: "Failed to update launch kits feature",
  },
  [FLAGS.AFFILIATES_FEATURE]: {
    queryKey: "affiliatesFeature",
    getFn: getAffiliatesFeatureEnabledFn,
    toggleFn: toggleAffiliatesFeatureFn,
    successMessage: "Affiliates feature updated successfully",
    errorMessage: "Failed to update affiliates feature",
  },
  [FLAGS.BLOG_FEATURE]: {
    queryKey: "blogFeature",
    getFn: getBlogFeatureEnabledFn,
    toggleFn: toggleBlogFeatureFn,
    successMessage: "Blog feature updated successfully",
    errorMessage: "Failed to update blog feature",
  },
  [FLAGS.NEWS_FEATURE]: {
    queryKey: "newsFeature",
    getFn: getNewsFeatureEnabledFn,
    toggleFn: toggleNewsFeatureFn,
    successMessage: "News feature updated successfully",
    errorMessage: "Failed to update news feature",
  },
  [FLAGS.VIDEO_SEGMENT_CONTENT_TABS]: {
    queryKey: "videoSegmentContentTabs",
    getFn: () => Promise.resolve(false),
    toggleFn: () => Promise.resolve(undefined),
    successMessage: "",
    errorMessage: "",
  },
};

// Filter out VIDEO_SEGMENT_CONTENT_TABS from the displayed flags
const DISPLAYED_FLAGS = FEATURE_FLAGS_CONFIG.filter(
  (f) => f.key !== FLAGS.VIDEO_SEGMENT_CONTENT_TABS
);

export const Route = createFileRoute("/admin/settings")({
  beforeLoad: () => assertIsAdminFn(),
  component: SettingsPage,
  loader: ({ context }) => {
    DISPLAYED_FLAGS.forEach((flag) => {
      const hookConfig = FLAG_HOOKS[flag.key];
      context.queryClient.ensureQueryData({
        queryKey: [hookConfig.queryKey],
        queryFn: () => hookConfig.getFn(),
      });
    });
  },
});

function useFeatureFlagState(flagKey: FlagKey) {
  const queryClient = useQueryClient();
  const hookConfig = FLAG_HOOKS[flagKey];

  const { data: enabled } = useQuery({
    queryKey: [hookConfig.queryKey],
    queryFn: () => hookConfig.getFn(),
  });

  const { data: targeting } = useQuery({
    queryKey: ["featureFlagTargeting", flagKey],
    queryFn: () => getFeatureFlagTargetingFn({ data: { flagKey } }),
  });

  const toggleMutation = useMutation({
    mutationFn: hookConfig.toggleFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [hookConfig.queryKey] });
      toast.success(hookConfig.successMessage);
    },
    onError: (error) => {
      toast.error(hookConfig.errorMessage);
      console.error(`${hookConfig.errorMessage}:`, error);
    },
  });

  const handleToggle = (checked: boolean) => {
    toggleMutation.mutate({ data: { enabled: checked } });
  };

  return {
    enabled,
    targeting,
    isPending: toggleMutation.isPending,
    handleToggle,
  };
}

function SettingsPage() {
  const [targetingDialog, setTargetingDialog] = useState<{
    open: boolean;
    flagKey: FlagKey | null;
    flagName: string;
  }>({ open: false, flagKey: null, flagName: "" });

  // Create state for all displayed flags
  const flagStates = Object.fromEntries(
    DISPLAYED_FLAGS.map((flag) => [flag.key, useFeatureFlagState(flag.key)])
  );

  // Create featureStates record for dependency checking
  const featureStatesRecord: Record<string, boolean | undefined> = Object.fromEntries(
    DISPLAYED_FLAGS.map((flag) => [flag.key, flagStates[flag.key]?.enabled])
  );

  // Create flagConfigs record for dependency titles
  const flagConfigsRecord: Record<string, { title: string }> = Object.fromEntries(
    DISPLAYED_FLAGS.map((flag) => [flag.key, { title: flag.title }])
  );

  const openTargetingDialog = (flagKey: FlagKey, flagName: string) => {
    setTargetingDialog({ open: true, flagKey, flagName });
  };

  return (
    <Page>
      <PageHeader
        title="App Settings"
        description="Manage application settings and feature flags"
        highlightedWord="Settings"
      />
      <div
        className="mt-8 grid gap-6 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-4 animate-in fade-in slide-in-from-bottom-2 duration-500"
        style={{ animationDelay: "0.1s", animationFillMode: "both" }}
      >
        {DISPLAYED_FLAGS.map((flag, index) => {
          const state = flagStates[flag.key];
          const animationDelay = `${0.2 + index * 0.1}s`;

          return (
            <FeatureFlagCard
              key={flag.key}
              icon={flag.icon}
              title={flag.title}
              description={flag.description}
              switchId={flag.key.toLowerCase().replace(/_/g, "-")}
              checked={state.enabled}
              onCheckedChange={state.handleToggle}
              isPending={state.isPending}
              targeting={state.targeting}
              onConfigureTargeting={() => openTargetingDialog(flag.key, flag.title)}
              enabledText={flag.enabledText}
              disabledText={flag.disabledText}
              animationDelay={animationDelay}
              dependsOn={flag.dependsOn}
              featureStates={featureStatesRecord}
              flagConfigs={flagConfigsRecord}
            />
          );
        })}
      </div>

      {targetingDialog.flagKey && (
        <TargetingDialog
          open={targetingDialog.open}
          onOpenChange={(open) => setTargetingDialog((prev) => ({ ...prev, open }))}
          flagKey={targetingDialog.flagKey}
          flagName={targetingDialog.flagName}
        />
      )}
    </Page>
  );
}
