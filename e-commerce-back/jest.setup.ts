/**
 * Test-only environment defaults. They run before any module imports the env
 * service, so token tests do not depend on a developer's local `config/.env`.
 */
const defaults: Record<string, string> = {
  SIGNATURE_ADMIN: "test-admin-secret",
  SIGNATURE_USER: "test-user-secret",
  SIGNATURE_SUPER_ADMIN: "test-super-admin-secret",
  VERIFY_SIGNATURE_MY: "test-verification-secret",
};

for (const [key, value] of Object.entries(defaults)) {
  process.env[key] ??= value;
}
