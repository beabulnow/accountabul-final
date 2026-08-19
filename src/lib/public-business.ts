export type PublicBusinessIdentity = {
  id: string;
  slug: string;
  display_name: string;
};

/** PostgreSQL view metadata is nullable; reject malformed public rows at the data boundary. */
export function hasPublicBusinessIdentity<
  T extends { id: string | null; slug: string | null; display_name: string | null },
>(business: T): business is T & PublicBusinessIdentity {
  return Boolean(business.id && business.slug && business.display_name);
}
