# NOTYPE Implementation Plan

Status: Draft
Date: March 6, 2026
Based on: [NOTYPE PRD](/Users/sunzelun/Desktop/projects/notype/docs/notype-prd.md)

## 1. Planning Principles

This plan follows four operating rules:

- `KISS`: build the smallest working version of each layer before adding flexibility.
- `TDD`: write tests first for pure logic, state, adapters, repositories, and orchestration.
- `DRY`: create one clear abstraction for each repeated concern and avoid parallel code paths.
- `Consistency`: use one naming scheme, one folder structure strategy, one source of truth per setting, and one happy-path workflow.

## 2. Delivery Strategy

The product should be built as a clean extraction from OpenWhispr, not as a feature pile on top of it.

That means:

- keep only the system-level plumbing we need
- remove unrelated product flows early
- reduce providers to Groq and Cerebras
- reduce UI to floating utility, settings, and history
- keep history local
- keep context capture metadata-only in MVP

## 3. Constraints From the PRD

Hard constraints:

- macOS Tahoe 26.x is the primary target
- default hotkey is `Fn`
- interaction is tap-to-start and tap-to-stop
- STT is Groq `whisper-large-v3-turbo`
- cleanup is Cerebras `gpt-oss-120b`
- successful cleanup: copy first, then auto-paste
- cleanup failure: copy raw transcript, show error, do not auto-paste
- local SQLite history is required
- system default microphone only in MVP
- active-window context is metadata-only in MVP
- product name is `NOTYPE`

Open dependency:

- bundle identifier confirmation for `com.notype.app`

## 4. Architecture Direction

To stay simple and testable, the implementation should converge on these product modules:

- `dictation session coordinator`
- `stt provider adapter`
- `cleanup provider adapter`
- `prompt builder`
- `context metadata provider`
- `clipboard and paste service`
- `history repository`
- `settings repository`
- `recording state model`
- `floating status UI`
- `settings window`
- `history window`

Recommended rule:

- UI components should not talk directly to Groq, Cerebras, SQLite, or low-level system APIs.
- UI should call one orchestrating application service or coordinator.

## 5. TDD Strategy

### 5.1 What must be test-driven

Write tests first for:

- prompt building logic
- context classification logic
- STT adapter request shaping
- cleanup adapter request shaping
- fallback policy behavior
- history repository behavior
- settings persistence behavior
- dictation pipeline orchestration
- clipboard/paste decision policy

### 5.2 What will still need manual validation

Desktop/macOS-specific behaviors cannot be covered only by unit tests.

Manual validation is required for:

- `Fn/Globe` hotkey behavior
- microphone permission prompts
- accessibility permission prompts
- clipboard copy and auto-paste behavior
- floating UI focus behavior
- app startup and packaging on macOS Tahoe 26.x

### 5.3 TDD rule of engagement

For every phase:

1. write or update failing tests for the new behavior
2. implement the smallest code change to make them pass
3. refactor only after tests are green
4. run a manual smoke test if the phase touches macOS-specific behavior

## 6. Phase Overview

### Phase 0: Baseline and Test Harness

Goal:

- establish a stable baseline before product extraction

Outputs:

- implementation branch
- test runner and first test suites
- baseline smoke checklist
- inventory of code to keep, replace, and remove

### Phase 1: Platform Foundation

Goal:

- make the app safe to build forward on macOS before product work accelerates

Outputs:

- supported Electron baseline decision
- verified native helper build path
- stable app launch on current macOS target

### Phase 2: Product Extraction and Rebrand

Goal:

- reduce OpenWhispr into a NOTYPE-shaped shell

Outputs:

- NOTYPE naming
- simplified app navigation and windows
- removal or hiding of auth, billing, notes, and unrelated provider flows

### Phase 3: Core Domain Layer

Goal:

- create a minimal and testable application core

Outputs:

- dictation pipeline coordinator
- settings repository
- history repository
- context metadata model
- failure policy model

### Phase 4: Provider Integration and Prompt Pipeline

Goal:

- implement the Groq -> Cerebras text pipeline with correct fallback behavior

Outputs:

