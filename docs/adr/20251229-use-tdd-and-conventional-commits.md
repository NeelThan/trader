# Use TDD and Conventional Commits for Development Workflow

- Status: accepted
- Deciders: Team
- Date: 2025-12-29
- Tags: workflow, testing, git, development-process

Technical Story: Establish a consistent development workflow for the project

## Context and Problem Statement

We need a consistent development workflow that ensures code quality, maintainability, and a clean git history. How should we approach development and version control?

## Decision Drivers

- Code quality: Catch bugs early, ensure code works as expected
- Maintainability: Clear git history makes debugging and onboarding easier
- Incremental progress: Small steps reduce risk and make reviews easier
- Documentation: Commits should explain why changes were made

## Decision Outcome

We will use:
1. **Test-Driven Development (TDD)** for all feature development
2. **Conventional Commits** for all git commits
3. **Small incremental steps** with commits at each logical checkpoint

---

## TDD Workflow (Red-Green-Refactor)

### The TDD Cycle

```
┌─────────────────────────────────────────────────────────────┐
│                                                             │
│    ┌─────────┐      ┌─────────┐      ┌──────────┐          │
│    │   RED   │ ───► │  GREEN  │ ───► │ REFACTOR │ ───┐     │
│    │  Write  │      │  Write  │      │  Clean   │    │     │
│    │ failing │      │ minimal │      │   up     │    │     │
│    │  test   │      │  code   │      │  code    │    │     │
│    └─────────┘      └─────────┘      └──────────┘    │     │
│         ▲                                            │     │
│         └────────────────────────────────────────────┘     │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### TDD Steps

1. **RED**: Write a failing test that defines the expected behavior
2. **GREEN**: Write the minimum code needed to make the test pass
3. **REFACTOR**: Clean up the code while keeping tests green
4. **COMMIT**: Commit the working, tested code
5. **REPEAT**: Move to the next small piece of functionality

### TDD Commit Points

Commit after each complete TDD cycle:
- After RED+GREEN+REFACTOR for a single unit of functionality
- Keep commits small and focused
- Each commit should leave the codebase in a working state

---

## Conventional Commits

### Format

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

| Type | Description | Example |
|------|-------------|---------|
| `feat` | New feature | `feat(fib): add retracement calculator` |
| `fix` | Bug fix | `fix(chart): correct pivot detection` |
| `test` | Adding/updating tests | `test(fib): add retracement edge cases` |
| `refactor` | Code refactoring | `refactor(api): extract validation logic` |
| `docs` | Documentation | `docs(adr): add tech stack decision` |
| `style` | Formatting, no code change | `style: fix linting errors` |
| `chore` | Maintenance tasks | `chore: update dependencies` |
| `build` | Build system changes | `build: configure pytest` |
| `ci` | CI/CD changes | `ci: add GitHub Actions workflow` |
| `perf` | Performance improvement | `perf(calc): optimize pattern detection` |

### Scope Examples (for this project)

| Scope | Area |
|-------|------|
| `fib` | Fibonacci calculations |
| `pattern` | Pattern detection (Gartley, Butterfly) |
| `signal` | Signal bar detection |
| `chart` | Charting/visualization |
| `api` | Backend API |
| `ui` | Frontend UI components |
| `db` | Database |
| `auth` | Authentication |

### Commit Message Examples

```
feat(fib): add extension level calculator

Implement 127%, 162%, and 262% extension calculations
for both BUY and SELL setups.

Closes #12
```

```
test(fib): add retracement calculation tests

- Test 38%, 50%, 62%, 79% levels
- Test both BUY and SELL directions
- Add edge cases for zero range
```

```
refactor(pattern): extract pivot detection logic

Move pivot detection into separate module for
better testability and reuse.
```

---

## Incremental Development Process

### Before Starting Work

Always sync with remote before starting new changes:

```bash
git fetch origin
git pull origin main
```

This ensures:
- No merge conflicts later
- Working with latest codebase
- Awareness of recent changes by others

### When to Commit

Commit at these logical checkpoints:

1. **After completing a TDD cycle** (test + implementation + refactor)
2. **After adding a new test file** (even before implementation)
3. **After a successful refactor** (tests still pass)
4. **After fixing a bug** (with test that reproduces it)
5. **After documentation updates** (ADRs, README, comments)
6. **After configuration changes** (dependencies, build config)

### Commit Size Guidelines

- Each commit should do ONE thing
- If you need "and" in the commit message, consider splitting
- Aim for commits that can be reviewed in under 5 minutes
- A commit should not break the build or tests

### Example Development Session

```
1. feat(fib): add retracement level enum
   - Define the 4 retracement levels (38, 50, 62, 79)

2. test(fib): add retracement calculator tests
   - Write failing tests for BUY retracement

3. feat(fib): implement BUY retracement calculator
   - Make tests pass with minimal implementation

4. test(fib): add SELL retracement tests
   - Write failing tests for SELL direction

5. feat(fib): implement SELL retracement calculator
   - Make SELL tests pass

6. refactor(fib): extract common calculation logic
   - DRY up BUY and SELL implementations

7. test(fib): add edge case tests
   - Zero range, negative values, etc.
```

---

## Testing Strategy

### Test Types

| Type | Purpose | Location |
|------|---------|----------|
| Unit | Test individual functions | `tests/unit/` |
| Integration | Test component interaction | `tests/integration/` |
| E2E | Test full user flows | `tests/e2e/` |

### Test Naming Convention

```python
# Python (pytest)
def test_<function>_<scenario>_<expected_result>():
    pass

# Examples
def test_retracement_buy_setup_returns_correct_levels():
    pass

def test_retracement_zero_range_raises_error():
    pass
```

### Test File Structure

```
tests/
├── unit/
│   ├── test_fibonacci.py
│   ├── test_patterns.py
│   └── test_signals.py
├── integration/
│   └── test_api.py
└── e2e/
    └── test_trading_workflow.py
```

---

## Positive Consequences

- Bugs caught early through TDD
- Clean, readable git history
- Easy to bisect and find regressions
- Self-documenting codebase through tests
- Reviewable, focused commits

## Negative Consequences

- Slightly slower initial development (writing tests first)
- Discipline required to maintain commit hygiene
- Learning curve for TDD if unfamiliar

## Links

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Test-Driven Development by Example (Kent Beck)](https://www.amazon.com/Test-Driven-Development-Kent-Beck/dp/0321146530)
- [The Three Laws of TDD (Robert C. Martin)](https://www.butunclebob.com/ArticleS.UncleBob.TheThreeRulesOfTdd)
