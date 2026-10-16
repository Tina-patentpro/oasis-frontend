# Logo WebP Unification Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Replace the current image-based logo with a single 48x48 WebP asset and remove the old JPG/PNG logo files.

**Architecture:** Generate one optimized static asset in `public/`, point the existing workspace header image to it, and keep text-only brand areas unchanged. Validate the change with a focused regression test plus project-wide type and lint checks.

**Tech Stack:** React 19, TypeScript, Vite, Jest, Playwright runtime for local asset conversion

---

### Task 1: Prepare the 48x48 WebP asset

**Files:**

- Create: `D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\public\workspace-logo.webp`
- Create: `D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\tmp\convert-logo-to-webp.mjs`
- Delete: `D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\public\workspace-logo.jpg`
- Delete: `D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\public\workspace-logo.png`

**Step 1: Generate the asset with centered contain-fit scaling**

Run: `node tmp/convert-logo-to-webp.mjs "D:\OneDrive\4、董娣相关\2、产品和内容\专利撰写助手Logo.jpg" "D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\public\workspace-logo.webp" 48`

Expected: script prints the source size, output path, and output byte size.

**Step 2: Remove superseded files**

Delete the old active JPG and PNG files after the WebP file exists.

**Step 3: Verify the new file exists**

Run: `dir /b public\workspace-logo.*`

Expected: only `workspace-logo.webp` remains.

### Task 2: Update code and regression coverage

**Files:**

- Modify: `D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\src\components\workspace\NavigationBar.tsx`
- Modify: `D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\src\components\workspace\NavigationBar.test.tsx`

**Step 1: Write the failing test**

Change the existing focused test to expect `/workspace-logo.webp`.

**Step 2: Run test to verify it fails**

Run: `npm run test -- --runInBand src/components/workspace/NavigationBar.test.tsx`

Expected: FAIL because the component still points to `/workspace-logo.jpg`.

**Step 3: Write minimal implementation**

Update `NavigationBar.tsx` so the logo image source points to `/workspace-logo.webp`.

**Step 4: Run test to verify it passes**

Run: `npm run test -- --runInBand src/components/workspace/NavigationBar.test.tsx`

Expected: PASS.

### Task 3: Final verification and cleanup

**Files:**

- Delete: `D:\OneDrive\4、董娣相关\绿洲慧写3.0\绿洲前端\tmp\convert-logo-to-webp.mjs`

**Step 1: Verify type safety**

Run: `npm run type-check`

Expected: PASS.

**Step 2: Verify lint**

Run: `npm run lint`

Expected: PASS.

**Step 3: Verify there are no old active references**

Run: `git grep -n workspace-logo -- src public`

Expected: only `workspace-logo.webp` is referenced by source code.
