// Resolve relative source links without depending on Node APIs in the browser.
export const resolveDocLink = (pagePath: string, href: string) => {
  if (/^(?:[a-z][a-z\d+.-]*:|#|\/)/i.test(href)) return href;
  const target = new URL(href, `https://repository.invalid/apps/docs/content/${pagePath}`);
  const path = decodeURIComponent(target.pathname);
  const prefix = "/apps/docs/content/";
  if (path.startsWith(prefix) && /\.mdx?$/.test(path)) {
    const slug = path
      .slice(prefix.length)
      .replace(/\.mdx?$/, "")
      .replace(/(?:^|\/)index$/, "");
    return `/react-fabrio/docs${slug ? `/${slug}` : ""}${target.search}${target.hash}`;
  }
  return `https://github.com/Imunal/react-fabrio/blob/main${target.pathname}${target.search}${target.hash}`;
};
