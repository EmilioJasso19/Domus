# API_CONTRACTS.md

# Domus API Contracts

Shared API integration rules and conventions for the Domus monorepo.

This document exists to:

* maintain frontend/backend consistency
* prevent contract drift
* reduce duplicated type definitions
* guide AI agents when integrating APIs
* preserve predictable API behavior

This is NOT intended to be a complete manual API specification.

The backend codebase is the source of truth.

---

# Source of Truth

The NestJS backend implementation is the canonical source of truth.

Before:

* consuming APIs
* creating frontend types
* modifying response structures
* introducing new fields
* implementing integrations

agents must inspect:

* controllers
* DTOs
* entities
* services

inside the corresponding backend module.

Do NOT assume:

* field names
* endpoint structures
* response shapes
* nested objects
* optional properties

based only on frontend usage or previous implementations.

---

# Architecture

Backend:

* NestJS
* PostgreSQL
* TypeORM
* Modular monolith architecture

Frontend:

* React Native
* Expo
* Zustand

Package manager:

* pnpm

---

# API Design Philosophy

The API should prioritize:

1. Simplicity
2. Predictability
3. Explicitness
4. Maintainability

Avoid:

* unnecessary abstraction
* deeply nested responses
* inconsistent naming
* overengineered patterns
* premature scalability optimizations

The project is an academic MVP maintained by a single developer.

---

# Route Conventions

Use:

* plural resource naming
* kebab-case or lowercase routes
* REST-style endpoints

Examples:

```text
/auth/login
/homes
/tasks
/preferences
```

Prefer:

```text
GET /tasks
POST /tasks
PATCH /tasks/:id
DELETE /tasks/:id
```

Avoid:

* deeply nested routes
* RPC-style naming
* inconsistent route patterns

---

# DTO Rules

Use explicit DTOs.

DTOs should:

* use class-validator
* reflect actual payloads
* remain small and focused
* avoid excessive inheritance chains

Avoid:

* generic DTO systems
* highly abstract base DTOs
* implicit transformations

Frontend types should be derived from existing backend DTOs and responses whenever possible.

Avoid creating duplicated or parallel contract definitions unless explicitly necessary.

---

# Response Philosophy

Responses should remain:

* predictable
* lightweight
* stable

Avoid:

* exposing raw internal entities
* leaking implementation details
* unnecessary nesting

When changing responses:

1. preserve backward compatibility when possible
2. update frontend integrations
3. avoid unnecessary breaking changes

---

# Error Handling

Use standard HTTP status codes.

Frontend should rely primarily on:

* HTTP status codes
* stable error message fields

Avoid:

* inconsistent error structures
* HTML responses
* exposing stack traces

---

# Authentication

Authentication uses JWT.

Frontend responsibilities:

* store token securely
* attach Bearer token to authenticated requests
* clear token during logout

Backend responsibilities:

* validate JWTs
* protect routes
* enforce authorization
* avoid exposing sensitive information

---

# Business Logic Ownership

Business logic belongs to the backend.

The frontend must NOT:

* reproduce assignment calculations
* enforce authorization rules
* simulate fairness logic
* infer hidden business state
* duplicate backend validation logic

The frontend is responsible for:

* presentation
* local UI state
* optimistic UI only when explicitly safe
* displaying backend results

---

# Assignment Algorithm

The automatic assignment algorithm is the primary differentiator of Domus.

Assignment behavior must remain:

* deterministic
* predictable
* maintainable
* backend-controlled

Frontend should only display:

* assignment results
* assignment status
* explanation-friendly information when available

Do NOT implement assignment calculations in the frontend.

---

# Module Integration Workflow

Before implementing frontend/backend integrations:

1. Inspect the backend module structure
2. Inspect controllers
3. Inspect DTOs
4. Inspect entities only when necessary
5. Reuse existing response structures
6. Reuse existing API services whenever possible

Avoid:

* inventing undocumented endpoints
* assuming response fields
* creating duplicate integration layers

---

# Mock Data Rules

If backend endpoints do not yet exist:

* use isolated mocked frontend data
* clearly label mocked implementations
* structure mocked data for easy future replacement

Do NOT:

* silently invent API contracts
* create undocumented backend behavior
* tightly couple UI to temporary mocked structures

---

# Frontend API Layer Rules

Frontend API access should remain centralized.

Do:

* keep API logic inside services/modules
* reuse shared request utilities
* reuse shared types when possible

Avoid:

* direct fetch calls inside screens
* duplicated endpoint strings
* mixing networking logic with UI logic

---

# State Management Rules

Global state should remain minimal and explicit.

Use:

* Zustand stores
* feature-oriented organization

Avoid:

* duplicating backend state unnecessarily
* caching excessive server state
* introducing alternative state management libraries

---

# Performance Philosophy

This MVP prioritizes:

1. Maintainability
2. Simplicity
3. Delivery speed
4. Predictability

NOT:

* massive scale
* enterprise infrastructure
* hyper-optimized architectures

Avoid premature optimization.

---

# AI Agent Guidelines

Agents should:

* inspect existing backend modules before implementing integrations
* reuse existing DTOs and services
* preserve architectural consistency
* avoid introducing unnecessary abstractions

Do NOT:

* introduce GraphQL
* introduce CQRS
* introduce event sourcing
* introduce microservices
* create generic integration frameworks
* redesign existing API patterns without explicit request

When uncertain:

* inspect the existing implementation first
* prefer consistency over novelty
* prefer explicit code over clever abstractions
