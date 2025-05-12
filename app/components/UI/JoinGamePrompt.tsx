import React, { useState } from "react";
import { GameContext } from "@/actor/game.context";
import { IonButton, IonCard, IonCardContent } from "@ionic/react";
import { TextInput } from "./TextInput";
import { cn } from "@/lib/utils";

export const JoinGamePrompt: React.FC = () => {
  const [companyName, setCompanyName] = useState("");
  const sendGameEvent = GameContext.useSend();

  const handleJoinGame = () => {
    if (companyName.trim()) {
      sendGameEvent({
        type: "JOIN_GAME",
        name: companyName,
      });
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30">
      <IonCard className="w-[450px] p-8 max-w-[90vw]">
        <IonCardContent>
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-2">Certificate of Incorporation</h2>
            <p className="text-sm mb-6 italic">Standard Electric Authority</p>

            <div className="border-2 border-gray-300 p-4 mb-6 rounded">
              <p className="mb-4 text-sm">
                Be it known that the undersigned hereby establishes a Power & Utility Corporation
                under the laws of the Grid Authority.
              </p>

              <label className="block text-left mb-2 font-semibold">Corporate Name:</label>
              <TextInput
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                placeholder="Enter your power company name"
                className="mb-4"
                fullWidth
              />

              <p className="text-xs text-gray-600 mb-4">
                The corporation is formed to generate, transmit, and distribute electrical power
                throughout the region.
              </p>
            </div>

            <IonButton onClick={handleJoinGame} disabled={!companyName.trim()} expand="block">
              File & Establish Corporation
            </IonButton>
          </div>
        </IonCardContent>
      </IonCard>
    </div>
  );
};
