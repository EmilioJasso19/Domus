# AGENTS.md

# Domus Mobile

Agent instructions for the Domus mobile application.

---

## Project Overview

Domus is a household organization mobile application.

Purpose:

* household coordination
* shared task management
* family and roommate collaboration
* responsibility distribution

This project prioritizes:

* accessibility
* simplicity
* maintainability
* consistency

Visual and UX decisions are defined in:

```text
DESIGN.md
```

Always consult DESIGN.md before creating:

* screens
* components
* layouts
* forms
* interactions

---

## Tech Stack

Frontend:

* React Native
* Expo
* Expo Router
* NativeWind
* Zustand
* React Hook Form
* Zod
* TypeScript

Package manager:

* pnpm

Backend:

* NestJS
* PostgreSQL

---

## Commands

Install dependencies:

```bash
pnpm install
```

Run development server:

```bash
pnpm start
```

Run lint:

```bash
pnpm lint
```

Run tests:

```bash
pnpm test
```

---

## Routing

Use Expo Router.

Follow the existing route structure.

Do not introduce alternative navigation patterns.

Before changing navigation:

* inspect current routes
* reuse existing navigation flows

---

## State Management

Use Zustand.

Reuse existing stores whenever possible.

Do not introduce:

* Redux
* MobX
* alternative global state libraries

---

## Forms

Use:

* React Hook Form
* Zod

Maintain consistency with existing forms.

Reuse shared form components whenever possible.

---

## API Layer

Follow the existing module structure.

Do not call APIs directly from screens.

Keep API requests inside feature modules.

Reuse:

* API services
* DTOs
* shared types

whenever possible.

---

## Components

Before creating a new component:

1. Search for an existing shared component.
2. Reuse it if possible.
3. Extend it only when necessary.

Avoid duplicate UI patterns.

---

## Styling

Use NativeWind as the default styling solution.

Prefer:

* utility classes
* reusable components
* shared spacing patterns

Maintain consistency with DESIGN.md.

---

## NativeWind Restrictions

IMPORTANT

Do NOT use NativeWind utilities for:

* shadow-*
* opacity-*
* bg-color/opacity shorthand
* text-color/opacity shorthand

Examples:

```tsx
shadow-sm
shadow-md
opacity-50
bg-white/20
text-white/80
```

Reason:

These utilities have previously caused Expo Router navigation context issues in this project.

Use React Native style objects instead.

Example:

```tsx
style={{
  opacity: 0.5,
}}
```

```tsx
style={{
  shadowOffset: { width: 0, height: 2 },
  shadowOpacity: 0.08,
  shadowRadius: 8,
}}
```

Always use style={{}} for:

* shadows
* opacity
* rgba colors

---

## Accessibility

WCAG 2.1 compliance is required.

Always:

* maintain sufficient contrast
* use accessible touch targets
* avoid dense layouts
* reduce cognitive load
* prioritize readability

Accessibility is more important than visual effects.

---

## Architecture

Follow the existing project structure.

Keep code organized by feature.

Do not introduce new architectural patterns unless explicitly requested.

Prefer:

* small reusable functions
* feature-based organization
* strongly typed code

Avoid:

* unnecessary abstractions
* premature optimization
* duplicated logic

---

## Dependencies

Before adding a dependency:

1. Verify that the functionality does not already exist.
2. Prefer existing project libraries.
3. Minimize bundle growth.

Do not add dependencies without clear justification.

---

## Task Completion Checklist

Before finishing any implementation:

* TypeScript compiles correctly
* Expo Router navigation still works
* Existing components were reused when possible
* DESIGN.md requirements were followed
* Accessibility was considered
* No prohibited NativeWind utilities were introduced
* No unnecessary dependencies were added

A task is not complete until all checklist items pass.

## Product Strategy

DomusChores is an academic MVP developed by a single developer under strict time and infrastructure constraints.

The primary goal is NOT to build a feature-complete household management platform.

The core value proposition is:

- Formal household task organization
- Fair and transparent automatic task assignment
- Reduction of invisible mental load in shared homes

The product should prioritize:
1. Simplicity
2. Delivery speed
3. Maintainability
4. Clear UX
5. Core fairness mechanics

The application should avoid unnecessary complexity, premature scalability, or enterprise-oriented abstractions.

When making architectural or implementation decisions:
- Prefer simpler solutions over theoretically perfect ones
- Avoid overengineering
- Prioritize working software over feature breadth
- Preserve modularity but avoid microservice-level complexity
- Prefer deterministic business logic over AI-based approaches

The algorithmic task assignment system is the primary differentiator of the product and should receive higher implementation priority than engagement or cosmetic features.

## MVP Priorities

Highest priority features:
- Authentication
- Household creation/joining
- Task CRUD
- Automatic task assignment
- Task completion tracking

Medium priority:
- Task preferences
- Availability blocking
- Push notifications

Low priority / Post-MVP:
- Advanced analytics
- Complex gamification
- Virtual pet evolution system
- Social features
- AI integrations
- Advanced customization

## Engineering Constraints

The project is maintained by a single developer.

The backend uses:
- NestJS
- PostgreSQL
- TypeORM
- Modular monolith architecture

Frontend:
- React Native
- Expo

Package manager:
- pnpm

Agents should:
- Avoid introducing unnecessary dependencies
- Avoid premature abstractions
- Prefer explicit code over highly generic solutions
- Prefer maintainable implementations over clever implementations
- Keep modules cohesive and small
- Respect Clean Architecture boundaries already established

## Anti-Goals

Do NOT:
- Introduce microservices
- Introduce event-driven architecture unless strictly necessary
- Add CQRS unless explicitly requested
- Add Redis/Kafka/RabbitMQ unless required
- Create generic frameworks inside the project
- Add complex state machines
- Add advanced DDD patterns without explicit need
- Optimize for massive scale