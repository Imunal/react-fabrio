import { createRootRoute, Link } from "@tanstack/react-router";
import { Root } from "../components/root";
import styles from "../styles.css?url";

export const Route = createRootRoute({
  head: () => ({
    meta: [
      { title: "React Fabrio documentation" },
      {
        name: "description",
        content:
          "Product personalization with React Fabrio: guides, API, contributing and agent documentation.",
      },
      { charSet: "utf-8" },
      { name: "viewport", content: "width=device-width, initial-scale=1" },
    ],
    links: [{ rel: "stylesheet", href: styles }],
  }),
  component: Root,
  notFoundComponent: () => (
    <main className="p-8">
      <h1>Page not found</h1>
      <Link to="/docs/$" params={{ _splat: "" }}>
        Read the documentation
      </Link>
    </main>
  ),
});
