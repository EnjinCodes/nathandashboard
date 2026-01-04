import { redirect } from "next/navigation";

export default function Home() {
  redirect("/dashboard"); // middleware will bounce to /login if not signed in
}
