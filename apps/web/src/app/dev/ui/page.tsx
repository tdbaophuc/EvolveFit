import { notFound } from "next/navigation";
import { UiPreview } from "./ui-preview";

/** Development-only gallery of UI primitives (404 in production builds). */
export default function DevUiPage() {
  if (process.env.NODE_ENV === "production") notFound();
  return <UiPreview />;
}
