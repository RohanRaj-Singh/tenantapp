import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { TENANT_AUTH_CONFIG } from "../contracts/types";
import {
  getTenantAuthCookieBaseOptions,
  shouldUseSecureTenantAuthCookies,
} from "../cookies/options";
import {
  TENANT_LOGIN_PATH,
  appendTenantSlugToPath,
  buildTenantLoginRedirectPath,
  getSafeTenantRedirectPath,
  getTenantSlugFromRedirectPath,
  isTenantProtectedPath,
  isTenantPublicPath,
  isValidTenantSessionTokenFormat,
} from "../guards/route-protection";
import { createTenantAuthTestContext } from "./fixtures";

describe("Tenant Runtime Auth Service", () => {
  it("logs in an active tenant owner and creates a server session", async () => {
    const context = await createTenantAuthTestContext();
    const result = await context.service.loginTenantUser(
      "active",
      {
        identifier: "owner@active.test",
        password: "OwnerPass1234",
      },
      {
        ipAddress: "127.0.0.1",
        userAgent: "tenant-auth-test",
      },
    );

    assert.equal(result.success, true);
    assert.equal(result.user?.email, "owner@active.test");
    assert.equal(result.session?.tenantId, "tenant-active");
    assert.equal(result.requiresPasswordChange, false);
    assert.ok(result.session?.sessionToken);
    assert.equal(context.users.get("tenant-user-active")?.lastLoginAt, context.nowIso);
  });

  it("invalidates a session on logout", async () => {
    const context = await createTenantAuthTestContext();
    const loginResult = await context.service.loginTenantUser("active", {
      identifier: "active.owner",
      password: "OwnerPass1234",
    });

    assert.equal(loginResult.success, true);
    assert.ok(loginResult.session);

    await context.service.invalidateTenantSession(loginResult.session!.sessionToken);
    assert.equal(context.sessions.has(loginResult.session!.sessionToken), false);
  });

  it("blocks login for disabled, archived, and draft-style tenants", async () => {
    const context = await createTenantAuthTestContext();

    const disabled = await context.service.loginTenantUser("disabled", {
      identifier: "owner@disabled.test",
      password: "OwnerPass1234",
    });
    const archived = await context.service.loginTenantUser("archived", {
      identifier: "owner@archived.test",
      password: "OwnerPass1234",
    });
    const draft = await context.service.loginTenantUser("draft", {
      identifier: "owner@draft.test",
      password: "OwnerPass1234",
    });

    assert.equal(disabled.success, false);
    assert.equal(disabled.reason, "TENANT_DISABLED");
    assert.equal(archived.success, false);
    assert.equal(archived.reason, "TENANT_ARCHIVED");
    assert.equal(draft.success, false);
    assert.equal(draft.reason, "TENANT_DRAFT");
  });

  it("restores a valid session for the same tenant and updates last accessed time", async () => {
    const context = await createTenantAuthTestContext();
    const loginResult = await context.service.loginTenantUser("active", {
      identifier: "active.owner",
      password: "OwnerPass1234",
    });

    const validation = await context.service.validateTenantSession(
      loginResult.session!.sessionToken,
      "active",
    );

    assert.equal(validation.success, true);
    assert.equal(validation.context?.user.username, "active.owner");
    assert.equal(validation.context?.tenant.slug, "active");
    assert.equal(
      context.sessions.get(loginResult.session!.sessionToken)?.lastAccessedAt,
      context.nowIso,
    );
  });

  it("restores a valid session even when the request URL has no explicit tenant scope", async () => {
    const context = await createTenantAuthTestContext();
    const loginResult = await context.service.loginTenantUser("active", {
      identifier: "active.owner",
      password: "OwnerPass1234",
    });

    const validation = await context.service.validateTenantSession(
      loginResult.session!.sessionToken,
    );

    assert.equal(validation.success, true);
    assert.equal(validation.context?.tenant.slug, "active");
  });

  it("invalidates expired sessions during validation", async () => {
    const context = await createTenantAuthTestContext();
    const result = await context.service.validateTenantSession(
      "tds_expired_session_token_0000000000000000000000000000000000000000000000",
      "active",
    );

    assert.equal(result.success, false);
    assert.equal(result.reason, "SESSION_EXPIRED");
    assert.equal(
      context.sessions.has(
        "tds_expired_session_token_0000000000000000000000000000000000000000000000",
      ),
      false,
    );
  });

  it("forces password change flow for must-change-password users", async () => {
    const context = await createTenantAuthTestContext();
    const loginResult = await context.service.loginTenantUser("other", {
      identifier: "reset.owner",
      password: "OwnerPass1234",
    });

    assert.equal(loginResult.success, true);
    assert.equal(loginResult.requiresPasswordChange, true);

    const changedUser = await context.service.changeTenantPassword(
      loginResult.user!.id,
      {
        currentPassword: "OwnerPass1234",
        newPassword: "NewOwnerPass1234",
      },
    );

    assert.equal(changedUser.mustChangePassword, false);
  });

  it("rate limits repeated invalid login attempts", async () => {
    const context = await createTenantAuthTestContext();

    for (let attempt = 0; attempt < TENANT_AUTH_CONFIG.maxLoginAttempts; attempt += 1) {
      const result = await context.service.loginTenantUser(
        "active",
        {
          identifier: "owner@active.test",
          password: "WrongPass1234",
        },
        {
          ipAddress: "127.0.0.1",
        },
      );

      assert.equal(result.success, false);
    }

    const blocked = await context.service.loginTenantUser(
      "active",
      {
        identifier: "owner@active.test",
        password: "WrongPass1234",
      },
      {
        ipAddress: "127.0.0.1",
      },
    );

    assert.equal(blocked.success, false);
    assert.equal(blocked.reason, "RATE_LIMITED");
    assert.ok((blocked.retryAfterSeconds ?? 0) > 0);
  });

  it("invalidates sessions that are reused against another tenant scope", async () => {
    const context = await createTenantAuthTestContext();
    const loginResult = await context.service.loginTenantUser("active", {
      identifier: "active.owner",
      password: "OwnerPass1234",
    });

    const validation = await context.service.validateTenantSession(
      loginResult.session!.sessionToken,
      "other",
    );

    assert.equal(validation.success, false);
    assert.equal(validation.reason, "TENANT_SCOPE_MISMATCH");
    assert.equal(context.sessions.has(loginResult.session!.sessionToken), false);
  });
});

