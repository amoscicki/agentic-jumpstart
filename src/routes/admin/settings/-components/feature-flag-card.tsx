import type { LucideIcon } from "lucide-react";
import { Settings2 } from "lucide-react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
} from "~/components/ui/card";
import { Switch } from "~/components/ui/switch";
import { Label } from "~/components/ui/label";
import { Button } from "~/components/ui/button";
import { Badge } from "~/components/ui/badge";
import { TARGET_MODES, type TargetMode, type FlagKey } from "~/config";

const TARGET_MODE_LABELS: Record<TargetMode, string> = {
  [TARGET_MODES.ALL]: "All Users",
  [TARGET_MODES.PREMIUM]: "Premium Only",
  [TARGET_MODES.NON_PREMIUM]: "Non-Premium Only",
  [TARGET_MODES.CUSTOM]: "Custom",
};

interface FeatureFlagCardProps {
  icon: LucideIcon;
  title: string;
  description: string;
  switchId: string;
  checked: boolean | undefined;
  onCheckedChange: (checked: boolean) => void;
  isPending: boolean;
  targeting: { targetMode: TargetMode; users: unknown[] } | undefined;
  onConfigureTargeting: () => void;
  enabledText: string;
  disabledText: string;
  animationDelay: string;
  dependsOn?: FlagKey[];
  featureStates: Record<string, boolean | undefined>;
  flagConfigs: Record<string, { title: string }>;
}

export function FeatureFlagCard({
  icon: Icon,
  title,
  description,
  switchId,
  checked,
  onCheckedChange,
  isPending,
  targeting,
  onConfigureTargeting,
  enabledText,
  disabledText,
  animationDelay,
  dependsOn,
  featureStates,
  flagConfigs,
}: FeatureFlagCardProps) {
  const disabledDependencies = dependsOn?.filter(dep => !featureStates[dep]) ?? [];
  const isDisabledByDependency = disabledDependencies.length > 0;

  const getTargetingBadge = () => {
    if (!targeting) return null;

    if (targeting.targetMode === TARGET_MODES.CUSTOM) {
      const userCount = targeting.users.length;
      return (
        <div className="basis-full mt-1">
          <Badge variant="invert" className="text-xs w-full justify-center">
            {userCount} {userCount === 1 ? "user" : "users"}
          </Badge>
        </div>
      );
    }

    return (
      <div className="basis-full mt-1">
        <Badge variant="invert" className="text-xs w-full justify-center">
          {TARGET_MODE_LABELS[targeting.targetMode]}
        </Badge>
      </div>
    );
  };

  return (
    <Card
      className="flex flex-col h-full animate-in fade-in slide-in-from-bottom-2 duration-500"
      style={{ animationDelay, animationFillMode: "both" }}
    >
      <CardHeader className="flex-shrink-0">
        <CardTitle className="flex items-center gap-2 flex-wrap">
          <Icon className="h-5 w-5" />
          {title}
          {getTargetingBadge()}
        </CardTitle>
        <CardDescription className="h-20 overflow-hidden">
          {description}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex-1 flex flex-col justify-between">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <Label htmlFor={switchId} className="cursor-pointer">
              {checked ? "Enabled" : "Disabled"}
            </Label>
            <Switch
              id={switchId}
              checked={checked ?? false}
              onCheckedChange={onCheckedChange}
              disabled={isPending || isDisabledByDependency}
            />
          </div>
          {isDisabledByDependency && (
            <Badge variant="outline" className="text-xs w-full justify-center">
              Requires: {disabledDependencies.map(d => flagConfigs[d]?.title).join(", ")}
            </Badge>
          )}
          <Button
            variant="outline"
            size="sm"
            className="w-full"
            onClick={onConfigureTargeting}
          >
            <Settings2 className="h-4 w-4 mr-2" />
            Configure Targeting
          </Button>
        </div>
        <p className="mt-3 text-sm text-muted-foreground min-h-[2.5rem]">
          {checked ? enabledText : disabledText}
        </p>
      </CardContent>
    </Card>
  );
}
