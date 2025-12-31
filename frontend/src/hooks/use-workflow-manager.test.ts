import { describe, it, expect, beforeEach, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWorkflowManager } from './use-workflow-manager';

describe('useWorkflowManager', () => {
  beforeEach(() => {
    // Clear localStorage before each test
    localStorage.clear();
    vi.clearAllMocks();
  });

  describe('initial state', () => {
    it('should return empty workflows when no data exists', () => {
      const { result } = renderHook(() => useWorkflowManager());

      expect(result.current.workflows).toEqual([]);
      expect(result.current.pendingWorkflows).toEqual([]);
      expect(result.current.completedWorkflows).toEqual([]);
      expect(result.current.hasActiveWorkflow).toBe(false);
      expect(result.current.activeWorkflow).toBeNull();
    });
  });

  describe('createWorkflow', () => {
    it('should create a new workflow with default state', () => {
      const { result } = renderHook(() => useWorkflowManager());

      let workflowId: string;
      act(() => {
        workflowId = result.current.createWorkflow();
      });

      expect(workflowId!).toMatch(/^wf_\d+_[a-z0-9]+$/);
      expect(result.current.workflows).toHaveLength(1);
      expect(result.current.hasActiveWorkflow).toBe(true);
      expect(result.current.activeWorkflow).not.toBeNull();
      expect(result.current.activeWorkflow?.state.symbol).toBe('SPX');
    });

    it('should create workflow with custom initial state', () => {
      const { result } = renderHook(() => useWorkflowManager());

      act(() => {
        result.current.createWorkflow({ symbol: 'DJI', tradingStyle: 'day' });
      });

      expect(result.current.activeWorkflow?.state.symbol).toBe('DJI');
      expect(result.current.activeWorkflow?.state.tradingStyle).toBe('day');
    });

    it('should set the new workflow as active', () => {
      const { result } = renderHook(() => useWorkflowManager());

      let workflowId: string;
      act(() => {
        workflowId = result.current.createWorkflow();
      });

      expect(result.current.activeWorkflowSummary?.id).toBe(workflowId!);
    });
  });

  describe('deleteWorkflow', () => {
    it('should remove a workflow by id', () => {
      const { result } = renderHook(() => useWorkflowManager());

      let workflowId: string;
      act(() => {
        workflowId = result.current.createWorkflow();
      });

      expect(result.current.workflows).toHaveLength(1);

      act(() => {
        result.current.deleteWorkflow(workflowId!);
      });

      expect(result.current.workflows).toHaveLength(0);
      expect(result.current.hasActiveWorkflow).toBe(false);
    });

    it('should clear active workflow if deleted workflow was active', () => {
      const { result } = renderHook(() => useWorkflowManager());

      let workflowId: string;
      act(() => {
        workflowId = result.current.createWorkflow();
      });

      expect(result.current.hasActiveWorkflow).toBe(true);

      act(() => {
        result.current.deleteWorkflow(workflowId!);
      });

      expect(result.current.hasActiveWorkflow).toBe(false);
      expect(result.current.activeWorkflow).toBeNull();
    });
  });

  describe('setActiveWorkflow', () => {
    it('should set a workflow as active by id', () => {
      const { result } = renderHook(() => useWorkflowManager());

      let id1: string, id2: string;
      act(() => {
        id1 = result.current.createWorkflow({ symbol: 'SPX' });
        id2 = result.current.createWorkflow({ symbol: 'DJI' });
      });

      // id2 should be active (last created)
      expect(result.current.activeWorkflow?.state.symbol).toBe('DJI');

      act(() => {
        result.current.setActiveWorkflow(id1!);
      });

      expect(result.current.activeWorkflow?.state.symbol).toBe('SPX');
    });

    it('should return false for non-existent workflow id', () => {
      const { result } = renderHook(() => useWorkflowManager());

      let success: boolean;
      act(() => {
        success = result.current.setActiveWorkflow('non-existent-id');
      });

      expect(success!).toBe(false);
    });
  });

  describe('updateActiveWorkflow', () => {
    it('should update the active workflow state', () => {
      const { result } = renderHook(() => useWorkflowManager());

      act(() => {
        result.current.createWorkflow();
      });

      act(() => {
        result.current.updateActiveWorkflow({
          currentStep: 3,
          symbol: 'BTCUSD',
        });
      });

      expect(result.current.activeWorkflow?.state.currentStep).toBe(3);
      expect(result.current.activeWorkflow?.state.symbol).toBe('BTCUSD');
    });

    it('should return false when no active workflow', () => {
      const { result } = renderHook(() => useWorkflowManager());

      let success: boolean;
      act(() => {
        success = result.current.updateActiveWorkflow({ currentStep: 2 });
      });

      expect(success!).toBe(false);
    });
  });

  describe('duplicateWorkflow', () => {
    it('should create a copy of an existing workflow', () => {
      const { result } = renderHook(() => useWorkflowManager());

      let originalId = '';
      act(() => {
        originalId = result.current.createWorkflow({ symbol: 'NDX' });
        result.current.updateActiveWorkflow({ currentStep: 5 });
      });

      let duplicateId: string | null = null;
      act(() => {
        duplicateId = result.current.duplicateWorkflow(originalId);
      });

      expect(duplicateId).not.toBeNull();
      expect(duplicateId).not.toBe(originalId);
      expect(result.current.workflows).toHaveLength(2);

      // Duplicate should have same symbol but reset to step 1
      const duplicate = result.current.getWorkflow(duplicateId!);
      expect(duplicate?.state.symbol).toBe('NDX');
      expect(duplicate?.state.currentStep).toBe(1);
      expect(duplicate?.name).toContain('(Copy)');
    });
  });

  describe('workflow status', () => {
    it('should categorize workflows as pending', () => {
      const { result } = renderHook(() => useWorkflowManager());

      act(() => {
        result.current.createWorkflow();
      });

      expect(result.current.pendingWorkflows).toHaveLength(1);
      expect(result.current.completedWorkflows).toHaveLength(0);
    });

    it('should mark workflow as completed', () => {
      const { result } = renderHook(() => useWorkflowManager());

      let workflowId: string;
      act(() => {
        workflowId = result.current.createWorkflow();
      });

      act(() => {
        result.current.completeWorkflow(workflowId!);
      });

      expect(result.current.pendingWorkflows).toHaveLength(0);
      expect(result.current.completedWorkflows).toHaveLength(1);
    });

    it('should mark workflow as cancelled', () => {
      const { result } = renderHook(() => useWorkflowManager());

      let workflowId: string;
      act(() => {
        workflowId = result.current.createWorkflow();
      });

      act(() => {
        result.current.cancelWorkflow(workflowId!);
      });

      const workflow = result.current.getWorkflow(workflowId!);
      expect(workflow?.status).toBe('cancelled');
    });
  });

  describe('getProgress', () => {
    it('should calculate workflow progress percentage', () => {
      const { result } = renderHook(() => useWorkflowManager());

      let workflowId: string;
      act(() => {
        workflowId = result.current.createWorkflow();
      });

      // Initial progress should be 0
      expect(result.current.getProgress(workflowId!)).toBe(0);

      // Update completed steps
      act(() => {
        result.current.updateActiveWorkflow({
          currentStep: 4,
          completedSteps: [1, 2, 3],
        });
      });

      // 3 of 8 steps = 37.5% rounded to 38%
      expect(result.current.getProgress(workflowId!)).toBe(38);
    });
  });

  describe('getValidation', () => {
    it('should return valid for new workflow', () => {
      const { result } = renderHook(() => useWorkflowManager());

      let workflowId: string;
      act(() => {
        workflowId = result.current.createWorkflow();
      });

      const validation = result.current.getValidation(workflowId!);
      expect(validation.valid).toBe(true);
      expect(validation.issues).toHaveLength(0);
    });

    it('should detect issues with workflow state', () => {
      const { result } = renderHook(() => useWorkflowManager());

      let workflowId: string;
      act(() => {
        workflowId = result.current.createWorkflow();
        result.current.updateActiveWorkflow({
          currentStep: 6,
          positionSize: 0, // Invalid - should be calculated
          higherTrend: 'UP',
          lowerTrend: 'DOWN', // Misaligned trends
          tradeDirection: 'GO_LONG',
        });
      });

      const validation = result.current.getValidation(workflowId!);
      expect(validation.valid).toBe(false);
      expect(validation.issues.length).toBeGreaterThan(0);
    });
  });

  describe('clearAll', () => {
    it('should remove all workflows', () => {
      const { result } = renderHook(() => useWorkflowManager());

      act(() => {
        result.current.createWorkflow();
        result.current.createWorkflow();
        result.current.createWorkflow();
      });

      expect(result.current.workflows).toHaveLength(3);

      act(() => {
        result.current.clearAll();
      });

      expect(result.current.workflows).toHaveLength(0);
      expect(result.current.hasActiveWorkflow).toBe(false);
    });
  });

  describe('persistence', () => {
    it('should persist workflows to localStorage', () => {
      const { result } = renderHook(() => useWorkflowManager());

      act(() => {
        result.current.createWorkflow({ symbol: 'GOLD' });
      });

      // Check localStorage was called
      expect(localStorage.setItem).toHaveBeenCalled();

      // Get the stored value
      const storedValue = localStorage.getItem('trader-workflow-store');
      expect(storedValue).not.toBeNull();

      const parsed = JSON.parse(storedValue!);
      expect(parsed.workflows).toHaveLength(1);
      expect(parsed.workflows[0].state.symbol).toBe('GOLD');
    });

    it('should restore workflows from localStorage on mount', () => {
      // Pre-populate localStorage
      const mockStore = {
        workflows: [
          {
            id: 'wf_test_123',
            name: 'Test Workflow',
            status: 'pending',
            state: {
              symbol: 'EURUSD',
              currentStep: 2,
              completedSteps: [1],
              lastUpdated: new Date().toISOString(),
              higherTimeframe: '1D',
              lowerTimeframe: '4H',
              tradingStyle: 'swing',
              higherTrend: 'UP',
              lowerTrend: 'UP',
              tradeDirection: 'GO_LONG',
              trendConfidence: 0.8,
              pivots: [],
              fibTool: 'retracement',
              fibLevels: [],
              selectedLevelIndex: null,
              detectedPatterns: [],
              detectedSignals: [],
              scanCompleted: false,
              selectedLevel: null,
              signalBar: null,
              entryConfirmed: false,
              entryPrice: 0,
              stopLoss: 0,
              targets: [],
              positionSize: 0,
              riskRewardRatio: 0,
              riskAmount: 0,
              checklistItems: [],
              goNoGo: 'PENDING',
              tradeStatus: 'pending',
              currentPnL: 0,
              breakEvenPrice: 0,
              freeTradeActive: false,
              trailingEnabled: false,
              trailingStopPrice: null,
              tradeLog: [],
            },
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
          },
        ],
        activeWorkflowId: 'wf_test_123',
        version: 1,
      };

      localStorage.setItem('trader-workflow-store', JSON.stringify(mockStore));

      const { result } = renderHook(() => useWorkflowManager());

      expect(result.current.workflows).toHaveLength(1);
      expect(result.current.workflows[0].symbol).toBe('EURUSD');
      expect(result.current.hasActiveWorkflow).toBe(true);
    });
  });
});
