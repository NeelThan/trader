# Use Tailwind CSS, shadcn/ui, and Storybook for Frontend Design System

- Status: accepted
- Deciders: Development team
- Date: 2025-12-30
- Tags: frontend, design-system, components, styling

Technical Story: Establish a consistent, reusable component library before building frontend features to enforce UI patterns and enable component-based micro frontend development.

## Context and Problem Statement

We need to build a frontend for the Fibonacci trading platform. Before implementing features, we must establish a design system and component library. What technologies should we use for styling, component primitives, and documentation?

## Decision Drivers

- **Reusability**: Components must be easily reusable across the application
- **Maintainability**: Code should be easy to understand and modify
- **Developer Experience**: Fast development with good tooling
- **Consistency**: Enforce design patterns across the application
- **Accessibility**: Components must be accessible by default
- **Theme Support**: Must support dark and light modes
- **Documentation**: Components need interactive documentation

## Considered Options

### Styling
- Tailwind CSS (utility-first CSS framework)
- CSS-in-JS (styled-components, emotion)
- CSS Modules
- Vanilla CSS/SCSS

### Component Library
- shadcn/ui (Radix UI + Tailwind, copy-paste model)
- Material UI (Google's component library)
- Chakra UI (accessible components + theming)
- Custom components from scratch

### Documentation
- Storybook (industry standard component explorer)
- Docz
- Custom documentation site
- No dedicated documentation

## Decision Outcome

**Styling**: Tailwind CSS
**Component Library**: shadcn/ui
**Documentation**: Storybook
**Theme**: Both dark and light modes using CSS variables + next-themes

### Positive Consequences

- Full ownership of component code (copy-paste model)
- Excellent accessibility via Radix UI primitives
- Consistent styling with Tailwind utility classes
- Interactive component documentation with Storybook
- Easy theme customisation via CSS variables
- Strong TypeScript support
- Large community and ecosystem

### Negative Consequences

- Initial setup complexity for Storybook integration
- Learning curve for Tailwind utility classes
- Must maintain components ourselves (no automatic updates)

## Pros and Cons of the Options

### Tailwind CSS

Utility-first CSS framework with pre-designed classes.

- Good, because utility classes enable rapid prototyping
- Good, because tree-shaking removes unused styles
- Good, because design tokens are built-in (spacing, colours)
- Good, because excellent IDE support with IntelliSense
- Bad, because HTML can become cluttered with many classes
- Bad, because learning curve for developers new to utility-first

### CSS-in-JS (styled-components)

CSS written in JavaScript with component scoping.

- Good, because styles are co-located with components
- Good, because dynamic styling based on props
- Bad, because runtime overhead for style generation
- Bad, because larger bundle size
- Bad, because SSR complexity

### shadcn/ui

Copy-paste component library built on Radix UI and Tailwind.

- Good, because full code ownership (not a dependency)
- Good, because Radix UI provides excellent accessibility
- Good, because highly customisable
- Good, because "New York" style is modern and clean
- Good, because CLI tool for easy component installation
- Bad, because must maintain components ourselves
- Bad, because no automatic updates

### Material UI

Google's component library for React.

- Good, because comprehensive component set
- Good, because well-documented
- Good, because automatic updates
- Bad, because opinionated Google aesthetic
- Bad, because large bundle size
- Bad, because less customisation flexibility

### Chakra UI

Accessible component library with theming.

- Good, because built-in accessibility
- Good, because easy theming
- Good, because good TypeScript support
- Bad, because less flexible than shadcn/ui
- Bad, because dependency on library updates
- Bad, because performance overhead

### Storybook

Interactive component documentation and development environment.

- Good, because industry standard for component documentation
- Good, because supports addons (accessibility, dark mode)
- Good, because component isolation for development
- Good, because visual regression testing integration
- Bad, because additional build configuration
- Bad, because can slow down development server

## Links

- Relates to [20251229-use-python-fastapi-nextjs-tradingview.md](20251229-use-python-fastapi-nextjs-tradingview.md)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [shadcn/ui Documentation](https://ui.shadcn.com/)
- [Radix UI Primitives](https://www.radix-ui.com/)
- [Storybook for Next.js](https://storybook.js.org/docs/get-started/nextjs)
