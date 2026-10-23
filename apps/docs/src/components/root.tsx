import { HeadContent, Outlet, Scripts } from "@tanstack/react-router";
import { RootProvider } from "fumadocs-ui/provider/tanstack";
import { SiteLink } from "../lib/site-link";

export const Root = () => {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <HeadContent />
      </head>
      <body className="flex min-h-screen flex-col">
        <RootProvider
          components={{ Link: SiteLink }}
          search={{ options: { type: "static", api: "/react-fabrio/api/search.json" } }}
        >
          <Outlet />
        </RootProvider>
        <Scripts />
      </body>
    </html>
  );
};
