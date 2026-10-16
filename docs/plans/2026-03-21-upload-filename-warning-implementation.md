# Upload Filename Warning Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Show a non-blocking warning in the upload area when a selected filename contains spaces or special characters that may cause generation failure.

**Architecture:** Keep the change local to the shared `FileUpload` component. Detect risky filenames after existing validation passes, store the warning in component state, and render the warning inline so the current workspace upload panel gets the behavior without changing upload APIs.

**Tech Stack:** React 19, TypeScript, Jest, Testing Library, Vite

---

### Task 1: Add a failing UI test for risky filenames

**Files:**

- Modify: `src/components/ui/__tests__/FileUpload.test.ts`

**Step 1: Write the failing test**

Add a test that:

- renders `FileUpload`
- selects a file whose name includes a space or special character
- expects the warning text to appear in the component

Add another test that:

- selects a safe filename
- expects the warning text to stay absent

**Step 2: Run the targeted test to see it fail**

Run: `npm test -- --runInBand src/components/ui/__tests__/FileUpload.test.ts`

Expected: FAIL because no filename-risk warning is rendered yet.

### Task 2: Implement the minimal filename-risk warning

**Files:**

- Modify: `src/components/ui/FileUpload.tsx`

**Step 1: Add filename-risk helpers**

Create:

- one helper that checks whether a filename contains spaces or non-whitelisted symbols
- one helper that returns the risky filenames from the current selection

**Step 2: Update file selection flow**

After existing size/type validation succeeds:

- compute risky filenames from the valid files
- save one warning message in component state
- clear the warning when there are no risky filenames or when upload is reset

**Step 3: Render the inline warning**

Show the warning near the selected file list / upload controls so the user sees it before clicking upload.

**Step 4: Run the targeted test again**

Run: `npm test -- --runInBand src/components/ui/__tests__/FileUpload.test.ts`

Expected: PASS

### Task 3: Run required verification

**Files:**

- Modify: none

**Step 1: Run type check**

Run: `npm run type-check`

Expected: PASS

**Step 2: Run lint**

Run: `npm run lint`

Expected: PASS

**Step 3: Run the related test**

Run: `npm test -- --runInBand src/components/ui/__tests__/FileUpload.test.ts`

Expected: PASS