- Groq STT adapter
- Cerebras cleanup adapter
- prompt builder
- context metadata injection

### Phase 5: Dictation UX Loop

Goal:

- wire the user interaction loop from hotkey to paste

Outputs:

- floating recording and processing indicator
- hotkey flow
- recording flow
- clipboard copy and auto-paste flow
- sound cues

### Phase 6: Settings and History UI

Goal:

- make the MVP usable and inspectable without bloating the product

Outputs:

- settings window
- history window
- history copy/delete actions

### Phase 7: Hardening and Release Readiness

Goal:

- reduce shipping risk on macOS Tahoe 26.x

Outputs:

- permission hardening
- manual QA checklist
- build/package validation
- docs cleanup

## 7. Detailed Phase Plan

## Phase 0: Baseline and Test Harness

### Objectives

- freeze a clear starting point
- prevent uncontrolled edits to upstream product behavior
- establish TDD infrastructure before feature changes

### Tasks

- create a product-specific implementation branch
- add a test runner if one is missing
- create initial test folders for:
  - unit
  - integration
  - repository
  - service/orchestration
- document a baseline smoke test for:
  - app launch
  - hotkey registration
  - recording start/stop
  - clipboard write
- capture a keep/remove map from the current codebase

### TDD targets

- first settings persistence test
- first history repository contract test
- first failure-policy test for cleanup failure behavior

### Exit criteria

- tests run locally
- baseline smoke checklist exists
- no product behavior changes yet

## Phase 1: Platform Foundation

### Objectives

- stabilize the platform before feature extraction
- reduce risk from the current Electron baseline

### Tasks

- decide whether to upgrade Electron immediately or lock a short-lived baseline for extraction
- verify native helper compilation still works after the platform decision
- verify app starts on macOS with:
  - hotkey registration
  - microphone access path
  - accessibility path

### KISS rule

- do not mix product feature changes into this phase
- only make the platform safe enough to continue

### TDD targets

- configuration tests for app identity values
- packaging/config validation tests where feasible

### Manual validation

- launch app
- register fallback hotkey
- verify `Fn` path still initializes

### Exit criteria

- app launches consistently on local macOS target
- native helper build path is still healthy
- no unrelated feature work has started

## Phase 2: Product Extraction and Rebrand

### Objectives

- turn the shell into NOTYPE
- remove product surface area we do not want

### Tasks

- rename visible product strings to `NOTYPE`
- update app identity values
- simplify tray/menu/window labels
- remove or hide:
  - auth flows
  - subscription flows
  - referral flows
  - notes
  - prompt studio
  - local model management UI
  - unused provider selectors
- clean repository/project artifacts that are clearly OpenWhispr-specific

### TDD targets

- identity/config tests
- route/window visibility tests if routing is retained

### DRY rule

- do not keep both old and new product paths alive if only one will survive

### Exit criteria

- app visually presents as NOTYPE
- unrelated OpenWhispr flows are gone or unreachable
- shell still launches and remains functional

## Phase 3: Core Domain Layer

### Objectives

- centralize business logic into small testable units
- avoid UI-driven orchestration

### Tasks

- define domain models for:
  - recording state
  - transcript result
  - cleanup result
  - history entry
  - context metadata
  - paste outcome
- build a `DictationCoordinator` or equivalent application service
- build a `HistoryRepository` backed by SQLite
- build a `SettingsRepository`
- define cleanup failure policy centrally

### TDD targets

- history insert/list/delete tests
- settings load/save tests
- coordinator happy-path test
- coordinator cleanup-failure test
- coordinator paste-failure test

### DRY rule

- one place only for fallback behavior
- one place only for transcript status transitions

### Exit criteria

- orchestration logic is no longer scattered through UI code
- core behavior is covered by tests

## Phase 4: Provider Integration and Prompt Pipeline

### Objectives

- implement external API boundaries cleanly
- keep provider logic replaceable and testable

### Tasks

- implement `GroqTranscriptionAdapter`
- implement `CerebrasCleanupAdapter`
- implement `PromptBuilder`
- implement metadata-only `ContextMetadataProvider`
- define adapter request and response DTOs
- inject context metadata into cleanup requests

### Prompt implementation direction

