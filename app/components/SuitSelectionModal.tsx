import { Handlee_400Regular } from "@expo-google-fonts/handlee";
import { useFonts } from "expo-font";
import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type Suit = "spades" | "hearts" | "diamonds" | "clubs" | "suns";

type SuitSelectionModalProps = {
  visible: boolean;
  onSelect: (suit: Suit) => void;
  onClose: () => void;
};

export const SuitSelectionModal = ({ visible, onSelect, onClose }: SuitSelectionModalProps) => {
  const suits: { value: Suit; symbol: string }[] = [
    { value: "suns", symbol: "☀" },
    { value: "spades", symbol: "♠" },
    { value: "hearts", symbol: "♥" },
    { value: "diamonds", symbol: "♦" },
    { value: "clubs", symbol: "♣" },
  ];

  const getSuitColor = (suit: Suit) => {
    if (suit === "hearts" || suit === "diamonds") return "#FF3B30";
    if (suit === "suns") return "#FF9500";
    return "#000000";
  };

  // Load fonts
  const [fontsLoaded] = useFonts({
    Handlee_400Regular,
  });

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Modal animationType="slide" transparent={true} visible={visible} onRequestClose={onClose} statusBarTranslucent={true}>
      <View style={styles.centeredView}>
        <View style={styles.modalView}>
          {/* Close button */}
          <TouchableOpacity style={styles.closeButton} onPress={onClose} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
            <Text style={styles.closeButtonText}>×</Text>
          </TouchableOpacity>

          <Text style={styles.modalTitle}>Select Caller Suit</Text>

          <View style={styles.suitsContainer}>
            <View style={styles.row}>
              {suits.map((suit) => (
                <TouchableOpacity
                  key={suit.value}
                  style={styles.suitButton}
                  onPress={() => {
                    onSelect(suit.value);
                    onClose();
                  }}
                >
                  <Text style={[styles.suitSymbol, { color: getSuitColor(suit.value) }]}>{suit.symbol}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  centeredView: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  modalView: {
    width: "50%",
    maxHeight: "50%",
    backgroundColor: "#f5f5f0", // Sticky note color
    borderRadius: 4,
    padding: 15,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  modalTitle: {
    fontFamily: "Handlee_400Regular",
    fontSize: 20,
    color: "#333333",
    textAlign: "center",
    marginBottom: 15,
  },
  closeButton: {
    position: "absolute",
    top: 5,
    right: 5,
    padding: 5,
    zIndex: 10,
  },
  closeButtonText: {
    fontFamily: "Handlee_400Regular",
    fontSize: 30,
    color: "#333333",
    lineHeight: 30,
  },
  suitsContainer: {
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
  },
  suitButton: {
    padding: 8,
    minWidth: 50,
    alignItems: "center",
  },
  suitSymbol: {
    fontFamily: "Handlee_400Regular",
    fontSize: 40,
  },
});
