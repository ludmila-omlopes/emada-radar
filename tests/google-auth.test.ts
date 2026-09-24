import assert from "node:assert/strict";
import { test } from "node:test";
import { betterAuth } from "better-auth";
import { memoryAdapter } from "better-auth/adapters/memory";
import { googleProviderOptions, googleAccountLinking, googleSignInPaths, googleAuthError } from "../src/lib/google-auth";
import { safeNextPath } from "../src/lib/validation";

// In-memory database and dummy credentials: tests never use Google or Postgres.
function testAuth(enabled = true) {
  const provider = enabled ? googleProviderOptions({ GOOGLE_CLIENT_ID: "test.apps.googleusercontent.com", GOOGLE_CLIENT_SECRET: "test-client-secret" }) : undefined;
  return betterAuth({
    baseURL: "http://localhost:3000",
    secret: "test-only-secret-at-least-thirty-two-characters",
    database: memoryAdapter({ user: [], session: [], account: [], verification: [] }),
    socialProviders: provider ? { google: provider } : {},
    account: { accountLinking: googleAccountLinking },
    emailAndPassword: { enabled: true },
    logger: { disabled: true },
    // Better Auth otherwise skips origin checks in Node's test environment.
    advanced: { disableOriginCheck: false, disableCSRFCheck: false },
  });
}
function startRequest(body: object, origin = "http://localhost:3000") {
  return new Request("http://localhost:3000/api/auth/sign-in/social", {
    method: "POST",
    headers: { "content-type": "application/json", origin },
    body: JSON.stringify({ provider: "google", ...body }),
  });
}

test("Google stays unavailable if either credential is missing", () => {
  assert.equal(googleProviderOptions({}), undefined);
  assert.equal(googleProviderOptions({ GOOGLE_CLIENT_ID: "client" }), undefined);
  assert.equal(googleProviderOptions({ GOOGLE_CLIENT_ID: "client", GOOGLE_CLIENT_SECRET: " " }), undefined);
});

test("login and signup return to the protected destination, including query parameters", () => {
  const next = "/laboratorio?tab=fluxos";
  const paths = googleSignInPaths(next, true);
  assert.equal(paths.callbackURL, next);
  assert.equal(paths.newUserCallbackURL, next);
  const failure = new URL(paths.errorCallbackURL, "http://localhost:3000");
  assert.equal(failure.searchParams.get("next"), next);
  assert.equal(failure.searchParams.get("cadastro"), "1");
});

test("external and control-character destinations cannot become OAuth callbacks", () => {
  for (const path of ["https://example.org", "//example.org", "/\\example.org", "/\t/example.org", "/\n/example.org"]) {
    assert.equal(safeNextPath(path), "/progresso");
    assert.equal(googleSignInPaths(path, false).callbackURL, "/progresso");
  }
});

test("Better Auth starts OAuth with state, PKCE and identity-only permissions", async () => {
  const response = await testAuth().handler(startRequest(googleSignInPaths("/aprender/o-que-e-ia", true)));
  assert.equal(response.status, 200);
  const data = await response.json();
  const url = new URL(data.url);
  assert.equal(url.origin, "https://accounts.google.com");
  assert.equal(url.searchParams.get("redirect_uri"), "http://localhost:3000/api/auth/callback/google");
  assert.equal(url.searchParams.get("client_id"), "test.apps.googleusercontent.com");
  assert.equal(url.searchParams.get("code_challenge_method"), "S256");
  assert.ok(url.searchParams.get("code_challenge"));
  assert.ok(url.searchParams.get("state"));
  assert.equal(url.searchParams.get("prompt"), "select_account");
  assert.equal(url.searchParams.get("access_type"), "online");
  assert.deepEqual(new Set(url.searchParams.get("scope")?.split(" ")), new Set(["openid", "email", "profile"]));
  assert.ok(response.headers.get("set-cookie"));
  assert.equal(JSON.stringify(data).includes("test-client-secret"), false);
});

test("Better Auth rejects a cross-origin attempt and external callback URLs", async () => {
  const auth = testAuth();
  const crossSite = startRequest({ callbackURL: "/modulos" }, "https://example.org");
  crossSite.headers.set("sec-fetch-site", "cross-site");
  crossSite.headers.set("sec-fetch-mode", "cors");
  crossSite.headers.set("cookie", "better-auth.oauth_state=test-state");
  const badOrigin = await auth.handler(crossSite);
  assert.equal(badOrigin.status, 403);
  const badCallback = await auth.handler(startRequest({ callbackURL: "https://example.org" }));
  assert.equal(badCallback.status, 403);
});

test("unconfigured provider cannot start OAuth", async () => {
  const response = await testAuth(false).handler(startRequest({ callbackURL: "/modulos" }));
  assert.equal(response.status, 404);
});

test("linking Google requires an authenticated session", async () => {
  const response = await testAuth().handler(new Request("http://localhost:3000/api/auth/link-social", {
    method: "POST",
    headers: { "content-type": "application/json", origin: "http://localhost:3000" },
    body: JSON.stringify({ provider: "google", callbackURL: "/progresso" }),
  }));
  assert.equal(response.status, 401);
});

test("existing unverified accounts retain ownership checks and useful recovery guidance", () => {
  assert.equal(googleAccountLinking.requireLocalEmailVerified, true);
  assert.equal(googleAccountLinking.allowDifferentEmails, false);
  assert.match(googleAuthError("account_not_linked"), /Entre com sua senha/);
  assert.match(googleAuthError("access_denied"), /cancelado/);
  assert.equal(googleAuthError("<script>alert(1)</script>").includes("<script>"), false);
});
