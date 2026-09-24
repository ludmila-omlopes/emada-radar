import { betterAuth } from "better-auth";
import { getDb, databaseConfigured } from "./db";
import { googleProviderOptions, googleAccountLinking } from "./google-auth";

export const authConfigured = () => databaseConfigured() && Boolean(process.env.BETTER_AUTH_SECRET && process.env.BETTER_AUTH_URL);
export const googleAuthConfigured = () => authConfigured() && Boolean(googleProviderOptions(process.env));
function createAuth() {
  if (!authConfigured()) throw new Error("Login ainda não configurado.");
  const google = googleProviderOptions(process.env);
  return betterAuth({
    appName: "Emada Academy",
    database: getDb(),
    baseURL: process.env.BETTER_AUTH_URL,
    secret: process.env.BETTER_AUTH_SECRET,
    emailAndPassword: { enabled: true, minPasswordLength: 10, maxPasswordLength: 128 },
    socialProviders: google ? { google } : {},
    account: { accountLinking: googleAccountLinking },
    onAPIError: { errorURL: "/entrar" },
    session: { expiresIn: 60 * 60 * 24 * 7, updateAge: 60 * 60 * 24 },
    rateLimit: { enabled: true, storage: "database", window: 60, max: 30,
      customRules: { "/sign-in/email": { window: 60, max: 5 }, "/sign-up/email": { window: 60, max: 3 } } },
    advanced: { cookiePrefix: "emada" },
  });
}
let instance: ReturnType<typeof createAuth> | undefined;
export function getAuth() { return instance ??= createAuth(); }