describe("Tenant Runtime Route Protection Helpers", () => {
  it("protects only tenant dashboard routes", () => {
    assert.equal(isTenantProtectedPath("/dashboard"), true);
    assert.equal(isTenantProtectedPath("/dashboard/settings"), true);
    assert.equal(isTenantProtectedPath("/analytics"), true);
    assert.equal(isTenantProtectedPath("/reports/monthly"), true);
    assert.equal(isTenantProtectedPath("/settings"), true);
    assert.equal(isTenantProtectedPath("/survey"), false);
    assert.equal(isTenantProtectedPath("/submit"), false);
  });

  it("keeps the tenant login path public and validates token format", () => {
    assert.equal(isTenantPublicPath(TENANT_LOGIN_PATH), true);
    assert.equal(isTenantPublicPath("/login/help"), true);
    assert.equal(isValidTenantSessionTokenFormat(`tds_${"a".repeat(64)}`), true);
    assert.equal(isValidTenantSessionTokenFormat("admin-session-token"), false);
  });

  it("builds safe redirect targets for login middleware and expired sessions", () => {
    assert.equal(getSafeTenantRedirectPath("/reports"), "/reports");
    assert.equal(getSafeTenantRedirectPath("//evil.test"), "/dashboard");
    assert.equal(appendTenantSlugToPath("/dashboard", "active"), "/dashboard?tenant=active");
    assert.equal(getTenantSlugFromRedirectPath("/dashboard?tenant=active"), "active");
    assert.equal(
      buildTenantLoginRedirectPath("/analytics", "Your session has expired. Please sign in again."),
      "/login?next=%2Fanalytics&message=Your+session+has+expired.+Please+sign+in+again.",
    );
    assert.equal(
      buildTenantLoginRedirectPath("/analytics?tenant=active", "Your session has expired. Please sign in again.", "active"),
      "/login?next=%2Fanalytics%3Ftenant%3Dactive&message=Your+session+has+expired.+Please+sign+in+again.&tenant=active",
    );
  });
});

describe("Tenant Auth Cookie Options", () => {
  it("disables secure cookies for forwarded http requests", () => {
    const request = new Request("http://oq.remedygcc.com/api/tenant-auth/login", {
      headers: {
        "x-forwarded-proto": "http",
      },
    });

    assert.equal(shouldUseSecureTenantAuthCookies(request), false);
    assert.equal(getTenantAuthCookieBaseOptions(request).secure, false);
  });

  it("enables secure cookies for forwarded https requests", () => {
    const request = new Request("http://internal-upstream/api/tenant-auth/login", {
      headers: {
        "x-forwarded-proto": "https",
      },
    });

    assert.equal(shouldUseSecureTenantAuthCookies(request), true);
    assert.equal(getTenantAuthCookieBaseOptions(request).secure, true);
  });
});
