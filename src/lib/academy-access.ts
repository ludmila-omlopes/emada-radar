// The Academy is open only to its owner; everyone else sees the waitlist.
export const ACADEMY_OWNER_EMAIL = "ludmila.omlopes@gmail.com";

// Email/password sign-ups are not verified, so the address alone is not proof of
// ownership: it also needs a verified email (Google) or an administrator account.
export function isAcademyOwner(user: { email: string; emailVerified: boolean } | null | undefined, admin: boolean) {
  return Boolean(user && user.email.trim().toLowerCase() === ACADEMY_OWNER_EMAIL && (user.emailVerified || admin));
}
