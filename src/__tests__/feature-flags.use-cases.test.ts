/**
 * Unit tests for feature flag use-cases layer
 * Tests: src/use-cases/feature-flags.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FLAGS, TARGET_MODES } from "~/config";

// Mock the data access layer
vi.mock("~/data-access/feature-flags", () => ({
  getFeatureFlagTarget: vi.fn(),
  getFeatureFlagUsers: vi.fn(),
  updateFeatureFlagTargeting: vi.fn(),
}));

// Import after mocking
import {
  getFeatureFlagTargetingUseCase,
  updateFeatureFlagTargetingUseCase,
} from "~/use-cases/feature-flags";
import {
  getFeatureFlagTarget,
  getFeatureFlagUsers,
  updateFeatureFlagTargeting,
} from "~/data-access/feature-flags";

describe("Feature Flags Use Cases Layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getFeatureFlagTargetingUseCase", () => {
    it("should return target mode and users for a flag", async () => {
      const mockTarget = {
        id: 1,
        flagKey: FLAGS.EARLY_ACCESS_MODE,
        targetMode: TARGET_MODES.PREMIUM,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      const mockUsers = [
        {
          id: 1,
          flagKey: FLAGS.EARLY_ACCESS_MODE,
          userId: 10,
          enabled: true,
          createdAt: new Date(),
          userEmail: "user1@test.com",
          userIsPremium: true,
        },
        {
          id: 2,
          flagKey: FLAGS.EARLY_ACCESS_MODE,
          userId: 20,
          enabled: false,
          createdAt: new Date(),
          userEmail: "user2@test.com",
          userIsPremium: false,
        },
      ];

      vi.mocked(getFeatureFlagTarget).mockResolvedValueOnce(mockTarget);
      vi.mocked(getFeatureFlagUsers).mockResolvedValueOnce(mockUsers);

      const result = await getFeatureFlagTargetingUseCase(FLAGS.EARLY_ACCESS_MODE);

      expect(result).toEqual({
        targetMode: TARGET_MODES.PREMIUM,
        users: [
          {
            userId: 10,
            email: "user1@test.com",
            enabled: true,
            isPremium: true,
          },
          {
            userId: 20,
            email: "user2@test.com",
            enabled: false,
            isPremium: false,
          },
        ],
      });
      expect(getFeatureFlagTarget).toHaveBeenCalledWith(FLAGS.EARLY_ACCESS_MODE);
      expect(getFeatureFlagUsers).toHaveBeenCalledWith(FLAGS.EARLY_ACCESS_MODE);
    });

    it("should return default target mode (ALL) when target is not found", async () => {
      vi.mocked(getFeatureFlagTarget).mockResolvedValueOnce(null);
      vi.mocked(getFeatureFlagUsers).mockResolvedValueOnce([]);

      const result = await getFeatureFlagTargetingUseCase(FLAGS.EARLY_ACCESS_MODE);

      expect(result).toEqual({
        targetMode: TARGET_MODES.ALL,
        users: [],
      });
    });

    it("should return empty users array when no users are found", async () => {
      const mockTarget = {
        id: 1,
        flagKey: FLAGS.EARLY_ACCESS_MODE,
        targetMode: TARGET_MODES.CUSTOM,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      vi.mocked(getFeatureFlagTarget).mockResolvedValueOnce(mockTarget);
      vi.mocked(getFeatureFlagUsers).mockResolvedValueOnce([]);

      const result = await getFeatureFlagTargetingUseCase(FLAGS.EARLY_ACCESS_MODE);

      expect(result).toEqual({
        targetMode: TARGET_MODES.CUSTOM,
        users: [],
      });
    });

    it("should fetch target and users in parallel", async () => {
      vi.mocked(getFeatureFlagTarget).mockResolvedValueOnce(null);
      vi.mocked(getFeatureFlagUsers).mockResolvedValueOnce([]);

      await getFeatureFlagTargetingUseCase(FLAGS.EARLY_ACCESS_MODE);

      // Both functions should be called
      expect(getFeatureFlagTarget).toHaveBeenCalledTimes(1);
      expect(getFeatureFlagUsers).toHaveBeenCalledTimes(1);
    });
  });

  describe("updateFeatureFlagTargetingUseCase", () => {
    it("should call updateFeatureFlagTargeting with correct parameters for CUSTOM mode", async () => {
      vi.mocked(updateFeatureFlagTargeting).mockResolvedValueOnce(undefined);

      await updateFeatureFlagTargetingUseCase(
        FLAGS.EARLY_ACCESS_MODE,
        TARGET_MODES.CUSTOM,
        [10, 20, 30]
      );

      expect(updateFeatureFlagTargeting).toHaveBeenCalledWith(
        FLAGS.EARLY_ACCESS_MODE,
        TARGET_MODES.CUSTOM,
        [10, 20, 30]
      );
    });

    it("should call updateFeatureFlagTargeting for ALL mode without userIds", async () => {
      vi.mocked(updateFeatureFlagTargeting).mockResolvedValueOnce(undefined);

      await updateFeatureFlagTargetingUseCase(
        FLAGS.EARLY_ACCESS_MODE,
        TARGET_MODES.ALL
      );

      expect(updateFeatureFlagTargeting).toHaveBeenCalledWith(
        FLAGS.EARLY_ACCESS_MODE,
        TARGET_MODES.ALL,
        undefined
      );
    });

    it("should call updateFeatureFlagTargeting for PREMIUM mode", async () => {
      vi.mocked(updateFeatureFlagTargeting).mockResolvedValueOnce(undefined);

      await updateFeatureFlagTargetingUseCase(
        FLAGS.EARLY_ACCESS_MODE,
        TARGET_MODES.PREMIUM
      );

      expect(updateFeatureFlagTargeting).toHaveBeenCalledWith(
        FLAGS.EARLY_ACCESS_MODE,
        TARGET_MODES.PREMIUM,
        undefined
      );
    });

    it("should call updateFeatureFlagTargeting for NON_PREMIUM mode", async () => {
      vi.mocked(updateFeatureFlagTargeting).mockResolvedValueOnce(undefined);

      await updateFeatureFlagTargetingUseCase(
        FLAGS.EARLY_ACCESS_MODE,
        TARGET_MODES.NON_PREMIUM
      );

      expect(updateFeatureFlagTargeting).toHaveBeenCalledWith(
        FLAGS.EARLY_ACCESS_MODE,
        TARGET_MODES.NON_PREMIUM,
        undefined
      );
    });

    it("should propagate errors from data access layer", async () => {
      const dbError = new Error("Database error");
      vi.mocked(updateFeatureFlagTargeting).mockRejectedValueOnce(dbError);

      await expect(
        updateFeatureFlagTargetingUseCase(
          FLAGS.EARLY_ACCESS_MODE,
          TARGET_MODES.ALL
        )
      ).rejects.toThrow(dbError);
    });

    it("should pass empty userIds array for CUSTOM mode", async () => {
      vi.mocked(updateFeatureFlagTargeting).mockResolvedValueOnce(undefined);

      await updateFeatureFlagTargetingUseCase(
        FLAGS.EARLY_ACCESS_MODE,
        TARGET_MODES.CUSTOM,
        []
      );

      expect(updateFeatureFlagTargeting).toHaveBeenCalledWith(
        FLAGS.EARLY_ACCESS_MODE,
        TARGET_MODES.CUSTOM,
        []
      );
    });

    it("should work with different flag keys", async () => {
      vi.mocked(updateFeatureFlagTargeting).mockResolvedValueOnce(undefined);

      await updateFeatureFlagTargetingUseCase(
        FLAGS.AGENTS_FEATURE,
        TARGET_MODES.PREMIUM
      );

      expect(updateFeatureFlagTargeting).toHaveBeenCalledWith(
        FLAGS.AGENTS_FEATURE,
        TARGET_MODES.PREMIUM,
        undefined
      );
    });
  });
});
