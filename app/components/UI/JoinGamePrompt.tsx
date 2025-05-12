import React, { useState } from "react";
import { GameContext } from "@/actor/game.context";
import { IonButton, IonCard, IonCardContent } from "@ionic/react";
import { TextInput } from "./TextInput";
import { cn } from "@/lib/utils";

export const JoinGamePrompt: React.FC = () => {
  const [companyName, setCompanyName] = useState("");
  const [isBtnDisabled, setIsBtnDisabled] = useState(true);
  const sendGameEvent = GameContext.useSend();

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCompanyName(value);
    setIsBtnDisabled(!value.trim());
  };

  const handleJoinGame = () => {
    if (companyName.trim()) {
      sendGameEvent({
        type: "JOIN_GAME",
        name: companyName,
      });
    }
  };

  // Add form submission to capture enter key and improve mobile experience
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isBtnDisabled) {
      handleJoinGame();
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center z-50 bg-black/30">
      <IonCard className="w-[450px] p-8 max-w-[90vw]">
        <IonCardContent>
          <form onSubmit={handleSubmit}>
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
                  onChange={handleInputChange}
                  placeholder="Enter your power company name"
                  className="mb-4"
                  fullWidth
                />

                <p className="text-xs text-gray-600 mb-4">
                  The corporation is formed to generate, transmit, and distribute electrical power
                  throughout the region.
                </p>
              </div>

              <IonButton
                type="submit"
                disabled={isBtnDisabled}
                expand="block"
                strong={true}
                className="touch-manipulation"
              >
                Establish Corporation
              </IonButton>
            </div>
          </form>
        </IonCardContent>
      </IonCard>
    </div>
  );
};
