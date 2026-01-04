// app/api/switch-state/route.ts
import { kv } from "@vercel/kv";
import { getServerSession } from "next-auth";

type SwitchState = {
  installedVersion: string;
  installedAtISO: string;
};

const KEY = "cisco_switch_state_v1";

export async function GET() {
  const state = (await kv.get<SwitchState>(KEY)) ?? null;
  return Response.json({ state });
}

export async function POST(req: Request) {
  const body = (await req.json()) as Partial<SwitchState>;

  if (!body.installedVersion || !body.installedAtISO) {
    return new Response("Missing installedVersion/installedAtISO", { status: 400 });
  }

  const state: SwitchState = {
    installedVersion: body.installedVersion,
    installedAtISO: body.installedAtISO,
  };

  await kv.set(KEY, state);
  return Response.json({ ok: true, state });
}

export async function DELETE() {
  // Require auth so random people can’t reset your switch state
  const session = await getServerSession();
  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  await kv.del(KEY);
  return Response.json({ ok: true });
}
