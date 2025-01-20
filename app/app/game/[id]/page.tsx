import { createAccessToken, createActorFetch } from "actor-kit/server";

import { GameProvider } from "../../../actor/game.context";
import { Game } from "../../../components/Game";
import { GameMachine } from "../../../actor/game.machine";
import { PLAYER_ID } from "@/lib/constants";

const host = process.env.ACTOR_KIT_HOST!;
const signingKey = process.env.ACTOR_KIT_SECRET!;

const fetchGameActor = createActorFetch<GameMachine>({
  actorType: "game",
  host,
});

export default async function GamePage(props: { params: { id: string } }) {
  const { id } = await props.params;

  const accessToken = await createAccessToken({
    signingKey,
    actorId: id,
    actorType: "game",
    callerId: PLAYER_ID,
    callerType: "client",
  });

  const payload = await fetchGameActor({
    actorId: id,
    accessToken,
  });

  return (
    <GameProvider
      actorId={id}
      host={host}
      checksum={payload.checksum}
      accessToken={accessToken}
      initialSnapshot={payload.snapshot}
    >
      <Game />
    </GameProvider>
  );
}
