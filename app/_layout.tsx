import { GameProvider } from "@/context/GameContext";
import { Stack } from "expo-router";

export default function RootLayout() {
  return (
    <GameProvider>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="setup-normal" options={{ headerShown: false }} />
        {/* Add this line for our new game screen */}
        <Stack.Screen name="game" options={{ headerShown: false }} />
      </Stack>
    </GameProvider>
  );
}
