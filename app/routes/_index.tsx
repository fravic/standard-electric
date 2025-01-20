import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json } from "@remix-run/react";

export const meta: MetaFunction = () => {
  return [
    { title: "Standard Electric" },
    {
      name: "description",
      content: "A game",
    },
  ];
};

// const fetchTodoActor = createActorFetch<TodoMachine>({
//   actorType: "todo",
//   host: context.env.ACTOR_KIT_HOST,
// });

export async function loader({ params, context, request }: LoaderFunctionArgs) {
  // const host = context.env.ACTOR_KIT_HOST;
  // const gameId = crypto.randomUUID();
  // const deviceType = getDeviceType(request.headers.get("user-agent"));
  // return json({ gameId, deviceType, host });
  return json({});
}

export type LoaderData = {
  gameId: string;
  deviceType: string;
  host: string;
};

export default function Index() {
  return <>Standard Electric</>;
}
