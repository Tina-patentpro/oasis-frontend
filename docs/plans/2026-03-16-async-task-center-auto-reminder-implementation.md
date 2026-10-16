# Async Task Center Auto Reminder Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Make the async task center auto-open for a few seconds whenever a new async task is submitted so users know the center is tracking it.

**Architecture:** Keep task state in the existing async task store, and use a small page event only for UI reminder behavior. Dispatch the event from the async submission path after the task is written into the store, then let `AsyncTaskMenu` listen and manage auto-open/auto-close timing locally.

**Tech Stack:** React 19, TypeScript, Zustand, Jest, Testing Library, Vite

---

### Task 1: Add a reusable async-task reminder event

**Files:**

- Create: `src/modules/workspace/events/async-task-center-event.ts`

**Step 1: Write the event contract**

Add:

- one event name constant
- one detail type containing `taskKey`, `toolName`, `folderId`, `submittedAtMs`
- one dispatch helper

**Step 2: Keep the helper browser-safe**

Guard against `window` being unavailable before dispatching.

**Step 3: Verify the file is importable**

Expected: no default export, named exports only.

### Task 2: Dispatch the reminder from async submission

**Files:**

- Modify: `src/modules/workspace/hooks/content-sections/generation-actions.ts`
- Test: `src/modules/workspace/hooks/content-sections/generation-actions.test.ts`

**Step 1: Write the failing test**

Add a test that:

- renders `useGenerationActions`
- triggers `generate()` for an async tool
- expects the async reminder event to be dispatched once

**Step 2: Run the targeted test to see it fail**

Run: `npm test -- --runInBand src/modules/workspace/hooks/content-sections/generation-actions.test.ts`

Expected: FAIL because no reminder event is dispatched yet.

**Step 3: Implement the minimal change**

After `useAsyncTaskStore.getState().addAsyncTask(...)`, call the new dispatch helper with the submitted task detail.

**Step 4: Run the targeted test again**

Run: `npm test -- --runInBand src/modules/workspace/hooks/content-sections/generation-actions.test.ts`

Expected: PASS

### Task 3: Auto-open and auto-close the task center on the reminder event

**Files:**

- Modify: `src/components/workspace/navigation/AsyncTaskMenu.tsx`
- Create: `src/components/workspace/navigation/AsyncTaskMenu.test.tsx`

**Step 1: Write the failing component test**

Add a test that:

- renders `AsyncTaskMenu`
- dispatches the async reminder event
- expects the task center dialog to appear
- advances fake timers by 4 seconds
- expects the dialog to disappear

Add another test that:

- manually opens the task center
- dispatches the reminder event
- advances fake timers
- expects the dialog to remain open

**Step 2: Run the targeted component test to see it fail**

Run: `npm test -- --runInBand src/components/workspace/navigation/AsyncTaskMenu.test.tsx`

Expected: FAIL because the component does not listen for the reminder event yet.

**Step 3: Implement the minimal UI logic**

Add:

- reminder event listener
- auto-close timer ref
- manual vs auto-open distinction
- cleanup on unmount

**Step 4: Run the targeted component test again**

Run: `npm test -- --runInBand src/components/workspace/navigation/AsyncTaskMenu.test.tsx`

Expected: PASS

### Task 4: Run full required verification

**Files:**

- Modify: none

**Step 1: Run type check**

Run: `npm run type-check`

Expected: PASS

**Step 2: Run lint**

Run: `npm run lint`

Expected: PASS

**Step 3: Run related tests**

Run: `npm test -- --runInBand src/modules/workspace/hooks/content-sections/generation-actions.test.ts src/components/workspace/navigation/AsyncTaskMenu.test.tsx`

Expected: PASS
