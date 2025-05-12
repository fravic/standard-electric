import { AuthContext } from "@/auth.context";
import type { LoaderFunctionArgs, MetaFunction } from "@remix-run/cloudflare";
import { json, useLoaderData } from "@remix-run/react";
import { useState } from "react";
import { useNavigate } from "@remix-run/react";
import { HomeBackgroundWrapper } from "@/components/HomeBackgroundWrapper";
import { TextInput } from "@/components/UI/TextInput";
import { Button } from "@/components/UI/Button";
import { Card } from "@/components/UI/Card";

export const meta: MetaFunction = () => {
  return [
    { title: "Standard Electric" },
    {
      name: "description",
      content:
        "Compete to build the biggest electrical company in this multiplayer, sustainability-focused strategy game",
    },
  ];
};

export async function loader({ params, context, request }: LoaderFunctionArgs) {
  // Access userId and sessionId from context
  const { userId, sessionId } = context;

  return json({
    userId,
    sessionId,
    host: context.env.ACTOR_KIT_HOST,
  });
}

export type LoaderData = {
  host: string;
  userId: string;
  sessionId: string;
};

export default function Index() {
  const navigate = useNavigate();
  const [gameCode, setGameCode] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (gameCode.trim()) {
      navigate(`/games/${gameCode.trim()}`);
    }
  };

  return (
    <div className="relative h-screen w-screen">
      <HomeBackgroundWrapper />

      <div className="relative z-10 flex flex-col items-center justify-center h-full p-6">
        <Card className="backdrop-blur-lg max-w-md w-full p-8">
          <h1 className="text-6xl font-bold mb-6 text-foreground text-center font-serif-extra">
            Standard Electric
          </h1>

          <p className="text-lg text-foreground/80 mb-8 text-center">
            Compete to build the biggest electrical company in this multiplayer,
            sustainability-focused strategy game.
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col gap-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="gameCode" className="text-foreground font-semibold">
                Enter Game Code
              </label>
              <TextInput
                value={gameCode}
                onChange={(e) => setGameCode(e.target.value)}
                placeholder="Enter game code..."
                fullWidth
              />
            </div>

            <Button fullWidth variant="primary">
              Join Game
            </Button>
          </form>
        </Card>
      </div>
    </div>
  );
}
