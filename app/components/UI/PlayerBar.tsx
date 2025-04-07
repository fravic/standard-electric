import React from "react";
import { Player } from "@/actor/game.types";
import { formatPowerKWh } from "@/lib/power/formatPower";
import { Card } from "./Card";
import { cn } from "@/lib/utils";
import { Wallet, Lightning } from "@phosphor-icons/react";

const POWER_SELL_GOAL_KWH = 1_000_000_000; // 1 TWh in kWh

interface PlayerBarProps {
  player: Player;
  isCurrentPlayer?: boolean;
}

export const PlayerBar: React.FC<PlayerBarProps> = ({ player, isCurrentPlayer }) => {
  const playerColor = player.color;

  return (
    <Card
      variant={isCurrentPlayer ? "primary" : "secondary"}
      className={cn(
        "mb-2.5",
        isCurrentPlayer && "border-2 border-solid",
        isCurrentPlayer && { "border-primary": !playerColor },
        "flex flex-col gap-2"
      )}
    >
      <div className="flex items-center gap-2">
        <div className="w-4 flex justify-center items-center">
          <div className="h-2.5 w-2.5 rounded-[1px]" style={{ backgroundColor: playerColor }} />
        </div>
        <div className="font-serif font-extra-bold text-base md:text-lg">{player.name}</div>
      </div>

      <div className="flex items-center gap-5">
        <div className="flex items-center gap-2">
          <div className="w-4 flex justify-center items-center">
            <Wallet size={16} weight="bold" />
          </div>
          <span>${Math.floor(player.money)}</span>
        </div>

        <div className="flex items-center gap-2">
          <div className="w-4 flex justify-center items-center">
            <Lightning size={16} weight="bold" />
          </div>
          <span>{formatPowerKWh(player.powerSoldKWh)}</span>
        </div>
      </div>
    </Card>
  );
};
