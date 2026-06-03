# UX_DECISIONS.md

# Domus UX Decisions

This document contains the UX rationale and product decisions made throughout the design process.

It complements:

* AGENTS.md
* DESIGN.md

DESIGN.md defines how Domus looks.

This document explains why certain UX decisions were made.

---

# Product Vision

Domus is not a productivity app.

Domus is not a task manager.

Domus is a household coordination application.

The goal is to reduce household friction through:

* visibility
* collaboration
* fairness
* simplicity

The application should help household members understand:

* what needs to be done
* who is responsible
* what has already been completed

without requiring complex workflows.

---

# Target Users

Primary users:

* families
* couples
* roommates
* students sharing a household

Research indicates that households generally contain a small number of members.

UX decisions should prioritize:

* simplicity
* clarity
* mobile usability

over scalability for large organizations.

---

# Accessibility

Accessibility is a thesis evaluation criterion.

WCAG 2.1 compliance should be considered in all screens.

Priorities:

* contrast
* readability
* touch target size
* cognitive load reduction

Accessibility takes priority over visual effects.

---

# Navigation Philosophy

Navigation should remain simple.

Avoid:

* nested tabs
* complex dashboards
* enterprise navigation systems

Primary navigation:

* Home
* Tasks
* Create Task
* Statistics
* Profile

The Create Task action is the primary action of the application.

It should appear as the center action in the bottom navigation.

Do not use floating action buttons.

---

# Household Switching

Users may belong to multiple households.

The active household should always be visible.

Pattern:

House Name ▼

Selecting it opens a bottom sheet.

The household selector should not look like:

* a traditional select
* a form input

Instead it should resemble a workspace switcher.

Inspired by:

* Notion
* Slack
* Discord

---

# Home Screen

Purpose:

"What should I do next?"

The Home screen focuses on the authenticated user's responsibilities.

Show:

* active household
* greeting
* household summary
* upcoming tasks
* recent activity

The Home screen should not attempt to show every task in the household.

Limit visible tasks to a small number.

Prioritize:

* immediate action
* low cognitive load

---

# Tasks Screen

Purpose:

"What is happening in the household?"

The Tasks screen provides visibility into all household tasks.

Task grouping:

* Today
* Upcoming
* Completed

Completed tasks:

* appear last
* are collapsed by default
* have lower visual emphasis

Tasks are not grouped by responsible person.

The responsible member should remain visible inside each task card.

---

# Task Cards

Task cards should remain compact.

Display:

* task title
* responsible member
* due date
* recurrence indicator

Do not display excessive metadata.

The card should prioritize scanning speed.

---

# Task Completion

Home screen:

Users may complete tasks quickly.

Tasks screen:

Task completion is handled through task details.

Task cards:

* open detail view when tapped

Avoid multiple completion patterns.

---

# Task Deletion

Tasks screen:

Swipe to delete is allowed.

Editing should happen inside task details.

Do not support inline editing.

---

# Task Creation

Primary goal:

Create tasks quickly.

Task creation should feel lightweight.

Avoid enterprise-style forms.

---

## Primary Fields

Always visible:

* task name
* due date
* frequency

These fields represent the minimum information required to create a task.

---

## Secondary Fields

Hidden behind:

"More options"

Include:

* responsible member
* description

Use progressive disclosure.

---

## Frequency

Frequency options:

* Daily
* Weekly
* Monthly

Use segmented pills.

Do not use:

* radio buttons
* dropdowns

Reason:

Faster interaction and lower cognitive load.

---

## Due Date

Use:

* compact field
* bottom-sheet calendar

Avoid:

* large inline calendars

Reason:

Preserves screen space and maintains simplicity.

---

## Responsible Assignment

Default:

Automatic

Users may manually choose a household member.

The algorithm should remain invisible.

Do not expose assignment logic.

The system should feel helpful, not technical.

---

# Household Collaboration

Domus prioritizes transparency.

Users should be able to see:

* who completed tasks
* who is responsible
* recent household activity

Activity feeds should remain compact.

Avoid social-media patterns.

---

# Statistics

Statistics should focus on:

* progress
* completion history
* household participation

Overdue tasks may be surfaced here.

The Home screen should prioritize future actions.

Statistics should prioritize historical insight.

---

# Empty States

Empty states should feel:

* positive
* encouraging
* calm

Examples:

* No pending tasks
* Household is up to date

The mascot may appear here.

Avoid gamification.

---

# Mascot

The mascot is a supporting element.

It should never become the primary focus of the interface.

Allowed usage:

* onboarding
* empty states
* lightweight positive feedback

Avoid:

* constant animations
* attention-seeking behavior

---

# Motion

Motion should be subtle.

Allowed:

* bottom sheets
* collapsible sections
* small transitions

Avoid:

* heavy animation systems
* excessive motion
* gamification effects

---

# Product Personality

Domus should feel:

* calm
* collaborative
* friendly
* human
* accessible

Domus should never feel:

* enterprise
* corporate
* fintech
* gaming-focused
* childish

When in doubt:

Choose simplicity over features.

Choose clarity over decoration.

Choose accessibility over visual effects.
