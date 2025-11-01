/**
 * Trigger page revalidation on the blog website
 * This is typically called after new content is published
 */
export async function revalidateBlogPages(env, paths = ["/blog", "/blog/all"]) {
  const blogUrl = env.BLOG_URL;
  const revalidateSecret = env.REVALIDATE_SECRET;

  if (!blogUrl) {
    console.warn("Revalidate: BLOG_URL not configured, skipping revalidation");
    return { success: false, error: "missing_blog_url" };
  }

  if (!revalidateSecret) {
    console.warn(
      "Revalidate: REVALIDATE_SECRET not configured, skipping revalidation"
    );
    return { success: false, error: "missing_revalidate_secret" };
  }

  const revalidateUrl = `${blogUrl}/api/revalidate`;

  try {
    const response = await fetch(revalidateUrl, {
      method: "POST",
      headers: {
        "x-revalidate-secret": revalidateSecret,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ paths }),
    });

    if (!response.ok) {
      const errorText = await response.text().catch(() => "Unknown error");
      console.error(
        `Revalidate: Failed with status ${response.status}: ${errorText}`
      );
      return {
        success: false,
        error: "revalidate_failed",
        status: response.status,
        message: errorText,
      };
    }

    const result = await response.json().catch(() => ({}));
    console.log("Revalidate: Successfully triggered page revalidation", result);
    return { success: true, result };
  } catch (err) {
    console.error("Revalidate: Error calling revalidate API:", err);
    return { success: false, error: "network_error", message: err.message };
  }
}