Start with one strong default cleanup prompt.

The first version should:

- remove filler words
- remove false starts and repetitions
- preserve meaning
- preserve technical terms
- keep formatting light
- output only cleaned text

Do not build multiple prompt modes yet unless tests show a clear need.

### TDD targets

- Groq request construction tests
- Cerebras request construction tests
- prompt builder snapshot-style tests
- context metadata shaping tests
- adapter error mapping tests

### KISS rule

- one Groq model
- one Cerebras model
- one cleanup prompt path
- no provider matrix in MVP

### Exit criteria

- STT adapter is stable with mocked integration tests
- cleanup adapter is stable with mocked integration tests
- prompt behavior is versioned and test-backed

## Phase 5: Dictation UX Loop

### Objectives

- connect the full vertical slice

### Tasks

- connect hotkey events to coordinator
- connect recording start and stop
- connect floating indicator states
- connect cue sounds
- connect final clipboard copy
- connect immediate auto-paste after successful cleanup
- connect cleanup-failure behavior:
  - raw transcript copied
  - visible error
  - no auto-paste

### TDD targets

- state transition tests for:
  - idle -> recording
  - recording -> processing
  - processing -> success
  - processing -> cleanup failure
  - processing -> paste failure

### Manual validation

- hotkey start/stop
- `Fn` path
- clipboard writes
- successful auto-paste
- failed auto-paste fallback

### Exit criteria

- one end-to-end dictation slice works on macOS
- UI feedback is clear
- fallback behavior matches PRD

## Phase 6: Settings and History UI

### Objectives

- expose only the essential controls

### Tasks

- build lightweight settings window
- build lightweight history window
- expose settings for:
  - hotkey
  - launch at login
  - cue sounds
  - preferred language
  - auto-paste
- expose history actions:
  - copy again
  - delete

### TDD targets

- settings store tests
- history list rendering tests
- history action tests

### DRY rule

- settings should read from one repository only
- history should read from one repository only

### Exit criteria

- settings work and persist
- history works and persists
- UI remains minimal

## Phase 7: Hardening and Release Readiness

### Objectives

- reduce last-mile desktop risk

### Tasks

- validate microphone permission path
- validate accessibility permission path
- validate paste behavior in common target apps
- validate `Fn` behavior after sleep/wake if possible
- confirm packaging direction:
  - Apple Silicon first
  - universal later if low cost
- clean remaining repo/project noise
- prepare release checklist

### Manual QA checklist

- app launch
- first-run permissions
- hotkey change
- dictation success
- cleanup failure handling
- clipboard fallback
- history write/read/delete
- settings persistence
- relaunch persistence

### Exit criteria

- manual QA checklist passes
- no critical macOS blockers remain
- repo is clean enough for sustained product work

## 8. Sequence Dependencies

Follow this order strictly:

1. test harness before feature work
2. platform foundation before large product extraction
3. product extraction before provider integration
4. core domain before UI-heavy work
5. provider adapters before full dictation loop
6. full dictation loop before polish
7. hardening after the MVP loop is real

## 9. Definition of Done Per Phase

A phase is only complete when:

- tests for that phase are green
- duplicated temporary code is removed
- docs are updated if the plan changed
- manual smoke validation is done for macOS-touching work
- the next phase can begin without carrying unresolved structural debt

## 10. Recommended First Sprint

The first sprint should cover only:

- Phase 0
- the platform decision part of Phase 1
- initial identity extraction planning from Phase 2

Reason:

- this keeps the first execution slice small
- it prevents deep implementation on a shaky platform base
- it preserves KISS and TDD discipline

## 11. Anti-Goals During Implementation

Avoid these traps:

- keeping old and new product flows alive in parallel
- building generalized provider abstractions for providers we do not need
- adding UI customization before the core loop works
- building rich context extraction before metadata-only context is proven useful
- adding history search, tags, or folders in MVP
- postponing tests until after the vertical slice is working

## 12. Immediate Next Steps After Approval

1. confirm bundle identifier
2. create implementation branch
3. set up test harness
4. decide Electron baseline
5. begin Phase 2 extraction only after Phase 1 is stable

