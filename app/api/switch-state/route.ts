import { kv } from "@vercel/kv";

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
