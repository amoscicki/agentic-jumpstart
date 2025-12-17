/**
 * Unit tests for feature flag data access layer
 * Tests: src/data-access/feature-flags.ts
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { FLAGS, TARGET_MODES } from "~/config";

// Hoisted mocks
const { mockLimit, mockWhere, mockOnConflictDoUpdate, mockValues, mockDatabase, mockSelect, mockInsert, mockDelete, mockInnerJoin, mockTransaction } = vi.hoisted(() => {
  const mockLimit = vi.fn();
  const mockWhere = vi.fn();
  const mockOnConflictDoUpdate = vi.fn();
  const mockValues = vi.fn();
  const mockInnerJoin = vi.fn();
  const mockTransaction = vi.fn();

  const mockSelect = vi.fn(() => ({
    from: vi.fn(() => ({
      where: vi.fn(() => ({
        limit: mockLimit,
      })),
      innerJoin: mockInnerJoin.mockReturnValue({
        where: mockWhere,
      }),
    })),
  }));

  const mockInsert = vi.fn(() => ({
    values: mockValues.mockReturnValue({
      onConflictDoUpdate: mockOnConflictDoUpdate,
    }),
  }));

  const mockDelete = vi.fn(() => ({
    where: mockWhere,
  }));

  const mockDatabase = {
    select: mockSelect,
    insert: mockInsert,
    delete: mockDelete,
    transaction: mockTransaction,
  };

  return { mockLimit, mockWhere, mockOnConflictDoUpdate, mockValues, mockDatabase, mockSelect, mockInsert, mockDelete, mockInnerJoin, mockTransaction };
});

vi.mock("~/db", () => ({
  database: mockDatabase,
}));

// Import after mocking
import {
  getFeatureFlagTarget,
  setFeatureFlagTarget,
  getFeatureFlagUsers,
  getFeatureFlagUser,
  addFeatureFlagUser,
  removeFeatureFlagUser,
  bulkSetFeatureFlagUsers,
  clearFeatureFlagUsers,
  updateFeatureFlagTargeting,
} from "~/data-access/feature-flags";

describe("Feature Flags Data Access Layer", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    // Reset chainable mock returns for each test
    mockValues.mockReturnValue({
      onConflictDoUpdate: mockOnConflictDoUpdate,
    });
    mockInnerJoin.mockReturnValue({
      where: mockWhere,
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe("getFeatureFlagTarget", () => {
    it("should return the feature flag target when found", async () => {
      const mockTarget = {
        id: 1,
        flagKey: FLAGS.EARLY_ACCESS_MODE,
        targetMode: TARGET_MODES.PREMIUM,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockLimit.mockResolvedValueOnce([mockTarget]);

      const result = await getFeatureFlagTarget(FLAGS.EARLY_ACCESS_MODE);

      expect(result).toEqual(mockTarget);
      expect(mockSelect).toHaveBeenCalled();
    });

    it("should return null when feature flag target is not found", async () => {
      mockLimit.mockResolvedValueOnce([]);

      const result = await getFeatureFlagTarget(FLAGS.EARLY_ACCESS_MODE);

      expect(result).toBeNull();
    });

    it("should return null and log error on database error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockLimit.mockRejectedValueOnce(new Error("Database connection failed"));

      const result = await getFeatureFlagTarget(FLAGS.EARLY_ACCESS_MODE);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Error getting feature flag target"),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe("setFeatureFlagTarget", () => {
    it("should insert or update a feature flag target with correct values", async () => {
      mockOnConflictDoUpdate.mockResolvedValueOnce(undefined);

      await setFeatureFlagTarget(FLAGS.EARLY_ACCESS_MODE, TARGET_MODES.CUSTOM);

      expect(mockInsert).toHaveBeenCalled();
      // Verify the exact values passed to insert
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          flagKey: FLAGS.EARLY_ACCESS_MODE,
          targetMode: TARGET_MODES.CUSTOM,
          updatedAt: expect.any(Date),
        })
      );
      expect(mockOnConflictDoUpdate).toHaveBeenCalled();
    });

    it("should resolve without throwing on successful insert", async () => {
      mockOnConflictDoUpdate.mockResolvedValueOnce(undefined);

      // Function should resolve successfully (void return)
      await expect(
        setFeatureFlagTarget(FLAGS.EARLY_ACCESS_MODE, TARGET_MODES.ALL)
      ).resolves.toBeUndefined();
    });

    it("should throw and log error on database error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const dbError = new Error("Database write failed");
      mockOnConflictDoUpdate.mockRejectedValueOnce(dbError);

      await expect(
        setFeatureFlagTarget(FLAGS.EARLY_ACCESS_MODE, TARGET_MODES.ALL)
      ).rejects.toThrow(dbError);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Error setting feature flag target"),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });

    it("should use provided transaction when supplied", async () => {
      const mockTx = {
        insert: vi.fn().mockReturnValue({
          values: vi.fn().mockReturnValue({
            onConflictDoUpdate: vi.fn().mockResolvedValueOnce(undefined),
          }),
        }),
      };

      await setFeatureFlagTarget(
        FLAGS.EARLY_ACCESS_MODE,
        TARGET_MODES.PREMIUM,
        mockTx as unknown as Parameters<typeof setFeatureFlagTarget>[2]
      );

      expect(mockTx.insert).toHaveBeenCalled();
    });
  });

  describe("getFeatureFlagUsers", () => {
    it("should return users with their details for a flag", async () => {
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
          enabled: true,
          createdAt: new Date(),
          userEmail: "user2@test.com",
          userIsPremium: false,
        },
      ];

      mockWhere.mockResolvedValueOnce(mockUsers);

      const result = await getFeatureFlagUsers(FLAGS.EARLY_ACCESS_MODE);

      expect(result).toEqual(mockUsers);
      expect(mockSelect).toHaveBeenCalled();
      expect(mockInnerJoin).toHaveBeenCalled();
    });

    it("should return empty array when no users are found", async () => {
      mockWhere.mockResolvedValueOnce([]);

      const result = await getFeatureFlagUsers(FLAGS.EARLY_ACCESS_MODE);

      expect(result).toEqual([]);
    });

    it("should return empty array and log error on database error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockWhere.mockRejectedValueOnce(new Error("Database query failed"));

      const result = await getFeatureFlagUsers(FLAGS.EARLY_ACCESS_MODE);

      expect(result).toEqual([]);
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Error getting feature flag users"),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe("getFeatureFlagUser", () => {
    it("should return the feature flag user when found", async () => {
      const mockUser = {
        id: 1,
        flagKey: FLAGS.EARLY_ACCESS_MODE,
        userId: 10,
        enabled: true,
        createdAt: new Date(),
      };

      mockLimit.mockResolvedValueOnce([mockUser]);

      const result = await getFeatureFlagUser(FLAGS.EARLY_ACCESS_MODE, 10);

      expect(result).toEqual(mockUser);
      expect(mockSelect).toHaveBeenCalled();
    });

    it("should return null when user is not found", async () => {
      mockLimit.mockResolvedValueOnce([]);

      const result = await getFeatureFlagUser(FLAGS.EARLY_ACCESS_MODE, 999);

      expect(result).toBeNull();
    });

    it("should return null and log error on database error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      mockLimit.mockRejectedValueOnce(new Error("Database connection failed"));

      const result = await getFeatureFlagUser(FLAGS.EARLY_ACCESS_MODE, 10);

      expect(result).toBeNull();
      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Error getting feature flag user"),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe("addFeatureFlagUser", () => {
    it("should add a user to a feature flag with all required fields", async () => {
      mockOnConflictDoUpdate.mockResolvedValueOnce(undefined);

      await addFeatureFlagUser(FLAGS.EARLY_ACCESS_MODE, 10, true);

      expect(mockInsert).toHaveBeenCalled();
      // Verify ALL fields are passed correctly including createdAt
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          flagKey: FLAGS.EARLY_ACCESS_MODE,
          userId: 10,
          enabled: true,
          createdAt: expect.any(Date),
        })
      );
    });

    it("should use default enabled value of true when not specified", async () => {
      mockOnConflictDoUpdate.mockResolvedValueOnce(undefined);

      await addFeatureFlagUser(FLAGS.EARLY_ACCESS_MODE, 10);

      // Verify default enabled = true is applied
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          flagKey: FLAGS.EARLY_ACCESS_MODE,
          userId: 10,
          enabled: true,
        })
      );
    });

    it("should pass enabled=false when explicitly set", async () => {
      mockOnConflictDoUpdate.mockResolvedValueOnce(undefined);

      await addFeatureFlagUser(FLAGS.EARLY_ACCESS_MODE, 10, false);

      // Verify enabled=false is passed through correctly
      expect(mockValues).toHaveBeenCalledWith(
        expect.objectContaining({
          enabled: false,
        })
      );
      expect(mockOnConflictDoUpdate).toHaveBeenCalled();
    });

    it("should resolve without throwing on successful insert", async () => {
      mockOnConflictDoUpdate.mockResolvedValueOnce(undefined);

      await expect(
        addFeatureFlagUser(FLAGS.EARLY_ACCESS_MODE, 10)
      ).resolves.toBeUndefined();
    });

    it("should throw and log error on database error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const dbError = new Error("Database write failed");
      mockOnConflictDoUpdate.mockRejectedValueOnce(dbError);

      await expect(
        addFeatureFlagUser(FLAGS.EARLY_ACCESS_MODE, 10)
      ).rejects.toThrow(dbError);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Error adding feature flag user"),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe("removeFeatureFlagUser", () => {
    it("should remove a user from a feature flag", async () => {
      mockWhere.mockResolvedValueOnce(undefined);

      await removeFeatureFlagUser(FLAGS.EARLY_ACCESS_MODE, 10);

      expect(mockDelete).toHaveBeenCalled();
      expect(mockWhere).toHaveBeenCalled();
    });

    it("should resolve without throwing on successful delete", async () => {
      mockWhere.mockResolvedValueOnce(undefined);

      await expect(
        removeFeatureFlagUser(FLAGS.EARLY_ACCESS_MODE, 10)
      ).resolves.toBeUndefined();
    });

    it("should throw and log error on database error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const dbError = new Error("Database delete failed");
      mockWhere.mockRejectedValueOnce(dbError);

      await expect(
        removeFeatureFlagUser(FLAGS.EARLY_ACCESS_MODE, 10)
      ).rejects.toThrow(dbError);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Error removing feature flag user"),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe("bulkSetFeatureFlagUsers", () => {
    it("should clear existing users and add new ones with correct data", async () => {
      const mockInsertValues = vi.fn().mockResolvedValueOnce(undefined);
      const mockDb = {
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce(undefined),
        }),
        insert: vi.fn().mockReturnValue({
          values: mockInsertValues,
        }),
      };

      await bulkSetFeatureFlagUsers(
        FLAGS.EARLY_ACCESS_MODE,
        [10, 20, 30],
        true,
        mockDb as unknown as Parameters<typeof bulkSetFeatureFlagUsers>[3]
      );

      expect(mockDb.delete).toHaveBeenCalled();
      expect(mockDb.insert).toHaveBeenCalled();
      // Verify all user records are created with correct structure
      expect(mockInsertValues).toHaveBeenCalledWith([
        expect.objectContaining({ flagKey: FLAGS.EARLY_ACCESS_MODE, userId: 10, enabled: true, createdAt: expect.any(Date) }),
        expect.objectContaining({ flagKey: FLAGS.EARLY_ACCESS_MODE, userId: 20, enabled: true, createdAt: expect.any(Date) }),
        expect.objectContaining({ flagKey: FLAGS.EARLY_ACCESS_MODE, userId: 30, enabled: true, createdAt: expect.any(Date) }),
      ]);
    });

    it("should only delete when userIds array is empty (no insert)", async () => {
      const mockDb = {
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce(undefined),
        }),
        insert: vi.fn(),
      };

      await bulkSetFeatureFlagUsers(
        FLAGS.EARLY_ACCESS_MODE,
        [],
        true,
        mockDb as unknown as Parameters<typeof bulkSetFeatureFlagUsers>[3]
      );

      expect(mockDb.delete).toHaveBeenCalled();
      // Insert should NOT be called when userIds is empty
      expect(mockDb.insert).not.toHaveBeenCalled();
    });

    it("should use default enabled value of true when not specified", async () => {
      const mockInsertValues = vi.fn().mockResolvedValueOnce(undefined);
      const mockDb = {
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce(undefined),
        }),
        insert: vi.fn().mockReturnValue({
          values: mockInsertValues,
        }),
      };

      await bulkSetFeatureFlagUsers(
        FLAGS.EARLY_ACCESS_MODE,
        [10],
        undefined,
        mockDb as unknown as Parameters<typeof bulkSetFeatureFlagUsers>[3]
      );

      // Default enabled = true should be applied
      expect(mockInsertValues).toHaveBeenCalledWith([
        expect.objectContaining({
          flagKey: FLAGS.EARLY_ACCESS_MODE,
          userId: 10,
          enabled: true,
        }),
      ]);
    });

    it("should pass enabled=false to all users when specified", async () => {
      const mockInsertValues = vi.fn().mockResolvedValueOnce(undefined);
      const mockDb = {
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce(undefined),
        }),
        insert: vi.fn().mockReturnValue({
          values: mockInsertValues,
        }),
      };

      await bulkSetFeatureFlagUsers(
        FLAGS.EARLY_ACCESS_MODE,
        [10, 20],
        false,
        mockDb as unknown as Parameters<typeof bulkSetFeatureFlagUsers>[3]
      );

      // All users should have enabled=false
      expect(mockInsertValues).toHaveBeenCalledWith([
        expect.objectContaining({ userId: 10, enabled: false }),
        expect.objectContaining({ userId: 20, enabled: false }),
      ]);
    });

    it("should throw and log error on database error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const dbError = new Error("Database transaction failed");

      const mockDb = {
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValueOnce(dbError),
        }),
      };

      await expect(
        bulkSetFeatureFlagUsers(
          FLAGS.EARLY_ACCESS_MODE,
          [10],
          true,
          mockDb as unknown as Parameters<typeof bulkSetFeatureFlagUsers>[3]
        )
      ).rejects.toThrow(dbError);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Error bulk setting feature flag users"),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe("clearFeatureFlagUsers", () => {
    it("should delete all users for a feature flag", async () => {
      const mockDb = {
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce(undefined),
        }),
      };

      await clearFeatureFlagUsers(
        FLAGS.EARLY_ACCESS_MODE,
        mockDb as unknown as Parameters<typeof clearFeatureFlagUsers>[1]
      );

      expect(mockDb.delete).toHaveBeenCalled();
    });

    it("should resolve without throwing on successful delete", async () => {
      const mockDb = {
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValueOnce(undefined),
        }),
      };

      await expect(
        clearFeatureFlagUsers(
          FLAGS.EARLY_ACCESS_MODE,
          mockDb as unknown as Parameters<typeof clearFeatureFlagUsers>[1]
        )
      ).resolves.toBeUndefined();
    });

    it("should throw and log error on database error", async () => {
      const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
      const dbError = new Error("Database delete failed");

      const mockDb = {
        delete: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValueOnce(dbError),
        }),
      };

      await expect(
        clearFeatureFlagUsers(
          FLAGS.EARLY_ACCESS_MODE,
          mockDb as unknown as Parameters<typeof clearFeatureFlagUsers>[1]
        )
      ).rejects.toThrow(dbError);

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining("Error clearing feature flag users"),
        expect.any(Error)
      );
      consoleSpy.mockRestore();
    });
  });

  describe("updateFeatureFlagTargeting", () => {
    it("should run operations within a transaction", async () => {
      let transactionExecuted = false;
      mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<void>) => {
        transactionExecuted = true;
        const mockTx = {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
            }),
          }),
          delete: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue(undefined),
          }),
        };
        await callback(mockTx);
      });

      await updateFeatureFlagTargeting(FLAGS.EARLY_ACCESS_MODE, TARGET_MODES.ALL);

      expect(transactionExecuted).toBe(true);
      expect(mockTransaction).toHaveBeenCalled();
    });

    it("should set target and clear users for non-CUSTOM modes", async () => {
      const mockTxInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
        }),
      });
      const mockTxDelete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<void>) => {
        const mockTx = {
          insert: mockTxInsert,
          delete: mockTxDelete,
        };
        await callback(mockTx);
      });

      await updateFeatureFlagTargeting(FLAGS.EARLY_ACCESS_MODE, TARGET_MODES.PREMIUM);

      // Should call insert for target and delete for users
      expect(mockTxInsert).toHaveBeenCalled();
      expect(mockTxDelete).toHaveBeenCalled();
    });

    it("should set target and bulk set users for CUSTOM mode with userIds", async () => {
      const mockTxInsertValues = vi.fn();
      const mockTxInsert = vi.fn().mockReturnValue({
        values: mockTxInsertValues.mockReturnValue({
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
        }),
      });
      const mockTxDeleteWhere = vi.fn().mockResolvedValue(undefined);
      const mockTxDelete = vi.fn().mockReturnValue({
        where: mockTxDeleteWhere,
      });

      mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<void>) => {
        const mockTx = {
          insert: mockTxInsert,
          delete: mockTxDelete,
        };
        await callback(mockTx);
      });

      await updateFeatureFlagTargeting(FLAGS.EARLY_ACCESS_MODE, TARGET_MODES.CUSTOM, [10, 20]);

      // Should call insert twice: once for target, once for users
      expect(mockTxInsert).toHaveBeenCalledTimes(2);
      // Should call delete once for clearing existing users before bulk insert
      expect(mockTxDelete).toHaveBeenCalled();
    });

    it("should only set target for CUSTOM mode without userIds", async () => {
      const mockTxInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockResolvedValue(undefined),
        }),
      });
      const mockTxDelete = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<void>) => {
        const mockTx = {
          insert: mockTxInsert,
          delete: mockTxDelete,
        };
        await callback(mockTx);
      });

      await updateFeatureFlagTargeting(FLAGS.EARLY_ACCESS_MODE, TARGET_MODES.CUSTOM);

      // Should only call insert once (for target), no delete or bulk insert
      expect(mockTxInsert).toHaveBeenCalledTimes(1);
      expect(mockTxDelete).not.toHaveBeenCalled();
    });

    it("should propagate transaction errors", async () => {
      const dbError = new Error("Transaction failed");
      mockTransaction.mockRejectedValueOnce(dbError);

      await expect(
        updateFeatureFlagTargeting(FLAGS.EARLY_ACCESS_MODE, TARGET_MODES.ALL)
      ).rejects.toThrow(dbError);
    });

    it("should rollback transaction if setFeatureFlagTarget fails", async () => {
      mockTransaction.mockImplementation(async (callback: (tx: unknown) => Promise<void>) => {
        const mockTx = {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              onConflictDoUpdate: vi.fn().mockRejectedValue(new Error("Insert failed")),
            }),
          }),
        };
        await callback(mockTx);
      });

      await expect(
        updateFeatureFlagTargeting(FLAGS.EARLY_ACCESS_MODE, TARGET_MODES.ALL)
      ).rejects.toThrow("Insert failed");
    });
  });
});
