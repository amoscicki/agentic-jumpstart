import { useState, useEffect, useRef } from "react";
import { useDebounce } from "~/hooks/use-debounce";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "~/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "~/components/ui/select";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "~/components/ui/command";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "~/components/ui/popover";
import { Button } from "~/components/ui/button";
import { Textarea } from "~/components/ui/textarea";
import { Label } from "~/components/ui/label";
import { Badge } from "~/components/ui/badge";
import { X, Check, Loader2, Users, Crown, UserX, UserCheck, ChevronDown, ChevronUp, Info } from "lucide-react";
import { toast } from "sonner";
import { cn } from "~/lib/utils";
import { TARGET_MODES, type TargetMode, type FlagKey } from "~/config";
import {
  getFeatureFlagTargetingFn,
  updateFeatureFlagTargetingFn,
  searchUsersForFlagFn,
  getUsersByEmailsFn,
} from "~/fn/feature-flags";

interface TargetingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  flagKey: FlagKey;
  flagName: string;
}

interface SelectedUser {
  id: number;
  email: string | null;
  isPremium: boolean;
}

const TARGET_MODE_LABELS: Record<TargetMode, { label: string; icon: typeof Users }> = {
  [TARGET_MODES.ALL]: { label: "All Users", icon: Users },
  [TARGET_MODES.PREMIUM]: { label: "Premium Only", icon: Crown },
  [TARGET_MODES.NON_PREMIUM]: { label: "Non-Premium Only", icon: UserX },
  [TARGET_MODES.CUSTOM]: { label: "Custom Users", icon: UserCheck },
};

