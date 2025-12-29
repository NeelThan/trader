# Use Log4brains to manage ADRs

- Status: accepted
- Deciders: Team
- Date: 2025-12-29
- Tags: documentation, architecture

## Context and Problem Statement

We need a way to document and track architecture decisions made during the development of this project. How should we manage Architecture Decision Records (ADRs)?

## Decision Drivers

- Need a structured way to document decisions
- Want to be able to preview and build a static site for ADRs
- Should integrate well with the existing project structure
- Must be easy to use and maintain

## Considered Options

- Use Log4brains
- Use plain Markdown files with manual numbering
- Use adr-tools

## Decision Outcome

Chosen option: "Use Log4brains", because it provides a CLI for managing ADRs, supports previewing as a static site, and follows the MADR format which is well-documented and widely used.

### Positive Consequences

- Standardized format for all ADRs
- Easy to create new ADRs via CLI
- Can generate a browsable static site
- Integrates well with Git workflow

### Negative Consequences

- Adds a dev dependency to the project
- Team members need to learn the log4brains CLI

## Pros and Cons of the Options

### Use Log4brains

- Good, because it provides CLI commands for creating and managing ADRs
- Good, because it can generate a static site for browsing decisions
- Good, because it follows the MADR format
- Bad, because it adds dependencies to the project

### Use plain Markdown files with manual numbering

- Good, because no dependencies required
- Good, because simple to understand
- Bad, because no tooling for consistency
- Bad, because manual numbering is error-prone

### Use adr-tools

- Good, because it's a mature tool
- Good, because lightweight (bash scripts)
- Bad, because no built-in static site generation
- Bad, because less active maintenance

## Links

- [Log4brains documentation](https://github.com/thomvaill/log4brains)
- [MADR format](https://adr.github.io/madr/)
