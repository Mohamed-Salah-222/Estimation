import { useGame } from "@/context/GameContext";
import { useFonts } from "@expo-google-fonts/cairo";
import { Handlee_400Regular } from "@expo-google-fonts/handlee";
import * as NavigationBar from "expo-navigation-bar";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Dimensions, ScrollView, StatusBar, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import GameCard from "./GameCard";

const { width, height } = Dimensions.get("window");

// ============================================================================
// GAME SETUP SCREEN COMPONENT
// ============================================================================
/**
 * Game Setup Screen - Game management interface
 * Features:
 * - Left sidebar with game creation buttons (Classic, Mini, Micro)
 * - Scrollable grid of existing game cards
 * - Delete mode toggle for removing games
 * - Notebook-style background matching landing page
 */
export default function GameSetupScreen() {
  // ===== STATE =====
  const [isDeleteMode, setIsDeleteMode] = useState(false);

  // ===== HOOKS =====
  const router = useRouter();
  const { games, addGame, deleteGame, updatePlayerName } = useGame();

  // ===== FONTS =====
  const [fontsLoaded] = useFonts({
    Handlee_400Regular,
  });

  // ===== HIDE NAVIGATION BAR ON MOUNT =====
  React.useEffect(() => {
    const hideNavBar = async () => {
      await NavigationBar.setVisibilityAsync("hidden");
      await NavigationBar.setBehaviorAsync("inset-swipe");
    };
    hideNavBar();
  }, []);

  // ===== WAIT FOR FONTS TO LOAD =====
  if (!fontsLoaded) {
    return null;
  }

  // ===== GENERATE NOTEBOOK BACKGROUND LINES =====
  const lines = [];
  const lineSpacing = 20;
  const numberOfLines = Math.floor(height / lineSpacing);

  for (let i = 0; i < numberOfLines; i++) {
    lines.push(<View key={`line-${i}`} style={[styles.horizontalLine, { top: i * lineSpacing }]} />);
  }

  // ===== RENDER =====
  return (
    <View style={styles.container}>
      <StatusBar hidden={true} />

      {/* Black edges on left and right */}

      {/* Notebook background lines */}
      {lines}

      {/* LEFT SIDEBAR - Action buttons */}
      <View style={styles.sidebar}>
        {/* Back button */}
        <TouchableOpacity style={[styles.stickyNote, { top: 20 }]} onPress={() => router.back()} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
          <Text style={styles.stickyText}>← Back</Text>
        </TouchableOpacity>

        {/* Create Classic game (18 rounds) */}
        <TouchableOpacity style={[styles.stickyNote, { top: 90 }]} onPress={() => addGame("classic")} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
          <Text style={styles.stickyText}>Classic +</Text>
        </TouchableOpacity>

        {/* Create Mini game (10 rounds) */}
        <TouchableOpacity style={[styles.stickyNote, { top: 160 }]} onPress={() => addGame("mini")} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
          <Text style={styles.stickyText}>Mini +</Text>
        </TouchableOpacity>

        {/* Create Micro game (5 rounds) */}
        <TouchableOpacity style={[styles.stickyNote, { top: 230 }]} onPress={() => addGame("micro")} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
          <Text style={styles.stickyText}>Micro +</Text>
        </TouchableOpacity>

        {/* Toggle delete mode */}
        <TouchableOpacity style={[styles.stickyNote, { top: 300 }, isDeleteMode ? styles.deleteNoteActive : styles.deleteNote]} onPress={() => setIsDeleteMode(!isDeleteMode)} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
          <Text style={styles.stickyText}>{isDeleteMode ? "Cancel" : "Delete"}</Text>
        </TouchableOpacity>
      </View>

      {/* RIGHT SIDE - Scrollable grid of game cards */}
      <ScrollView style={styles.mainContent} contentContainerStyle={styles.scrollContent}>
        <View style={styles.gridContainer}>
          {games.length === 0 ? (
            // Empty state message
            <View style={styles.noGamesContainer}>
              <Text style={styles.noGamesText}>Click a + button to create your first game!</Text>
            </View>
          ) : (
            // Render all existing games
            games.map((game) => <GameCard key={game.id} game={game} onDelete={() => deleteGame(game.id)} isDeleteMode={isDeleteMode} updatePlayerName={updatePlayerName} />)
          )}
        </View>
      </ScrollView>
    </View>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  // Main container - notebook background
  container: {
    flex: 1,
    backgroundColor: "#faffebff",
  },

  // Notebook horizontal lines
  horizontalLine: {
    position: "absolute",
    left: 0,
    right: 0,
    height: 1,
    backgroundColor: "rgba(0, 0, 0, 0.1)",
  },

  // Black edges on sides
  leftEdge: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 30,
    backgroundColor: "#000000",
    zIndex: 100,
  },
  rightEdge: {
    position: "absolute",
    right: 0,
    top: 0,
    bottom: 0,
    width: 30,
    backgroundColor: "#000000",
    zIndex: 100,
  },

  // Left sidebar container
  sidebar: {
    position: "absolute",
    left: 30,
    top: 0,
    bottom: 0,
    width: 150,
    zIndex: 50,
  },

  // Sticky note buttons
  stickyNote: {
    position: "absolute",
    left: 20,
    width: 110,
    height: 60,
    backgroundColor: "#ffd4a3",
    borderRadius: 15,
    shadowColor: "#000",
    shadowOffset: { width: 1, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
    padding: 8,
    justifyContent: "center",
    alignItems: "center",
    transform: [{ rotate: "-3deg" }],
  },
  deleteNote: {
    backgroundColor: "#ffb3b3",
  },
  deleteNoteActive: {
    backgroundColor: "#ff6b6b",
    transform: [{ rotate: "0deg" }],
  },
  stickyText: {
    fontFamily: "Handlee_400Regular",
    fontSize: 16,
    color: "#333333",
    textAlign: "center",
  },

  // Main content area (right side)
  mainContent: {
    flex: 1,
    marginLeft: 180,
    marginRight: 30,
  },
  scrollContent: {
    padding: 20,
  },

  // Grid container for game cards
  gridContainer: {
    flexDirection: "row",
    flexWrap: "wrap",
    justifyContent: "flex-start",
    gap: 15,
  },
  gameCard: {
    width: "31%",
    aspectRatio: 1,
    minWidth: 0,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 12,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
  },

  // Empty state when no games exist
  noGamesContainer: {
    width: "100%",
    height: 200,
    justifyContent: "center",
    alignItems: "center",
  },
  noGamesText: {
    fontFamily: "Handlee_400Regular",
    fontSize: 24,
    color: "#666",
    textAlign: "center",
  },
});
