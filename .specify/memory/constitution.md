<!--
Sync Impact Report:
- Version change: 0.0.0 (initial) → 1.0.0
- Initial ratification with 10 core principles
- Focus areas: Code quality (I, II, III), Testing standards (IV, V), UX consistency (VI, VII), Performance (VIII), Workflow (IX, X)
- Added sections: Quality Gates, Review Standards, Governance
- Templates requiring updates:
  ✅ Updated: constitution.md (this file)
  ✅ Updated: plan-template.md (Constitution Check with all 10 principles)
  ✅ Updated: spec-template.md (Constitutional Considerations section added)
  ✅ Updated: tasks-template.md (Constitutional Verification quality gates added)
- Follow-up TODOs: None
-->

# OpenBox Constitution

## Core Principles

### I. Code Readability - Human-First Code (NON-NEGOTIABLE)

**Rule**: Code MUST be optimized for human understanding, not machine execution or developer cleverness.

**Requirements**:
- Self-documenting code: descriptive names for variables, functions, classes
- NO abbreviations unless universally understood (e.g., `url`, `http`, `id`)
- Functions MUST do ONE thing, with clear name describing that thing
- Maximum function length: 50 lines (extract helpers if longer)
- Maximum file length: 300 lines (split into modules if longer)
- Comments explain "why" and "trade-offs", NOT "what" (code shows what)
- NO magic numbers - use named constants with descriptive names
- Consistent formatting via automated tools (Prettier, ESLint, Solhint)

**Rationale**: Code is read 10x more than written. Readable code reduces bugs, accelerates onboarding, and enables confident changes.

### II. Type Safety - Compile-Time Error Prevention (NON-NEGOTIABLE)

**Rule**: Types MUST be explicit, enforced at compile time, and never circumvented.

**Requirements**:
- **TypeScript**: Strict mode enabled (`strict: true` in tsconfig.json)
- NO `any` types without documented justification and approval
- Use `unknown` for truly dynamic data, narrow with type guards
- **Solidity**: Explicit types for all variables, NO implicit conversions
- Interface-first design: define contracts before implementation
- Shared types in `packages/types/` - single source of truth
- Generate types from schemas (ABIs → TypeScript, OpenAPI → types)
- Union types preferred over error-prone conditionals
- Readonly by default, mutable only when necessary

**Rationale**: Type errors caught at compile time never reach users. Strong types serve as executable documentation.

### III. Code Review Excellence - Quality Through Collaboration

**Rule**: ALL code changes require peer review before merge, focusing on correctness, clarity, and maintainability.

**Requirements**:
- **PR Size**: Maximum 400 lines changed (split large features into smaller PRs)
- **PR Description**: Links to spec.md, explains what/why, lists testing done
- **Review Checklist**:
  - [ ] Code follows principles I (Readability) and II (Type Safety)
  - [ ] Tests exist and pass (see Principle IV)
  - [ ] No secrets, API keys, or hardcoded config
  - [ ] Error handling is comprehensive (no silent failures)
  - [ ] Performance considerations addressed (see Principle VIII)
  - [ ] UX consistency maintained (see Principles VI-VII)
- At least ONE approving review required
- Author MUST respond to all review comments (resolve or explain)
- Automated checks MUST pass: linting, type checking, tests, build

**Rationale**: Peer review catches bugs, shares knowledge, maintains consistency, and prevents technical debt accumulation.

### IV. Test Coverage - Confidence Through Verification (NON-NEGOTIABLE)

**Rule**: All business logic, APIs, and user-facing features MUST have automated tests before merge.

**Requirements**:
- **Minimum Coverage**: 80% line coverage for business logic
- **Test Pyramid**:
  - **Unit tests** (70%): Pure functions, utilities, business logic
  - **Integration tests** (20%): API endpoints, database operations, service interactions
  - **Contract tests** (5%): API contracts, smart contract interfaces
  - **E2E tests** (5%): Critical user flows only
- **Smart Contracts**: 100% function coverage (Foundry tests)
- Test file naming: `*.test.ts`, `*.spec.ts`, `*.t.sol`
- Tests MUST be deterministic (no flaky tests tolerated)
- Tests MUST be fast (unit: <100ms, integration: <1s, E2E: <10s)
- Mock external dependencies (APIs, blockchain, databases)
- Test edge cases and failure modes, not just happy path

**Rationale**: Comprehensive tests enable confident refactoring, catch regressions, and document expected behavior.

