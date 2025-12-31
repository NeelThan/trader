import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePositionSizingAPI } from './use-position-sizing-api';

// Mock the API module
vi.mock('@/lib/api', () => ({
  calculatePositionSize: vi.fn(),
  calculateRiskReward: vi.fn(),
}));

import { calculatePositionSize, calculateRiskReward } from '@/lib/api';

const mockCalculatePositionSize = vi.mocked(calculatePositionSize);
const mockCalculateRiskReward = vi.mocked(calculateRiskReward);

describe('usePositionSizingAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return initial state', () => {
      const { result } = renderHook(() => usePositionSizingAPI());

      expect(result.current.result).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isBackendAvailable).toBe(true);
    });
  });

  describe('calculate', () => {
    it('should calculate position sizing with valid inputs', async () => {
      mockCalculatePositionSize.mockResolvedValue({
        result: {
          position_size: 100,
          distance_to_stop: 5,
          risk_amount: 500,
          account_risk_percentage: 5,
          is_valid: true,
        },
      });

      mockCalculateRiskReward.mockResolvedValue({
        result: {
          risk_reward_ratio: 2,
          target_ratios: [2],
          potential_profit: 1000,
          potential_loss: 500,
          recommendation: 'good',
          is_valid: true,
        },
      });

      const { result } = renderHook(() => usePositionSizingAPI());

      await act(async () => {
        await result.current.calculate({
          entryPrice: 100,
          stopLoss: 95,
          targets: [110],
          riskCapital: 500,
          accountBalance: 10000,
        });
      });

      await waitFor(() => {
        expect(result.current.result).not.toBeNull();
      });

      expect(result.current.result?.positionSize).toBe(100);
      expect(result.current.result?.riskRewardRatio).toBe(2);
      expect(result.current.result?.recommendation).toBe('good');
      expect(result.current.result?.isValid).toBe(true);
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
    });

    it('should return error for invalid entry price', async () => {
      const { result } = renderHook(() => usePositionSizingAPI());

      await act(async () => {
        await result.current.calculate({
          entryPrice: 0,
          stopLoss: 95,
          targets: [110],
          riskCapital: 500,
        });
      });

      expect(result.current.result).toBeNull();
      expect(result.current.error).toBe('Invalid entry or stop loss price');
    });

    it('should return error when stop equals entry', async () => {
      const { result } = renderHook(() => usePositionSizingAPI());

      await act(async () => {
        await result.current.calculate({
          entryPrice: 100,
          stopLoss: 100,
          targets: [110],
          riskCapital: 500,
        });
      });

      expect(result.current.result).toBeNull();
      expect(result.current.error).toBe('Invalid entry or stop loss price');
    });

    it('should handle empty targets', async () => {
      mockCalculatePositionSize.mockResolvedValue({
        result: {
          position_size: 100,
          distance_to_stop: 5,
          risk_amount: 500,
          account_risk_percentage: 5,
          is_valid: true,
        },
      });

      const { result } = renderHook(() => usePositionSizingAPI());

      await act(async () => {
        await result.current.calculate({
          entryPrice: 100,
          stopLoss: 95,
          targets: [],
          riskCapital: 500,
        });
      });

      await waitFor(() => {
        expect(result.current.result).not.toBeNull();
      });

      expect(result.current.result?.positionSize).toBe(100);
      expect(result.current.result?.riskRewardRatio).toBe(0);
      expect(mockCalculateRiskReward).not.toHaveBeenCalled();
    });

    it('should set isBackendAvailable to false on connection error', async () => {
      mockCalculatePositionSize.mockRejectedValue(
        new Error('Backend unavailable')
      );

      const { result } = renderHook(() => usePositionSizingAPI());

      await act(async () => {
        await result.current.calculate({
          entryPrice: 100,
          stopLoss: 95,
          targets: [110],
          riskCapital: 500,
        });
      });

      expect(result.current.result).toBeNull();
      expect(result.current.isBackendAvailable).toBe(false);
      expect(result.current.error).toBe(
        'Backend unavailable - calculation not possible'
      );
    });

    it('should handle API errors gracefully', async () => {
      mockCalculatePositionSize.mockRejectedValue(new Error('API Error'));

      const { result } = renderHook(() => usePositionSizingAPI());

      await act(async () => {
        await result.current.calculate({
          entryPrice: 100,
          stopLoss: 95,
          targets: [110],
          riskCapital: 500,
        });
      });

      expect(result.current.result).toBeNull();
      expect(result.current.error).toBe('Failed to calculate position sizing');
    });
  });

  describe('reset', () => {
    it('should reset state to initial values', async () => {
      mockCalculatePositionSize.mockResolvedValue({
        result: {
          position_size: 100,
          distance_to_stop: 5,
          risk_amount: 500,
          account_risk_percentage: 5,
          is_valid: true,
        },
      });

      mockCalculateRiskReward.mockResolvedValue({
        result: {
          risk_reward_ratio: 2,
          target_ratios: [2],
          potential_profit: 1000,
          potential_loss: 500,
          recommendation: 'good',
          is_valid: true,
        },
      });

      const { result } = renderHook(() => usePositionSizingAPI());

      // First calculate
      await act(async () => {
        await result.current.calculate({
          entryPrice: 100,
          stopLoss: 95,
          targets: [110],
          riskCapital: 500,
        });
      });

      await waitFor(() => {
        expect(result.current.result).not.toBeNull();
      });

      // Then reset
      act(() => {
        result.current.reset();
      });

      expect(result.current.result).toBeNull();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBeNull();
      expect(result.current.isBackendAvailable).toBe(true);
    });
  });
});
