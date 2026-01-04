import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import DashboardShell from "./DashboardShell";

export default async function DashboardPage() {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return <DashboardShell userName={session.user?.name || "User"} />;
}
