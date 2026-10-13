export function withPreviewLink(html, environment) {
  if (environment.CF_PAGES !== "1" || environment.CF_PAGES_BRANCH === "main")
    return html;
  return html.replace(
    /<body(?:\s[^>]*)?>/i,
    `$&<aside aria-label="Companion preview" style="padding:12px 20px;background:#101719;color:#eee;text-align:center;font:16px system-ui"><a href="/companion/" style="color:#e5c987;text-decoration:underline">Open companion preview</a></aside>`,
  );
}
