# Workflow State Persistence with localStorage

- Status: accepted
- Deciders: Development team
- Date: 2025-12-30
- Tags: frontend, state-management, persistence, localStorage

Technical Story: Persist trading workflow state so users can resume interrupted workflows

## Context and Problem Statement

The trading workflow can be interrupted at any step (browser close, navigation away, system crash). Users need to resume their workflow from where they left off without re-entering all the data. How do we persist workflow state reliably?

## Decision Drivers

- State must persist across browser sessions (page refresh, close/reopen)
- State should sync across browser tabs working on the same workflow
- Must work without backend (client-only solution)
- Must be hydration-safe for Next.js SSR
- Existing pattern already used for PositionSizing settings (proven approach)
- Need to support atomic updates and optimistic UI

## Considered Options

1. **localStorage with useSyncExternalStore** - Match existing pattern
2. **IndexedDB** - More storage, structured queries
3. **Backend persistence** - Server-side storage via API
4. **URL state** - Encode in query parameters
5. **React Context only** - In-memory, no persistence

## Decision Outcome

Chosen option: "localStorage with useSyncExternalStore", because it matches the existing proven pattern used for PositionSizing, provides cross-tab sync, and requires no backend changes.

### Positive Consequences

- Consistent with existing codebase patterns (use-position-sizing.ts)
- Cross-tab synchronization via StorageEvent
- Hydration-safe with server snapshot fallback
- Simple implementation with React 18 useSyncExternalStore
- No backend dependencies or API changes
- Works offline

### Negative Consequences

- Limited storage (~5MB per origin, but workflow state is small)
- Cleared if user clears browser data
- Serialization/deserialization overhead for complex state
- No cloud sync between devices

## Pros and Cons of the Options

### localStorage with useSyncExternalStore

```typescript
const STORAGE_KEY = 'trader-workflow-state';

function useWorkflowState() {
  return useSyncExternalStore(
    subscribe,        // Listen for storage events
    getSnapshot,      // Get current localStorage value
    getServerSnapshot // SSR fallback (defaults)
  );
}
```

- Good, because matches existing PositionSizing pattern
- Good, because cross-tab sync via StorageEvent
- Good, because React 18 concurrent-safe
- Good, because SSR hydration support
- Bad, because 5MB storage limit (not a real issue for this use case)
- Bad, because no cross-device sync

### IndexedDB

- Good, because larger storage capacity
- Good, because structured data queries
- Bad, because more complex API
- Bad, because no cross-tab sync by default
- Bad, because overkill for workflow state size

### Backend persistence

- Good, because cross-device sync
- Good, because unlimited storage
- Bad, because requires API endpoints
- Bad, because network latency
- Bad, because doesn't work offline
- Bad, because authentication complexity

### URL state

- Good, because shareable/bookmarkable
- Good, because no persistence code needed
- Bad, because URL length limits
- Bad, because complex state doesn't serialize well
- Bad, because ugly URLs with large state

### React Context only

- Good, because simplest implementation
- Bad, because lost on page refresh
- Bad, because no cross-tab sync
- Bad, because defeats the purpose of persistence

## Implementation Details

### Storage Key and Structure

```typescript
const STORAGE_KEY = 'trader-workflow-state';

// State is JSON.stringify'd before storage
type WorkflowState = {
  currentStep: number;
  lastUpdated: string; // ISO timestamp
  // ... all step data
};
```

### Cross-Tab Sync

```typescript
function subscribe(callback: () => void) {
  listeners.add(callback);

  const handleStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) {
      cachedRawValue = null; // Invalidate cache
      callback();
    }
  };

  window.addEventListener('storage', handleStorage);
  return () => {
    listeners.delete(callback);
    window.removeEventListener('storage', handleStorage);
  };
}
```

### SSR Hydration Safety

```typescript
function getServerSnapshot(): WorkflowState {
  // Return defaults during SSR - no localStorage access
  return DEFAULT_STATE;
}

function getSnapshot(): WorkflowState {
  // Only called on client, safe to access localStorage
  const stored = localStorage.getItem(STORAGE_KEY);
  return stored ? JSON.parse(stored) : DEFAULT_STATE;
}
```

### Cache for Performance

```typescript
let cachedState: WorkflowState = DEFAULT_STATE;
let cachedRawValue: string | null = null;

function getSnapshot(): WorkflowState {
  const stored = localStorage.getItem(STORAGE_KEY);

  // Return cached if unchanged (avoid re-parse)
  if (stored === cachedRawValue) {
    return cachedState;
  }

  cachedRawValue = stored;
  cachedState = stored ? JSON.parse(stored) : DEFAULT_STATE;
  return cachedState;
}
```

## Links

- [Trading Workflow Stepper ADR](20251230-trading-workflow-stepper.md)
- [Standalone Tools ADR](20251230-standalone-composable-tools.md)
- Related implementation: `frontend/src/hooks/use-position-sizing.ts`
