const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || "http://127.0.0.1:8000").replace(/\/+$/, "");

export const resolveMenuImageUrl = (imageUrl) => {
  if (!imageUrl) {
    return "";
  }

  if (/^https?:\/\//i.test(imageUrl) || imageUrl.startsWith("data:") || imageUrl.startsWith("blob:")) {
    return imageUrl;
  }

  const normalizedPath = imageUrl.startsWith("/") ? imageUrl : `/${imageUrl}`;

  return `${API_BASE_URL}${normalizedPath}`;
};
