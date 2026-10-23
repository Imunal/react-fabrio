import { createFileRoute } from "@tanstack/react-router";
import { createFromSource } from "fumadocs-core/search/server";
import { source } from "../../lib/source";

export const Route = createFileRoute("/api/search.json")({
  server: { handlers: { GET: () => createFromSource(source).staticGET() } },
});