### V. Test-First Mindset - Design Through Testing

**Rule**: Tests SHOULD be written before or alongside implementation, NOT as an afterthought.

**Requirements**:
- **TDD Encouraged** (not mandatory): Write test → Red → Implement → Green → Refactor
- **Test-After Acceptable**: Implementation and tests reviewed together
- Tests MUST exist before PR approval (no "I'll add tests later")
- Acceptance criteria from spec.md → test scenarios
- Test names describe behavior: `should_reject_invalid_email` not `test_email`
- Integration tests validate user stories from spec.md
- Tests serve as living documentation of requirements
- When fixing bugs: Write failing test reproducing bug → Fix → Test passes

**Rationale**: Test-first design leads to more testable, modular code. Tests become specification and safety net.

### VI. UX Consistency - Predictable User Experience (NON-NEGOTIABLE)

**Rule**: User interface patterns, terminology, and behaviors MUST be consistent across the entire application.

**Requirements**:
- **Design System**: Shared component library in `frontend/src/components/`
- **Visual Consistency**:
  - Unified color palette, typography, spacing system
  - Consistent button styles, form inputs, modals, notifications
  - Responsive design breakpoints standardized
- **Terminology Consistency**: Use same terms across UI (not "delete" in one place, "remove" in another)
- **Interaction Patterns**:
  - Loading states for all async operations
  - Error messages actionable (tell user what to do, not just what failed)
  - Success feedback for all state-changing actions
  - Confirmation dialogs for destructive operations
- **Accessibility**:
  - Semantic HTML, ARIA labels where needed
  - Keyboard navigation for all interactive elements
  - Color contrast ratios meet WCAG AA standards
- NO custom components when design system component exists

**Rationale**: Consistency reduces cognitive load, builds user trust, and accelerates development through reuse.

### VII. User Feedback - Never Leave Users Guessing

**Rule**: Application MUST provide clear, immediate feedback for every user action and system state.

**Requirements**:
- **Loading States**: Skeletons, spinners, or progress indicators for all operations >200ms
- **Error Messages**:
  - User-friendly language (not technical jargon or stack traces)
  - Explain what happened and what user should do
  - Smart contract errors translated to human language
- **Success Confirmation**: Toast, modal, or visual feedback for completed actions
- **Form Validation**:
  - Real-time validation as user types (not just on submit)
  - Clear error messages next to problematic fields
  - Disable submit until form is valid
- **Empty States**: Helpful messages when no data (not blank screens)
- **Progressive Disclosure**: Show advanced options only when needed
- **Transaction Status**: Clear feedback for blockchain transactions (pending, confirmed, failed)

**Rationale**: Clear feedback prevents user confusion, reduces support burden, and improves perceived performance.

### VIII. Performance Standards - Fast, Efficient, Scalable

**Rule**: Application MUST meet defined performance thresholds; degradation is treated as a bug.

**Requirements**:
- **Frontend Performance**:
  - Initial page load: <3s on 3G connection
  - Time to Interactive (TTI): <5s
  - First Contentful Paint (FCP): <1.5s
  - Lighthouse score: >90 for Performance
  - No layout shifts (CLS <0.1)
  - Image optimization: WebP/AVIF, lazy loading, responsive sizes
- **Backend Performance**:
  - API response time: <200ms p95 (excluding external calls)
  - Database queries: <100ms p95
  - Implement pagination for lists >100 items
  - Rate limiting on public endpoints
- **Smart Contract Efficiency**:
  - Gas optimization: minimize storage writes, use events
  - Batch operations where possible
  - No unbounded loops
- **Monitoring**: Performance metrics tracked in production, alerts on degradation

**Rationale**: Performance is a feature. Slow applications frustrate users, cost money, and damage reputation.

### IX. Specification-First Workflow - Think Before Building

**Rule**: Every feature MUST begin with written specification before planning or coding.

**Requirements**:
- Use `/speckit-specify` to create `spec.md` from natural language
- Specification MUST include:
  - Prioritized user stories (P1, P2, P3) with acceptance criteria
  - Functional requirements (FR-001, FR-002, etc.)
  - Success metrics (measurable outcomes)
  - Assumptions and scope boundaries
- Each user story MUST be independently testable
- Mark unclear requirements: `[NEEDS CLARIFICATION: reason]`
- Use `/speckit-clarify` to resolve ambiguities
- NO planning or coding without approved spec.md
- Spec reviewed by stakeholders before proceeding

