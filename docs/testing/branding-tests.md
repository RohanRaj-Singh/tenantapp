# Branding Tests

## Scope

- `tenantapp/runtime/mocks/mockTenantRegistry.ts`
- `tenantapp/runtime/theme/themeUtils.ts`
- `tenantapp/components/layout/Header.tsx`
- `tenantapp/components/layout/DashboardShell.tsx`
- `tenantapp/components/layout/OrganizationSidebar.tsx`
- `tenantapp/app/page.tsx`
- `tenantapp/app/survey/page.tsx`
- `tenantapp/app/survey-questions/page.tsx`

## Automation Status

No automated branding tests exist in the repo.

## Verification Matrix

| Scenario | Observed current behavior | Status |
|---|---|---|
| Full branding tenant (`tenant-a`) | Uses tenant-specific name, logo, primary, secondary, gradients, charts, and dashboard accents. | Pass |
| Partial branding tenant (`tenant-b`) | Uses provided primary and logo, derives missing secondary, and safely falls back remaining fields. | Pass |
| No branding tenant (`tenant-c`) | Uses branding defaults, default logo, and accessibility-normalized fallback colors. | Pass |
| Unknown tenant slug | Falls back to `tenant-a`. | Pass |
| Missing `primaryColor` | Safe. Default primary is normalized and contrast-adjusted. | Pass |
| Missing `logoUrl` | Safe. Default logo is injected before render. | Pass |
| Missing `tenant.name` | Theme layer has a name fallback even though contract marks it required. | Pass |
| Contrast on buttons and chart accents | `ensureAccessibleColor()` and `getReadableTextColor()` are applied centrally. | Pass |
| Header logo background | Uploaded logo now renders without a branded background tile in the public header. | Pass |
| Long tenant name | Header and sidebar truncate; survey title breaks words. | Pass |
| Favicon switching | `injectThemeVariables()` updates the favicon link element. | Pass |

## Remaining Gaps

- No snapshot or visual-regression tests exist.
- No automated contrast assertions exist.
- The logo fallback UI path is effectively bypassed because default logos are injected before render.
