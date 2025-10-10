import { Handlee_400Regular } from "@expo-google-fonts/handlee";
import { useFonts } from "expo-font";
import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

interface WinnerModalProps {
  visible: boolean;
  rankings: {
    playerName: string;
    score: number;
    rank: number;
  }[];
  onClose: () => void;
}

export default function WinnerModal({ visible, rankings, onClose }: WinnerModalProps) {
  // Load fonts
  const [fontsLoaded] = useFonts({
    Handlee_400Regular,
  });

  // Get rank title and emoji
  const getRankInfo = (rank: number) => {
    switch (rank) {
      case 1:
        return { title: "King", color: "#FFD700" };
      case 2:
        return { title: "S-King", color: "#C0C0C0" };
      case 3:
        return { title: "S-Koz", color: "#CD7F32" };
      case 4:
        return { title: "Koz", color: "#999999" };
      default:
        return { title: "", color: "#333333" };
    }
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>

          {/* Title */}
          <Text style={styles.title}> Game Over! </Text>

          {/* Rankings List */}
          <View style={styles.rankingsContainer}>
            {rankings.map((player, index) => {
              const rankInfo = getRankInfo(player.rank);
              return (
                <View key={index} style={[styles.playerRow, player.rank === 1 && styles.kingRow]}>
                  <View style={styles.playerInfo}>
                    <Text style={styles.playerName}>{player.playerName}:</Text>
                    <Text style={[styles.rankTitle, { color: rankInfo.color }]}>{rankInfo.title}</Text>
                  </View>
                  <Text style={styles.playerScore}>({player.score} pts)</Text>
                </View>
              );
            })}
          </View>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "transparent",
  },
  modalContainer: {
    width: "35%",
    backgroundColor: "#f5f5f0",
    borderRadius: 4,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
    position: "relative",
  },
  closeButton: {
    position: "absolute",
    top: 8,
    right: 8,
    width: 32,
    height: 32,
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  closeButtonText: {
    fontFamily: "Handlee_400Regular",
    fontSize: 32,
    color: "#333333",
    lineHeight: 32,
  },
  title: {
    fontFamily: "Handlee_400Regular",
    fontSize: 20,
    color: "#333333",
    textAlign: "center",
    marginBottom: 8,
    fontWeight: "bold",
  },
  rankingsContainer: {
    gap: 6,
  },
  playerRow: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "rgba(255, 255, 255, 0.5)",
    borderRadius: 4,
    padding: 6,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
    gap: 8,
  },
  kingRow: {
    backgroundColor: "rgba(255, 215, 0, 0.2)",
    borderColor: "#FFD700",
    borderWidth: 2,
  },
  playerInfo: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
  },
  playerName: {
    fontFamily: "Handlee_400Regular",
    fontSize: 15,
    color: "#333333",
    fontWeight: "600",
  },
  rankTitle: {
    fontFamily: "Handlee_400Regular",
    fontSize: 13,
    fontWeight: "bold",
  },
  playerScore: {
    fontFamily: "Handlee_400Regular",
    fontSize: 13,
    color: "#666666",
  },
});
