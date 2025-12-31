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
4. **Backend-first business logic** - all calculations, validations, and domain logic in Python backend
5. **Dumb frontend client** - React frontend focuses only on presentation and user interaction

---

## Frontend/Backend Separation

### Principle: Backend Owns Business Logic

```
┌─────────────────────────────────────────────────────────────┐
│                      BACKEND (Python)                        │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  • Fibonacci calculations                               ││
│  │  • Pattern detection (Gartley, Butterfly, etc.)         ││
│  │  • Signal bar detection                                 ││
│  │  • Position sizing calculations                         ││
│  │  • Risk/reward calculations                             ││
│  │  • Trend analysis                                       ││
│  │  • Workflow validation rules                            ││
│  │  • Trade management logic                               ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
                              │
                              │ REST API
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React/Next.js)                  │
│  ┌─────────────────────────────────────────────────────────┐│
│  │  • UI components and styling                            ││
│  │  • User input handling                                  ││
│  │  • API calls to backend                                 ││
│  │  • State management (UI state only)                     ││
│  │  • Data display and formatting                          ││
│  │  • Chart rendering                                      ││
│  │  • Form validation (UX only, not business rules)        ││
│  └─────────────────────────────────────────────────────────┘│
└─────────────────────────────────────────────────────────────┘
```

### What Stays in Frontend
- Component rendering and styling
- User interaction handling (clicks, inputs)
- UI state (modals open/closed, tabs selected)
- Data fetching and caching (React Query/SWR)
- Form UX validation (required fields, format)
- Optimistic updates for responsiveness

### What Moves to Backend
- All mathematical calculations
- Domain validation rules
- Workflow step validation
- Pattern detection algorithms
- Position sizing formulas
- Risk calculations
- Any logic that could be unit tested

### Migration Strategy
1. Identify business logic in frontend
2. Write backend tests first (TDD)
3. Implement backend endpoint
4. Update frontend to call API
5. Remove frontend logic
6. Verify with integration tests

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
3. **REFACTOR**: Clean up the code using the refactoring checklist below
4. **COMMIT**: Commit the working, tested code
5. **REPEAT**: Move to the next small piece of functionality

---

## Refactoring Checklist

During the REFACTOR phase, review code against these principles:

### Code Smells

Check for and eliminate:

| Smell | Description | Fix |
|-------|-------------|-----|
| Long Method | Function > 20 lines | Extract smaller functions |
| Large Class | Class doing too much | Split into focused classes |
| Long Parameter List | > 3-4 parameters | Use parameter object or builder |
| Duplicate Code | Same logic in multiple places | Extract to shared function |
| Dead Code | Unused variables/functions | Delete it |
| Magic Numbers | Hardcoded values without context | Use named constants |
| Primitive Obsession | Overuse of primitives | Create domain types |
| Feature Envy | Method uses another class's data more | Move method to that class |
| Data Clumps | Same data groups appear together | Create a class for them |
| Comments | Code needs comments to explain | Refactor to be self-documenting |

### Complexity Metrics

| Metric | Target | Action if Exceeded |
|--------|--------|-------------------|
| **Cyclomatic Complexity** | ≤ 10 per function | Reduce branches, extract methods |
| **Cognitive Complexity** | ≤ 15 per function | Simplify nesting, early returns |
| **Function Length** | ≤ 20 lines | Extract helper functions |
| **Class Length** | ≤ 200 lines | Split into smaller classes |
| **Parameters** | ≤ 4 per function | Use objects, builder pattern |
| **Nesting Depth** | ≤ 3 levels | Early returns, extract methods |

### SOLID Principles

| Principle | Check | Violation Signs |
|-----------|-------|-----------------|
| **S**ingle Responsibility | Does each class/function do ONE thing? | "and" in description, multiple reasons to change |
| **O**pen/Closed | Can you extend without modifying? | Frequent edits to existing code for new features |
| **L**iskov Substitution | Can subtypes replace parent types? | Type checking, instanceof usage |
| **I**nterface Segregation | Are interfaces focused? | Classes implementing unused methods |
| **D**ependency Inversion | Depend on abstractions? | Direct instantiation of concrete classes |

