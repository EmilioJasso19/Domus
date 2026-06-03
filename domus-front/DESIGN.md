# DESIGN.md

# Domus Design System

## Product Overview

Domus is a household organization mobile application designed for:

* families
* roommates
* couples
* shared homes

The application focuses on:

* household coordination
* task assignment
* shared visibility
* fair responsibility distribution
* reducing mental load

---

# Brand Personality

Domus should feel:

* Calm
* Collaborative
* Friendly
* Human
* Accessible
* Modern
* Minimal

The experience should feel like:

> "A calm household organizer that helps people coordinate responsibilities together."

---

# Never Feel Like

Avoid interfaces that feel:

* Enterprise
* Corporate
* SaaS Dashboard
* Finance App
* Fintech
* Gaming Platform
* Childish
* Overly playful
* Productivity power-user software

---

# Design Principles

## Reduce Cognitive Load

Users should understand each screen within seconds.

Prefer:

* clear hierarchy
* whitespace
* progressive disclosure
* obvious actions

Avoid:

* dense layouts
* excessive metrics
* overwhelming dashboards

---

## Collaboration First

The application is collaborative.

Users should understand:

* who is responsible
* what is pending
* what has been completed

without needing complex navigation.

---

## Accessibility First

WCAG 2.1 compliance is mandatory.

Always prioritize:

* readability
* contrast
* touch target size
* clarity

Accessibility is more important than decoration.

---

# Color System

## Background

Primary Background

```text
#FAFAF8
```

Used for:

* screen backgrounds
* large surfaces

---

## Primary

```text
#3A63FA
```

Used for:

* primary CTA
* active states
* selected filters
* important actions

---

## Success

```text
#1A7330
```

Used for:

* completed tasks
* confirmations
* success states

---

## Error

```text
#DC2626
```

Used for:

* validation errors
* destructive actions

---

## Neutral Scale

```text
#111827
#374151
#6B7280
#D1D5DB
#F3F4F6
```

Used for:

* typography
* borders
* secondary content

---

# Typography

## Primary Typeface

Nunito

Domus uses Nunito as the only font family.

Reasons:

* approachable
* friendly
* highly readable
* family-oriented
* modern without feeling corporate

---

## NativeWind Font Classes

Use only:

```tsx
font-nunito-light
font-nunito-regular
font-nunito-medium
font-nunito-semibold
font-nunito-bold
font-nunito-extrabold
```

Never introduce:

* Manrope
* Inter
* Poppins
* additional font families

---

## Typography Scale

Headline Large

* 32px
* font-nunito-bold

Headline Medium

* 24px
* font-nunito-bold

Headline Small

* 20px
* font-nunito-semibold

Body Large

* 18px
* font-nunito-regular

Body Medium

* 16px
* font-nunito-regular

Body Small

* 14px
* font-nunito-regular

Label Medium

* 14px
* font-nunito-semibold

Label Small

* 12px
* font-nunito-medium

---

# Spacing

Use an 8px spacing system.

Preferred spacing values:

```text
4
8
12
16
24
32
40
48
64
```

Generous whitespace is preferred.

Avoid dense layouts.

---

# Border Radius

Small

```text
12px
```

Medium

```text
16px
```

Large

```text
24px
```

Cards and inputs should feel soft and approachable.

Avoid sharp corners.

---

# Elevation

Use very subtle shadows.

Cards should feel elevated without appearing heavy.

Avoid strong Material Design shadows.

---

# Forms

Forms should remain consistent across:

* Login
* Register
* Household Setup
* Create Task

Requirements:

* large touch targets
* generous spacing
* simple validation
* minimal visual noise

---

# Buttons

Primary Button

Used for:

* Create account
* Login
* Create task
* Confirm actions

Characteristics:

* high contrast
* rounded corners
* strong visibility

---

Secondary Button

Used for:

* alternative actions
* dismiss actions

Should never visually compete with primary actions.

---

# Inputs

Use:

* rounded corners
* subtle borders
* large touch targets

Avoid:

* heavy shadows
* dense form controls

---

# Cards

Cards are used for:

* tasks
* summaries
* activity items

Characteristics:

* lightweight
* breathable
* highly scannable

Avoid:

* dashboard-style complexity
* excessive metadata

---

# Household Selector Pattern

Display the active household at the top.

Example:

```text
Casa Jasso ▼
```

Do not use traditional select inputs.

Use a workspace-switcher pattern.

Tapping opens a bottom sheet.

The bottom sheet contains:

* available households
* create household
* join household

---

# Home Screen Pattern

Purpose:

```text
What should I do next?
```

Show:

* active household
* greeting
* household summary
* upcoming tasks
* recent activity

Prioritize:

* immediate action
* task visibility

---

# Tasks Screen Pattern

Purpose:

```text
What is happening in the household?
```

Sections:

* Today
* Upcoming
* Completed

Completed section:

* collapsed by default
* lower visual emphasis

Task cards:

* compact
* collaborative
* highly scannable

---

# Create Task Pattern

Primary fields:

* task name
* due date
* frequency

Secondary fields:

* responsible
* description

Use progressive disclosure.

---

## Frequency Selector

Use segmented pills.

Options:

* Daily
* Weekly
* Monthly

Never use:

* radio buttons
* dropdowns

---

## Due Date

Use a compact input.

Open a bottom-sheet calendar picker.

Avoid large inline calendars.

---

## Responsible Assignment

Default option:

```text
Automatic
```

Additional options:

* household members

Use horizontal member chips.

The algorithm should remain invisible.

Do not expose technical details.

---

# Empty States

Empty states should feel:

* positive
* calm
* encouraging

Examples:

```text
No pending tasks 🎉
```

```text
Your household is up to date
```

Mascot illustrations are allowed only in empty states.

---

# Motion

Use subtle motion only.

Allowed:

* bottom sheets
* collapsible sections
* lightweight transitions

Avoid:

* heavy animations
* gamification effects
* excessive motion

---

# Mascot

The mascot should support the experience.

Use it:

* onboarding
* empty states
* positive feedback

Do not make it the focus of the interface.

---

# Do Not

Never:

* use glassmorphism
* use strong gradients
* use enterprise dashboards
* use Kanban boards
* use excessive charts
* create dense screens
* create complex filters
* overload users with information

When unsure:

Choose clarity over decoration.
Choose simplicity over features.
Choose accessibility over visual effects.
