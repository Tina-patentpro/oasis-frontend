# Logo WebP Unification Design

**Goal:** Use a single 48x48 WebP logo asset for every existing image-based logo slot in the frontend, and remove the old JPG/PNG logo files from active use.

**Scope:**

- Replace the current workspace header logo with a 48x48 WebP asset generated from the user-provided source image.
- Keep text-only brand areas unchanged.
- Remove the temporary JPG logo and the old PNG logo from the project after references are updated.

**Current State:**

- The only current image-based logo reference is in `src/components/workspace/NavigationBar.tsx`.
- `src/pages/auth/AuthPage.tsx` uses text-only branding and is intentionally left unchanged.
- Existing logo files in `public/` are `workspace-logo.jpg` and `workspace-logo.png`.

**Chosen Approach (Scheme 3):**

- Generate `public/workspace-logo.webp` from `D:\OneDrive\4、董娣相关\2、产品和内容\专利撰写助手Logo.jpg`.
- Resize onto a 48x48 canvas with aspect-ratio preservation and centered padding so the logo does not stretch.
- Update all existing image-based logo references to the new WebP file.
- Delete `public/workspace-logo.jpg` and `public/workspace-logo.png`.

**Tradeoffs:**

- Pros: smallest active asset set, faster logo loading, one source of truth for image-based logo slots.
- Cons: removing the old files eliminates the easiest file-level rollback, so verification must confirm the new asset is the only active reference.

**Verification Plan:**

- Run the focused logo component test.
- Run `npm run type-check`.
- Run `npm run lint`.

**Notes:**

- No new shared React component is introduced because there is only one existing image-based logo location today.
- If more image-based logo slots are added later, they should reuse `public/workspace-logo.webp`.
