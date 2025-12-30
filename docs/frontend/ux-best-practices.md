# UX Best Practices

Guidelines for creating consistent, accessible, and user-friendly interfaces in the Trader application.

## Table of Contents

1. [Core Principles](#core-principles)
2. [Layout & Spacing](#layout--spacing)
3. [Color Usage](#color-usage)
4. [Typography](#typography)
5. [Interactive Elements](#interactive-elements)
6. [Feedback & States](#feedback--states)
7. [Trading-Specific UX](#trading-specific-ux)
8. [Accessibility](#accessibility)
9. [Responsive Design](#responsive-design)
10. [Component Patterns](#component-patterns)

---

## Core Principles

### 1. Clarity Over Cleverness
- Use familiar UI patterns traders expect
- Label actions clearly (e.g., "Show Pivots" not "Toggle P")
- Avoid jargon in UI; use it only for trading terminology

### 2. Reduce Cognitive Load
- Group related controls together
- Use visual hierarchy to guide attention
- Limit options visible at once (progressive disclosure)
- Show only relevant information for the current task

### 3. Speed & Efficiency
- Minimize clicks for common actions
- Provide keyboard shortcuts for power users
- Prefetch data when user intent is predictable
- Use optimistic updates where safe

### 4. Trust & Confidence
- Always show current state clearly
- Confirm destructive actions
- Provide undo where possible
- Never lose user data

---

## Layout & Spacing

### Spacing Scale
Use consistent spacing from Tailwind's scale:

| Token | Value | Usage |
|-------|-------|-------|
| `gap-1` | 4px | Inline elements, icon gaps |
| `gap-2` | 8px | Related controls, button groups |
| `gap-4` | 16px | Section content padding |
| `gap-6` | 24px | Between sections |
| `p-4` | 16px | Card/panel padding |
| `p-6` | 24px | Page-level padding |

### Layout Rules
1. **Consistent padding**: Use `p-4` for cards, `p-6` for page containers
2. **Vertical rhythm**: Use `space-y-4` or `space-y-6` for stacked elements
3. **Horizontal grouping**: Use `flex items-center gap-2` for inline controls
4. **Max width**: Constrain content with `max-w-6xl mx-auto` for readability

### Example: Section Layout
```tsx
<div className="p-4 rounded-lg bg-card border space-y-4">
  <h3 className="font-semibold">Section Title</h3>
  {/* Content with consistent spacing */}
</div>
```

---

## Color Usage

### Semantic Colors
Use design system tokens, never hardcoded colors:

| Purpose | Token | Usage |
|---------|-------|-------|
| Background | `bg-background` | Page background |
| Cards | `bg-card` | Elevated surfaces |
| Primary actions | `bg-primary` | Main CTA buttons |
| Secondary | `bg-secondary` | Less prominent actions |
| Muted text | `text-muted-foreground` | Helper text, labels |
| Borders | `border` | Dividers, card borders |

### Trading Colors
**Critical**: These colors have specific meaning in trading contexts:

| Purpose | Token | Meaning |
|---------|-------|---------|
| Buy/Bullish | `text-buy` / `bg-buy` | Green - price increase, buy signals |
| Sell/Bearish | `text-sell` / `bg-sell` | Red - price decrease, sell signals |
| Fibonacci levels | `text-fibonacci-*` | Golden ratio analysis |

### Color Rules
1. **Never use red/green for non-trading purposes** - Reserve for buy/sell meaning
2. **Use semantic tokens** - `text-muted-foreground` not `text-gray-500`
3. **Maintain contrast** - Use `foreground` variants on colored backgrounds
4. **Theme-aware** - All colors must work in light and dark modes

### Status Indicators
```tsx
// Good - uses semantic tokens
<span className={priceChange >= 0 ? "text-buy" : "text-sell"}>
  {priceChange}
</span>

// Bad - hardcoded colors
<span className={priceChange >= 0 ? "text-green-500" : "text-red-500"}>
  {priceChange}
</span>
```

---

## Typography

### Font Scale
Use Tailwind's typography scale consistently:

| Class | Size | Usage |
|-------|------|-------|
| `text-2xl font-bold` | 24px | Page titles |
| `text-lg font-semibold` | 18px | Section headings |
| `text-base` | 16px | Body text |
| `text-sm` | 14px | Secondary text, labels |
| `text-xs` | 12px | Captions, timestamps |

### Font Families
- **Sans** (`font-sans`): UI text, labels, descriptions
- **Mono** (`font-mono`): Prices, numbers, code

### Typography Rules
1. **Prices always in mono**: `<span className="font-mono">42,500.00</span>`
2. **Labels above inputs**: Use `<Label>` component
3. **Muted for secondary**: `text-muted-foreground` for helper text
4. **Consistent headings**: Same style for same hierarchy level

---

## Interactive Elements

### Button Hierarchy
1. **Primary** (`variant="default"`): Main action, one per section
2. **Secondary** (`variant="secondary"`): Alternative actions
3. **Outline** (`variant="outline"`): Toggle states, less emphasis
4. **Destructive** (`variant="destructive"`): Delete, reset actions

### Button States
All interactive elements must show:
- **Default**: Base appearance
- **Hover**: Visual feedback on mouse over
- **Active/Pressed**: Feedback during click
- **Focus**: Keyboard focus indicator (ring)
- **Disabled**: Reduced opacity, no pointer events

### Toggle Buttons
For on/off states, use visual distinction:

```tsx
// Active state - solid background
<Button variant={isActive ? "default" : "outline"}>
  {isActive ? "Hide" : "Show"} Feature
</Button>

// With color coding (for features, not trading actions)
<Button
  className={isActive ? "bg-amber-600 hover:bg-amber-700" : ""}
>
  Show Lines
</Button>
```

### Selection Groups
For mutually exclusive options (e.g., timeframe, symbol):

```tsx
{options.map((option) => (
  <Button
    key={option}
    variant={selected === option ? "default" : "outline"}
    size="sm"
    onClick={() => setSelected(option)}
  >
    {option}
  </Button>
))}
```

---

## Feedback & States

### Loading States
Always show loading feedback for async operations:

```tsx
// Inline loading
{isLoading && (
  <div className="flex items-center gap-2 text-muted-foreground">
    <Spinner size="sm" />
    <span className="text-sm">Loading...</span>
  </div>
)}

// Full-page loading
<div className="flex items-center justify-center min-h-[400px]">
  <Spinner size="lg" />
</div>
```

### Error States
Display errors clearly with recovery options:

```tsx
{error && (
  <div className="p-4 rounded-lg bg-destructive/10 border border-destructive/30">
    <p className="text-sm text-destructive">{error}</p>
    <Button variant="outline" size="sm" onClick={retry}>
      Try Again
    </Button>
  </div>
)}
```

### Empty States
Guide users when no data is available:

```tsx
<div className="text-center py-12">
  <p className="text-muted-foreground">No patterns detected</p>
  <Button variant="outline" className="mt-4">
    Adjust Parameters
  </Button>
</div>
```

### Success Feedback
Confirm successful actions briefly:

```tsx
// Toast notification (recommended)
toast.success("Settings saved");

// Inline confirmation
<span className="text-buy text-sm">Saved!</span>
```

---

## Trading-Specific UX

### Price Display
1. **Always use mono font**: `font-mono`
2. **Format with locale**: `toLocaleString()` with fixed decimals
3. **Show direction**: Color-code changes (buy/sell colors)
4. **Include units**: Show currency or percentage as needed

```tsx
const formatPrice = (price: number) => {
  return price.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
};

<p className="text-xl font-bold font-mono">
  {formatPrice(price)}
</p>
```

### Change Indicators
Always pair value with direction indicator:

```tsx
<p className={`font-mono ${change >= 0 ? "text-buy" : "text-sell"}`}>
  {change >= 0 ? "+" : ""}{formatPrice(change)} ({percent}%)
</p>
```

### Chart Controls
1. **Group by function**: Timeframe, chart type, data source
2. **Show current state**: Highlight active selection
3. **Immediate feedback**: Update chart on selection
4. **Preserve context**: Don't reset zoom on parameter change

### Data Source Indicators
Make data source visible to build trust:

```tsx
<div className="flex items-center gap-2">
  <span className="text-sm text-muted-foreground">Source:</span>
  <Badge variant={isLive ? "default" : "secondary"}>
    {isLive ? "Live" : "Simulated"}
  </Badge>
</div>
```

---

## Accessibility

### Minimum Requirements
1. **Keyboard navigation**: All interactive elements focusable
2. **Focus indicators**: Visible focus rings (`ring` classes)
3. **Screen reader labels**: `aria-label` for icon-only buttons
4. **Color contrast**: WCAG AA minimum (4.5:1 for text)
5. **Motion reduction**: Respect `prefers-reduced-motion`

### Component Accessibility

```tsx
// Icon-only button
<Button variant="outline" size="icon" aria-label="Toggle theme">
  <Sun className="h-4 w-4" />
</Button>

// Loading state
<Spinner aria-label="Loading" role="status" />

// Toggle state
<Button
  aria-pressed={isActive}
  onClick={() => setIsActive(!isActive)}
>
  {isActive ? "On" : "Off"}
</Button>
```

### Chart Accessibility
- Provide text alternatives for visual data
- Support keyboard navigation in chart controls
- Announce price updates to screen readers for live data

---

## Responsive Design

### Breakpoint Strategy
Mobile-first approach with Tailwind breakpoints:

| Breakpoint | Width | Usage |
|------------|-------|-------|
| Default | <640px | Mobile phones |
| `sm:` | ≥640px | Large phones |
| `md:` | ≥768px | Tablets |
| `lg:` | ≥1024px | Desktops |
| `xl:` | ≥1280px | Large desktops |

### Responsive Patterns

```tsx
// Stacking on mobile, row on desktop
<div className="flex flex-col md:flex-row gap-4">

// Grid with responsive columns
<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">

// Wrapping button groups
<div className="flex items-center gap-2 flex-wrap">
```

### Chart Responsiveness
- Charts use `autoSize` to fill container
- Minimum height of 400px for usability
- Control bars wrap on narrow screens

---

## Component Patterns

### Card Pattern
For grouped content with a heading:

```tsx
<div className="p-4 rounded-lg bg-card border space-y-4">
  <div className="flex items-center justify-between">
    <h3 className="font-semibold">{title}</h3>
    <div className="flex gap-2">{actions}</div>
  </div>
  {children}
</div>
```

### Control Bar Pattern
For horizontal option groups:

```tsx
<div className="flex items-center gap-2 flex-wrap">
  <span className="text-sm text-muted-foreground mr-2">{label}:</span>
  {options.map((option) => (
    <Button
      key={option.value}
      variant={selected === option.value ? "default" : "outline"}
      size="sm"
      onClick={() => onSelect(option.value)}
    >
      {option.label}
    </Button>
  ))}
</div>
```

### Info Box Pattern
For contextual information:

```tsx
<div className="p-4 rounded-lg bg-blue-500/10 border border-blue-500/30">
  <h3 className="font-semibold text-blue-400 mb-2">{title}</h3>
  <p className="text-sm text-muted-foreground">{content}</p>
</div>
```

### Summary Bar Pattern
For key metrics display:

```tsx
<div className="flex items-center gap-6 p-4 rounded-lg bg-card border">
  <div>
    <span className="text-muted-foreground text-sm">{label}</span>
    <p className="text-xl font-bold font-mono">{value}</p>
  </div>
  {/* More metrics... */}
</div>
```

---

## Checklist for New Features

Before shipping, verify:

- [ ] Uses design system colors (no hardcoded values)
- [ ] Spacing follows the scale (gap-2, gap-4, gap-6)
- [ ] Prices displayed in mono font
- [ ] Buy/sell colors used only for trading meaning
- [ ] Loading states for async operations
- [ ] Error states with recovery options
- [ ] Keyboard navigable
- [ ] Works in both light and dark themes
- [ ] Responsive on mobile
- [ ] Consistent with existing patterns

---

## Related Documentation

- [Frontend Design System ADR](../adr/20251230-frontend-design-system.md)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Components](https://ui.shadcn.com/)
- [Radix UI Accessibility](https://www.radix-ui.com/primitives)
