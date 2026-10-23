import { createFileRoute } from "@tanstack/react-router";
import { Documentation } from "../components/documentation";
export const Route = createFileRoute("/")({ component: () => <Documentation slugs={[]} /> });