export function TargetingDialog({
  open,
  onOpenChange,
  flagKey,
  flagName,
}: TargetingDialogProps) {
  const queryClient = useQueryClient();
  const [targetMode, setTargetMode] = useState<TargetMode>(TARGET_MODES.ALL);
  const [selectedUsers, setSelectedUsers] = useState<SelectedUser[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const debouncedSearchQuery = useDebounce(searchQuery, 300);
  const [bulkInput, setBulkInput] = useState("");
  const [showBulkAdd, setShowBulkAdd] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [isProcessingBulk, setIsProcessingBulk] = useState(false);

  // Track whether user has made changes to prevent server data from overwriting
  const hasUserChangesRef = useRef(false);
  // Track whether we've done the initial sync for this dialog open
  const hasInitialSyncRef = useRef(false);

  const { data: targeting, isLoading, isError, error, refetch } = useQuery({
    queryKey: ["featureFlagTargeting", flagKey],
    queryFn: () => getFeatureFlagTargetingFn({ data: { flagKey } }),
    enabled: open,
  });

  const { data: searchResults, isFetching: isSearching } = useQuery({
    queryKey: ["searchUsers", debouncedSearchQuery],
    queryFn: () => searchUsersForFlagFn({ data: { query: debouncedSearchQuery } }),
    enabled: debouncedSearchQuery.length >= 2,
  });

  const updateMutation = useMutation({
    mutationFn: updateFeatureFlagTargetingFn,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["featureFlagTargeting", flagKey] });
      toast.success("Targeting settings updated");
      onOpenChange(false);
    },
    onError: (error) => {
      toast.error("Failed to update targeting settings");
      console.error("Failed to update targeting:", error);
    },
  });

  // Sync server data only on initial load, not on subsequent refetches if user has made changes
  useEffect(() => {
    if (targeting && !hasUserChangesRef.current && !hasInitialSyncRef.current) {
      setTargetMode(targeting.targetMode);
      setSelectedUsers(
        targeting.users.map((u) => ({
          id: u.userId,
          email: u.email,
          isPremium: u.isPremium,
        }))
      );
      hasInitialSyncRef.current = true;
    }
  }, [targeting]);

  // Reset state when dialog closes
  useEffect(() => {
    if (!open) {
      setSearchQuery("");
      setBulkInput("");
      setShowBulkAdd(false);
      setSearchOpen(false);
      // Reset tracking refs when dialog closes so next open gets fresh server data
      hasUserChangesRef.current = false;
      hasInitialSyncRef.current = false;
    }
  }, [open]);

  const handleAddUser = (user: SelectedUser) => {
    hasUserChangesRef.current = true;
    setSelectedUsers((prev) =>
      prev.find((u) => u.id === user.id) ? prev : [...prev, user]
    );
  };

  const handleRemoveUser = (userId: number) => {
    hasUserChangesRef.current = true;
    setSelectedUsers((prev) => prev.filter((u) => u.id !== userId));
  };

  const handleBulkAdd = async () => {
    const emails = bulkInput
      .split(/[\n,;]/)
      .map((e) => e.trim().toLowerCase())
      .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    if (emails.length === 0) {
      toast.error("No valid emails found");
      return;
    }

    setIsProcessingBulk(true);
    try {
      const users = await getUsersByEmailsFn({ data: { emails } });
      const existingIds = new Set(selectedUsers.map((u) => u.id));
      const newUsers = users.filter((u) => !existingIds.has(u.id));

      if (newUsers.length > 0) {
        hasUserChangesRef.current = true;
        setSelectedUsers([
          ...selectedUsers,
          ...newUsers.map((u) => ({
            id: u.id,
            email: u.email,
            isPremium: u.isPremium,
          })),
        ]);
        toast.success(`Added ${newUsers.length} user(s)`);
      }

      const notFound = emails.length - users.length;
      if (notFound > 0) {
        toast.warning(`${notFound} email(s) not found`);
      }

      setBulkInput("");
    } catch (error) {
      toast.error("Failed to look up users");
    } finally {
      setIsProcessingBulk(false);
    }
  };

  const handleSave = () => {
    updateMutation.mutate({
      data: {
        flagKey,
        targetMode,
        userIds: targetMode === TARGET_MODES.CUSTOM ? selectedUsers.map((u) => u.id) : undefined,
      },
    });
  };

  const searchResultsWithSelection = searchResults ?? [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-3xl w-full max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-xl font-semibold">
              Configure Targeting: {flagName}
            </DialogTitle>
            <DialogDescription className="text-base">
              Choose who can access this feature when enabled.
            </DialogDescription>
            <div className="flex items-center gap-2 text-xs text-muted-foreground bg-muted/50 rounded-md px-3 py-2 mt-2">
              <Info className="h-3.5 w-3.5 shrink-0" />
              <span>Admins always have access to enabled features regardless of targeting.</span>
            </div>
          </DialogHeader>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin" />
            </div>
          ) : isError ? (
            <div className="flex flex-col items-center justify-center py-8 text-destructive">
              <p className="text-sm mb-2">Failed to load targeting settings.</p>
              <Button variant="outline" size="sm" onClick={() => refetch()}>
                Retry
              </Button>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              <div className="flex items-center justify-between gap-4">
                <Label className="shrink-0">Target Mode</Label>
                <Select
                  value={targetMode}
                  onValueChange={(v) => {
                    hasUserChangesRef.current = true;
                    setTargetMode(v as TargetMode);
                  }}
                >
                  <SelectTrigger className="flex-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(TARGET_MODE_LABELS).map(([mode, { label, icon: Icon }]) => (
                      <SelectItem key={mode} value={mode}>
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {label}
                        </span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {targetMode === TARGET_MODES.CUSTOM && (
                <div className="space-y-4">
                  {/* Spotlight-style user search with badges */}
                  <div className="space-y-2">
                    <Label>Select Users</Label>
                    <Popover open={searchOpen} onOpenChange={setSearchOpen}>
                      <PopoverTrigger asChild>
                        <div
                          role="combobox"
                          tabIndex={0}
                          aria-label="Search and select users"
                          aria-expanded={searchOpen}
                          aria-haspopup="listbox"
                          className={cn(
                            "flex gap-1.5 min-h-[42px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm cursor-text focus:ring-2 focus:ring-ring focus:ring-offset-2 focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2 overflow-hidden",
                            searchOpen ? "flex-wrap items-start" : "items-center"
                          )}
                          onClick={() => setSearchOpen(true)}
                          onKeyDown={(e) => {
                            if (e.key === "Enter" || e.key === " ") {
                              e.preventDefault();
                              setSearchOpen(true);
                            }
                          }}
                        >
                          {(searchOpen ? selectedUsers : selectedUsers.slice(0, 3)).map((user) => (
                            <Badge
                              key={user.id}
                              variant="secondary"
                              className="flex items-center gap-1 pr-1 shrink-0"
                            >
                              <span className="max-w-[120px] truncate">{user.email}</span>
                              <button
                                type="button"
                                aria-label={`Remove ${user.email}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleRemoveUser(user.id);
                                }}
                                className="ml-0.5 hover:bg-destructive/20 hover:text-destructive rounded-full p-0.5 transition-colors"
                              >
                                <X className="h-3 w-3" />
                              </button>
                            </Badge>
                          ))}
                          {!searchOpen && selectedUsers.length > 3 && (
                            <Badge variant="outline" className="shrink-0">
                              +{selectedUsers.length - 3} more
                            </Badge>
                          )}
                          <span className="text-muted-foreground truncate">
                            {selectedUsers.length === 0 ? "Search users by email..." : "Add more..."}
                          </span>
                        </div>
                      </PopoverTrigger>
                      <PopoverContent
                        className="w-[var(--radix-popover-trigger-width)] p-0"
                        align="start"
                      >
                        <Command shouldFilter={false}>
                          <CommandInput
                            placeholder="Type to search..."
                            value={searchQuery}
                            onValueChange={setSearchQuery}
                          />
                          <CommandList>
                            {debouncedSearchQuery.length < 2 ? (
                              <div className="py-6 text-center text-sm text-muted-foreground">
                                Type 2+ characters to search
                              </div>
                            ) : isSearching ? (
                              <div aria-live="polite" className="py-6 text-center text-sm text-muted-foreground">
                                <Loader2 className="h-4 w-4 animate-spin inline mr-2" />
                                Searching...
                              </div>
                            ) : searchResultsWithSelection.length === 0 ? (
                              <CommandEmpty>No users found</CommandEmpty>
                            ) : (
                              <CommandGroup>
                                {searchResultsWithSelection.slice(0, 6).map((user) => {
                                  const isSelected = selectedUsers.some((u) => u.id === user.id);
                                  return (
                                    <CommandItem
                                      key={user.id}
                                      value={`user-${user.id}`}
                                      onSelect={() => {
                                        if (isSelected) {
                                          handleRemoveUser(user.id);
                                        } else {
                                          handleAddUser({
                                            id: user.id,
                                            email: user.email,
                                            isPremium: user.isPremium,
                                          });
                                        }
                                      }}
                                    >
                                      <Check
                                        className={cn(
                                          "mr-2 h-4 w-4",
                                          isSelected ? "opacity-100" : "opacity-0"
                                        )}
                                      />
                                      <span className="truncate">{user.email}</span>
                                      {user.isPremium && (
                                        <Badge variant="secondary" className="ml-auto text-xs">
                                          Premium
                                        </Badge>
                                      )}
                                    </CommandItem>
                                  );
                                })}
                                {searchResultsWithSelection.length > 6 && (
                                  <div className="py-2 px-2 text-xs text-muted-foreground text-center border-t">
                                    +{searchResultsWithSelection.length - 6} more results
                                  </div>
                                )}
                              </CommandGroup>
                            )}
                          </CommandList>
                        </Command>
                      </PopoverContent>
                    </Popover>
                    {selectedUsers.length > 0 && (
                      <p aria-live="polite" className="text-xs text-muted-foreground">
                        {selectedUsers.length} user{selectedUsers.length !== 1 ? "s" : ""} selected
                      </p>
                    )}
                  </div>

                  {/* Bulk Add - collapsible */}
                  <div className="space-y-2">
                    <button
                      type="button"
                      aria-expanded={showBulkAdd}
                      onClick={() => setShowBulkAdd(!showBulkAdd)}
                      className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showBulkAdd ? (
                        <ChevronUp className="h-4 w-4" />
                      ) : (
                        <ChevronDown className="h-4 w-4" />
                      )}
                      Bulk add from email list
                    </button>
                    {showBulkAdd && (
                      <div className="space-y-2 pl-6">
                        <Textarea
                          placeholder="Paste emails (comma, semicolon, or newline separated)"
                          value={bulkInput}
                          onChange={(e) => setBulkInput(e.target.value)}
                          rows={3}
                          className="resize-none"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleBulkAdd}
                          disabled={!bulkInput.trim() || isProcessingBulk}
                        >
                          {isProcessingBulk ? (
                            <>
                              <Loader2 className="h-4 w-4 animate-spin mr-2" />
                              Processing...
                            </>
                          ) : (
                            "Add Users"
                          )}
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={updateMutation.isPending || isLoading || isError}>
              {updateMutation.isPending ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save Changes"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
  );
}
