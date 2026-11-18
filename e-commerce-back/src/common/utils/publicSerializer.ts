/** Public response serialization helpers.
 *
 * Admin audit fields (who created a record) are useful internally but must not
 * be exposed by unauthenticated catalogue endpoints. Documents are converted via
 * JSON first so Mongoose documents, ObjectIds, and nested populated documents all
 * become plain JSON before the fields are removed.
 */

const ADMIN_ONLY_FIELDS = new Set(["addedByEmail", "__v"]);

const stripNode = (node: unknown): void => {
  if (Array.isArray(node)) {
    node.forEach(stripNode);
    return;
  }
  if (!node || typeof node !== "object") {
    return;
  }

  const record = node as Record<string, unknown>;
  for (const field of ADMIN_ONLY_FIELDS) {
    delete record[field];
  }
  Object.values(record).forEach(stripNode);
};

/** Returns a JSON-safe copy with admin-only audit fields removed recursively. */
export const toPublicJson = <T>(value: T): T => {
  if (value === undefined || value === null) {
    return value;
  }

  const plain = JSON.parse(JSON.stringify(value)) as unknown;
  stripNode(plain);
  return plain as T;
};
