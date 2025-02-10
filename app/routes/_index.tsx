import { AuthContext } from "@/auth.context";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json, useLoaderData } from "@remix-run/react";

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
  // Access userId and sessionId from context
  const { userId, sessionId } = context;

  // Example: Fetch user data from KV
  const userData = await context.env.KV_STORAGE.get(`user:${userId}`);

  return json({
    userId,
    sessionId,
    userData: userData ? JSON.parse(userData) : null,
  });
}

export type LoaderData = {
  gameId: string;
  deviceType: string;
  host: string;
  userId: string;
  sessionId: string;
  userData: any;
};

export default function Index() {
  const { sessionId, userData } = useLoaderData<LoaderData>();
  const userId = AuthContext.useSelector((state) => state.userId);

  return (
    <div>
      <h1>Standard Electric</h1>
      <div>
        Logged in as: {userId} ({sessionId})
      </div>
      <pre>{JSON.stringify(userData, null, 2)}</pre>
    </div>
  );
}
