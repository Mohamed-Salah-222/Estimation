import type { Game } from "@/context/GameContext";
import { useFonts } from "@expo-google-fonts/cairo";
import { Handlee_400Regular } from "@expo-google-fonts/handlee";
import { useRouter } from "expo-router";
import React, { useState } from "react";
import { Alert, StyleSheet, Text, TouchableOpacity, View } from "react-native";
import EditPlayerNamesModal from "./components/EditPlayersNamesModal";

// ============================================================================
// GAME CARD COMPONENT
// ============================================================================
/**
 * GameCard - Individual game display component
 * Features:
 * - Top half: 4 mini sticky notes showing player names
 * - Bottom half: Creation date, Edit/Delete buttons, and rounds remaining
 * - Delete mode: Shows DELETE overlay and red border
 * - Navigates to game screen on press (when not in delete mode)
 */
export default function GameCard({ game, onDelete, isDeleteMode, updatePlayerName }: { game: Game; onDelete: () => void; isDeleteMode: boolean; updatePlayerName: (gameId: string, playerIndex: number, name: string) => void }) {
  // ===== HOOKS =====
  const router = useRouter();
  const [isEditModalVisible, setEditModalVisible] = useState(false);

  // ===== FONTS =====
  const [fontsLoaded] = useFonts({
    Handlee_400Regular,
  });

  // ===== HANDLERS =====

  /**
   * Handle card press - Navigate to game or trigger delete based on mode
   */
  const handleCardPress = () => {
    if (isDeleteMode) {
      onDelete();
    } else {
      router.push(`/game?gameId=${game.id}`);
    }
  };

  /**
   * Show confirmation alert before deleting
   */
  const handleDeletePress = () => {
    Alert.alert("Delete Game", "Are you sure you want to delete this game?", [
      {
        text: "Cancel",
        onPress: () => console.log("Cancel Pressed"),
        style: "cancel",
      },
      {
        text: "Delete",
        onPress: onDelete,
        style: "destructive",
      },
    ]);
  };

  /**
   * Handle edit button press - Open modal
   */
  const handleEditPress = () => {
    setEditModalVisible(true);
  };

  /**
   * Handle saving player names from modal
   */
  const handleSavePlayerNames = (updatedPlayers: string[]) => {
    updatedPlayers.forEach((name, index) => {
      if (name !== game.players[index]) {
        updatePlayerName(game.id, index, name);
      }
    });
  };

  // ===== HELPER FUNCTIONS =====

  /**
   * Get total rounds based on game mode
   */
  const getRoundsRemaining = () => {
    switch (game.mode) {
      case "mini":
        return 10;
      case "micro":
        return 5;
      default:
        return 18; // classic
    }
  };

  /**
   * Format date to MM/DD/YYYY
   */
  const formatDate = (dateString: string) => {
    const date = new Date();
    const month = date.getMonth() + 1;
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  // ===== COMPUTED VALUES =====
  const remainingRounds = getRoundsRemaining();
  const createdDate = game.createdDate ? formatDate(game.createdDate) : formatDate("Today");

  // ===== WAIT FOR FONTS TO LOAD =====
  if (!fontsLoaded) {
    return null;
  }

  // ===== RENDER =====
  return (
    <>
      <TouchableOpacity onPress={handleCardPress} style={[styles.gameCard, isDeleteMode && styles.deleteModeCard]} activeOpacity={0.8}>
        {/* Delete mode indicator overlay */}
        {/* TOP HALF - 4 Mini Sticky Notes with Player Names */}
        <View style={styles.topHalf}>
          {/* First row: Player 1 & Player 2 */}
          <View style={styles.stickyRow}>
            <View style={styles.miniSticky}>
              <Text style={styles.playerName} numberOfLines={1}>
                {game.players[0]}
              </Text>
            </View>
            <View style={styles.miniSticky}>
              <Text style={styles.playerName} numberOfLines={1}>
                {game.players[1]}
              </Text>
            </View>
          </View>

          {/* Second row: Player 3 & Player 4 */}
          <View style={styles.stickyRow}>
            <View style={styles.miniSticky}>
              <Text style={styles.playerName} numberOfLines={1}>
                {game.players[2]}
              </Text>
            </View>
            <View style={styles.miniSticky}>
              <Text style={styles.playerName} numberOfLines={1}>
                {game.players[3]}
              </Text>
            </View>
          </View>
        </View>

        {/* BOTTOM HALF - Date, Buttons, and Rounds */}
        <View style={styles.bottomHalf}>
          {/* LEFT SIDE - Date & Action Buttons */}
          <View style={styles.bottomLeft}>
            {/* Creation date display */}
            <View style={styles.dateSection}>
              <Text style={styles.dateText}>{createdDate}</Text>
            </View>

            {/* Edit & Delete buttons */}
            <View style={styles.buttonsSection}>
              <TouchableOpacity
                style={styles.actionButton}
                onPress={(e) => {
                  e.stopPropagation();
                  handleEditPress();
                }}
              >
                <Text style={styles.actionButtonText}>Edit</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={(e) => {
                  e.stopPropagation();
                  handleDeletePress();
                }}
              >
                <Text style={styles.actionButtonText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>

          {/* RIGHT SIDE - Rounds Remaining Display */}
          <View style={styles.bottomRight}>
            <Text style={styles.roundsNumber}>{remainingRounds}</Text>
            <Text style={styles.roundsText}>Rounds{"\n"}Left</Text>
          </View>
        </View>
      </TouchableOpacity>

      {/* Edit Player Names Modal */}
      <EditPlayerNamesModal visible={isEditModalVisible} players={game.players} onSave={handleSavePlayerNames} onClose={() => setEditModalVisible(false)} />
    </>
  );
}

// ============================================================================
// STYLES
// ============================================================================
const styles = StyleSheet.create({
  // Main card container
  gameCard: {
    width: "31%",
    aspectRatio: 1,
    backgroundColor: "#ffffff",
    borderRadius: 8,
    padding: 8,
    marginBottom: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.05)",
    overflow: "hidden",
  },
  deleteModeCard: {
    borderColor: "#DC143C",
    borderWidth: 2,
    fontFamily: "Handlee_400Regular",
  },
  deleteIndicator: {
    fontFamily: "Handlee_400Regular",
    position: "absolute",
    top: "40%",
    width: "100%",
    textAlign: "center",
    color: "rgba(220, 20, 60, 0.7)",
    fontSize: 24,
    transform: [{ rotate: "-15deg" }],
    zIndex: 10,
  },

  // Top half - Player names section
  topHalf: {
    flex: 1,
    justifyContent: "space-around",
    padding: 4,
  },
  stickyRow: {
    flex: 1,
    flexDirection: "row",
    justifyContent: "space-around",
    alignItems: "center",
  },
  miniSticky: {
    width: "45%",
    height: "80%",
    backgroundColor: "#ffd4a3",
    borderRadius: 2,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
    elevation: 6,
    padding: 4,
  },
  playerName: {
    fontFamily: "Handlee_400Regular",
    fontSize: 12,
    color: "#333333",
    textAlign: "center",
  },

  // Bottom half container
  bottomHalf: {
    flex: 1,
    flexDirection: "row",
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.1)",
    paddingTop: 6,
  },

  // Bottom left - Date and buttons
  bottomLeft: {
    flex: 2,
    justifyContent: "space-between",
    paddingRight: 6,
  },
  dateSection: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  dateText: {
    fontFamily: "Handlee_400Regular",
    fontSize: 14,
    color: "#666666",
    textAlign: "center",
  },
  buttonsSection: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-end",
    gap: 4,
  },
  actionButton: {
    flex: 1,
    paddingVertical: 4,
    paddingHorizontal: 6,
    borderRadius: 4,
    backgroundColor: "#baffc9",
    justifyContent: "center",
    alignItems: "center",
  },
  deleteButton: {
    backgroundColor: "#ffb3b3",
  },
  actionButtonText: {
    fontFamily: "Handlee_400Regular",
    fontSize: 10,
    color: "#333333",
  },

  // Bottom right - Rounds remaining
  bottomRight: {
    flex: 1,
    backgroundColor: "#fffacd",
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    paddingVertical: 4,
  },
  roundsNumber: {
    fontFamily: "Handlee_400Regular",
    fontSize: 28,
    color: "#333333",
  },
  roundsText: {
    fontFamily: "Handlee_400Regular",
    fontSize: 9,
    color: "#666666",
    textAlign: "center",
    marginTop: 2,
  },
});
