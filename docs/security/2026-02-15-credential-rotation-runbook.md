# Credential Rotation Runbook (Leak Response)

## Scope

- Third-party API keys leaked into tracked artifacts.
- Affected patterns include `sk-*`, `app-*`, and endpoint credentials in raw response dumps.

## Immediate Actions (T+0)

1. Identify leaked keys from audit evidence and source files.
2. Revoke each leaked key at provider console immediately.
3. Issue replacement keys with least privilege.
4. Update backend secret manager entries (never frontend `.env` for private keys).

## Session and Token Hygiene (T+0 to T+1h)

1. Invalidate all active user sessions that could have accessed leaked values.
2. Force re-login for impacted tenants/environments.
3. Rotate signing/verification secrets if token minting keys were exposed.

## Codebase Cleanup (T+0 to T+1h)

1. Remove tracked sensitive artifacts from git index.
2. Ensure `tmp/` is git-ignored for future dumps.
3. Add pre-commit secret scanning on staged files.
4. Run repository-wide secret scan before next release.

## Verification Checklist

- `git grep -n -E "sk-[A-Za-z0-9]{20,}|app-[A-Za-z0-9]{20,}" -- .` returns no tracked hits.
- Secret scanner reports no findings on staged files.
- Updated keys work in backend integration tests.
- Revoked keys fail authentication at provider side.

## Postmortem Items

- Add data redaction for any script that stores API response payloads.
- Add CI gate to fail on secret signatures.
- Track MTTR and recurrence count in security metrics.
