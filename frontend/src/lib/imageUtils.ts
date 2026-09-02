const IMAGE_EXTENSIONS = /\.(png|jpe?g|webp|gif|svg)$/i;

// Known image CDN hosts that serve images without file extensions
const IMAGE_CDN_HOSTS = [
  'images.unsplash.com',
  'source.unsplash.com',
  'picsum.photos',
  'images.pexels.com',
  'cdn.pixabay.com',
  'cloudinary.com',
  'imgur.com',
  'i.imgur.com',
  'res.cloudinary.com',
  'imagekit.io',
  'ik.imagekit.io',
];

export const isLikelyImageUrl = (url: string) => {
  const trimmed = url.trim();
  if (!trimmed) return false;
  if (trimmed.startsWith('data:image/')) return true;
  if (trimmed.startsWith('blob:')) return true;

  // Check if URL has image extension
  const clean = trimmed.split('?')[0];
  if (IMAGE_EXTENSIONS.test(clean)) return true;

  // Check if URL is from a known image CDN
  try {
    const urlObj = new URL(trimmed);
    if (IMAGE_CDN_HOSTS.some(host => urlObj.hostname.includes(host))) {
      return true;
    }
  } catch {
    // Invalid URL, not an image
  }

  return false;
};

const extractMetaImage = (html: string) => {
  const ogMatch = html.match(/property=["']og:image(:url)?["']\s+content=["']([^"']+)["']/i);
  if (ogMatch?.[2]) return ogMatch[2];
  const twitterMatch = html.match(/name=["']twitter:image["']\s+content=["']([^"']+)["']/i);
  if (twitterMatch?.[1]) return twitterMatch[1];
  return null;
};

const normalizeMetaUrl = (sourceUrl: string, metaUrl: string) => {
  if (metaUrl.startsWith('//')) {
    return `https:${metaUrl}`;
  }
  if (metaUrl.startsWith('/')) {
    try {
      return new URL(metaUrl, sourceUrl).toString();
    } catch {
      return metaUrl;
    }
  }
  return metaUrl;
};

/**
 * Last resort for a bare host like "example.com/menu" that isn't obviously an
 * image: fetch the page through r.jina.ai, a public text-extraction proxy, and
 * read its og:image tag.
 *
 * Two things worth knowing before relying on this. It sends the URL a vendor
 * typed to a third party we have no agreement with, and it's an outbound
 * dependency with no SLA — if r.jina.ai is down or rate-limits us, this returns
 * null and the vendor sees no image. It only fires for input that is neither a
 * data/blob URL nor an http(s) URL, so in practice it almost never runs. The
 * plan is to delete it once uploads move to S3 or Cloudinary; see the Images
 * section of BACKEND_API_GUIDE.md.
 */
const resolveViaProxy = async (sourceUrl: string) => {
  const target = sourceUrl.replace(/^https?:\/\//i, '');
  const response = await fetch(`https://r.jina.ai/http://${target}`);
  if (!response.ok) return null;
  const text = await response.text();
  const metaImage = extractMetaImage(text);
  if (!metaImage) return null;
  return normalizeMetaUrl(sourceUrl, metaImage);
};

export const resolveImageUrl = async (url: string) => {
  const trimmed = url.trim();
  if (!trimmed) return '';

  // If it's already recognized as an image URL, return it directly
  if (isLikelyImageUrl(trimmed)) return trimmed;

  // If URL starts with http/https, accept it and let the browser handle it
  // This allows URLs from any source (Google Images, direct links, etc.)
  if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
    return trimmed;
  }

  // For non-http URLs, try to resolve via proxy
  try {
    const resolved = await resolveViaProxy(trimmed);
    if (resolved && isLikelyImageUrl(resolved)) {
      return resolved;
    }
  } catch {
    return '';
  }
  return '';
};
