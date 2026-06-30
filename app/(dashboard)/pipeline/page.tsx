import { redirect } from "next/navigation";

export default function PipelineIndex() {
  redirect("/pipeline/kanban");
}
