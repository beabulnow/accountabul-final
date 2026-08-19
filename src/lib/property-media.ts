const PROPERTY_MEDIA_BUCKET = "property-media";

export function isRemoteImageUrl(value: string) {
  try {
    const url = new URL(value);
    return (
      url.protocol === "https:" ||
      (url.protocol === "http:" && ["localhost", "127.0.0.1"].includes(url.hostname))
    );
  } catch {
    return false;
  }
}

export async function resolvePropertyMediaUrl(path: string | null | undefined) {
  if (!path) return null;
  if (isRemoteImageUrl(path)) return path;
  const { supabase } = await import("@/integrations/supabase/client");
  const { data, error } = await supabase.storage
    .from(PROPERTY_MEDIA_BUCKET)
    .createSignedUrl(path, 60 * 60);
  if (error) return null;
  return data.signedUrl;
}

export function propertyMediaObjectPath(businessId: string, propertyId: string, file: File) {
  const extension =
    file.name
      .split(".")
      .pop()
      ?.toLowerCase()
      .replace(/[^a-z0-9]/g, "") || "bin";
  return `${businessId}/${propertyId}/${crypto.randomUUID()}.${extension}`;
}

export function validatePropertyImage(file: File) {
  if (!file.type.startsWith("image/")) throw new Error("Choose an image file.");
  if (file.size > 10 * 1024 * 1024) throw new Error("Images must be 10 MB or smaller.");
}
