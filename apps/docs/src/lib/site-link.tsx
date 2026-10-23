import { Link } from "@tanstack/react-router";
import type { Framework } from "fumadocs-core/framework";

// Source URLs include the deployment base; TanStack's `to` expects a route path.
export const SiteLink: Framework["Link"] = ({ href = "", prefetch = true, children, ...props }) => {
  if (!href.startsWith("/react-fabrio"))
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  return (
    <Link
      to={href.replace(/^\/react-fabrio(?=\/|$)/, "") || "/"}
      preload={prefetch ? "intent" : false}
      {...props}
    >
      {children}
    </Link>
  );
};