### DRY (Don't Repeat Yourself)

- [ ] No duplicated logic (extract to functions)
- [ ] No duplicated constants (use shared config)
- [ ] No copy-pasted code blocks
- [ ] Similar patterns abstracted appropriately

### YAGNI (You Aren't Gonna Need It)

- [ ] No speculative features "for later"
- [ ] No unused parameters or options
- [ ] No premature abstractions
- [ ] No over-engineering for hypothetical requirements

### Clean Code Principles

| Principle | Check |
|-----------|-------|
| **Meaningful Names** | Variables/functions clearly describe purpose |
| **Small Functions** | Each function does one thing well |
| **No Side Effects** | Functions don't modify unexpected state |
| **Command-Query Separation** | Functions either do something OR return something |
| **Error Handling** | Errors handled explicitly, not swallowed |
| **Consistent Formatting** | Code follows project style guide |
| **Minimal Comments** | Code is self-documenting; comments explain "why" not "what" |

### Data Structures & Algorithms

| Check | Questions to Ask |
|-------|------------------|
| **Right Data Structure** | Is list/dict/set/tuple the best choice? |
| **Time Complexity** | Is this O(n²) when O(n) is possible? |
| **Space Complexity** | Are we using excessive memory? |
| **Appropriate Algorithms** | Binary search vs linear? Sorting approach? |
| **Immutability** | Should this be immutable for safety? |
| **Lazy Evaluation** | Can we use generators for large data? |

### Design Patterns

Consider applying when appropriate:

| Pattern | When to Use |
|---------|-------------|
| **Strategy** | Multiple algorithms for same task |
| **Factory** | Complex object creation logic |
| **Builder** | Objects with many optional parameters |
| **Observer** | Event-driven updates (price feeds) |
| **Decorator** | Add behavior without changing class |
| **Repository** | Abstract data access |
| **Command** | Encapsulate actions (trade orders) |
| **State** | Object behavior changes with state |

### Refactoring Checklist Summary

Before committing, verify:

```
[ ] No code smells present
[ ] Cyclomatic complexity ≤ 10
[ ] Cognitive complexity ≤ 15
[ ] Functions ≤ 20 lines
[ ] SOLID principles followed
[ ] No DRY violations
[ ] No YAGNI violations
[ ] Clean code principles applied
[ ] Correct data structures used
[ ] Appropriate design patterns applied
[ ] All tests still pass
```

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

### TDD & Testing
- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Test-Driven Development by Example (Kent Beck)](https://www.amazon.com/Test-Driven-Development-Kent-Beck/dp/0321146530)
- [The Three Laws of TDD (Robert C. Martin)](https://www.butunclebob.com/ArticleS.UncleBob.TheThreeRulesOfTdd)

### Clean Code & Refactoring
- [Clean Code (Robert C. Martin)](https://www.amazon.com/Clean-Code-Handbook-Software-Craftsmanship/dp/0132350882)
- [Refactoring (Martin Fowler)](https://refactoring.com/)
- [Code Smells Catalog](https://refactoring.guru/refactoring/smells)

### SOLID Principles
- [SOLID Principles (Wikipedia)](https://en.wikipedia.org/wiki/SOLID)
- [SOLID Explained](https://www.digitalocean.com/community/conceptual-articles/s-o-l-i-d-the-first-five-principles-of-object-oriented-design)

### Design Patterns
- [Design Patterns (Gang of Four)](https://www.amazon.com/Design-Patterns-Elements-Reusable-Object-Oriented/dp/0201633612)
- [Refactoring.Guru Design Patterns](https://refactoring.guru/design-patterns)

### Complexity Metrics
- [Cognitive Complexity (SonarSource)](https://www.sonarsource.com/resources/cognitive-complexity/)
- [Cyclomatic Complexity (Wikipedia)](https://en.wikipedia.org/wiki/Cyclomatic_complexity)
