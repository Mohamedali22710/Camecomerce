/** Reads and validates super-admin seed credentials from the environment.
 *
 * Kept separate from the seed script so the "no hardcoded or printed
 * credentials" policy can be regression-tested without a database connection.
 */

const MIN_PASSWORD_LENGTH = 12;

export interface SeedCredentials {
  email: string;
  password: string;
  resetPassword: boolean;
}

export const readSeedCredentials = (source: NodeJS.ProcessEnv = process.env): SeedCredentials => {
  const email = (source.SEED_ADMIN_EMAIL || "").trim().toLowerCase();
  const password = source.SEED_ADMIN_PASSWORD || "";
  const resetPassword = source.SEED_ADMIN_RESET_PASSWORD === "true";

  if (!email || !password) {
    throw new Error(
      "SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD are required. " +
        "Set them in config/.env (never commit real values) and re-run the seed script.",
    );
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    throw new Error("SEED_ADMIN_EMAIL must be a valid email address.");
  }
  if (password.length < MIN_PASSWORD_LENGTH) {
    throw new Error(`SEED_ADMIN_PASSWORD must be at least ${MIN_PASSWORD_LENGTH} characters.`);
  }

  return { email, password, resetPassword };
};