**Rationale**: Clear specifications prevent building wrong thing, reduce rework, and align team expectations.

### X. Task-Driven Execution - Structured Implementation

**Rule**: Implementation MUST follow dependency-ordered task list generated from approved plan.

**Requirements**:
- Use `/speckit-plan` to create plan.md from spec.md
- Use `/speckit-tasks` to generate tasks.md from plan.md
- Task structure:
  - **Phase 1: Setup** - Project initialization
  - **Phase 2: Foundational** - Core infrastructure (MUST complete before user stories)
  - **Phase 3+: User Stories** - Organized by priority (US1, US2, US3)
- Each task includes exact file paths
- Tasks marked `[P]` can run in parallel
- Check off completed tasks (`[x]`)
- NO ad-hoc implementation (follow task order)
- Commit after logical task groups
- Incremental delivery by user story (P1 MVP → P2 → P3)

**Rationale**: Structured execution prevents integration conflicts, enables parallel work, ensures completeness.

## Quality Gates

### Pre-Merge Checklist

Every PR MUST satisfy ALL gates before merge:

- [ ] **Specification**: Feature has approved spec.md (Principle IX)
- [ ] **Implementation Plan**: Feature has plan.md with Constitution Check (Principle X)
- [ ] **Code Quality**: Follows Principles I (Readability) and II (Type Safety)
- [ ] **Tests**: Meets coverage requirements (Principle IV), tests pass
- [ ] **Performance**: No performance regressions (Principle VIII)
- [ ] **UX Consistency**: Follows design system (Principle VI), provides user feedback (Principle VII)
- [ ] **Code Review**: At least one approval, all comments addressed (Principle III)
- [ ] **Automated Checks**: Linting, type checking, tests, build all pass
- [ ] **Documentation**: Updated if public API or user-facing behavior changes

### Constitutional Review

During planning (`plan.md` creation), verify:

- [ ] All 10 principles addressed in Constitution Check section
- [ ] Any violations justified in Complexity Tracking table
- [ ] Violations include: principle violated, why needed, simpler alternative rejected

## Review Standards

### What Reviewers Look For

1. **Correctness**: Does code solve the problem per spec.md?
2. **Clarity**: Can I understand this in 5 years? (Principle I)
3. **Safety**: Are types explicit? Errors handled? (Principle II)
4. **Testing**: Are tests comprehensive and meaningful? (Principles IV-V)
5. **UX**: Is user experience consistent and helpful? (Principles VI-VII)
6. **Performance**: Any obvious performance issues? (Principle VIII)
7. **Security**: Input validation? Auth checks? No secrets exposed?
8. **Simplicity**: Could this be simpler? (reject unnecessary complexity)

### Reviewer Responsibilities

- Review within 24 hours of assignment
- Provide specific, actionable feedback
- Approve only if ALL Quality Gates satisfied
- If unsure, ask questions (learning is part of review)
- Balance rigor with pragmatism (perfect is enemy of done)

## Governance

### Amendment Process

1. **Propose**: Create PR to `.specify/memory/constitution.md`
2. **Justify**: Document why change needed (what problem does it solve?)
3. **Version**: Increment using semantic versioning:
   - **MAJOR**: Remove or redefine principles (backward-incompatible)
   - **MINOR**: Add new principles or expand existing
   - **PATCH**: Clarifications, wording improvements
4. **Propagate**: Update templates if principles change workflow
5. **Review**: Team review and approval required
6. **Merge**: Update takes effect immediately

### Compliance Review Points

- **During planning**: Constitution Check in `plan.md`
- **During PR review**: Manual verification against principles
- **During retrospectives**: Review patterns of violations
- **During onboarding**: New team members read and acknowledge

### Violation Policy

- **Justified violations**: Documented in Complexity Tracking → Acceptable
- **Unjustified violations**: PR rejected → Plan revised
- **Repeated violations**: Signal to amend constitution (principle may be wrong)

### Living Document

This constitution is not immutable scripture - it evolves with team needs:

- If principle consistently violated, either enforce it or remove it
- If new quality issues emerge, add principle to address them
- If principle no longer serves purpose, deprecate it
- Constitution reflects team values, not aspirational ideals

**Version**: 1.0.0 | **Ratified**: 2026-04-28 | **Last Amended**: 2026-04-28
