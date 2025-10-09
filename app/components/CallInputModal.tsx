import { Handlee_400Regular } from "@expo-google-fonts/handlee";
import { useFonts } from "expo-font";
import React from "react";
import { Modal, StyleSheet, Text, TouchableOpacity, View } from "react-native";

type CallInputModalProps = {
  visible: boolean;
  onSelect: (call: number) => void;
  onClose: () => void;
  currentRoundCalls?: (number | null)[]; // Calls made in the current round
  callerBid?: number | null; // Add this - the caller's bid
};

export const CallInputModal = ({ visible, onSelect, onClose, currentRoundCalls, callerBid }: CallInputModalProps) => {
  // Load fonts
  const [fontsLoaded] = useFonts({
    Handlee_400Regular,
  });

  // Check if a number should be disabled
  const isDisabled = (call: number): boolean => {
    // Only disable if a caller has been selected AND made a bid
    if (callerBid === null || callerBid === undefined) return false;

    // Disable numbers higher than caller's bid
    return call > callerBid;
  };

  // Handle number press
  const handleNumberPress = (call: number) => {
    if (!isDisabled(call)) {
      onSelect(call);
    }
  };

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

          <Text style={styles.modalTitle}>Select Your Call</Text>
          <View style={styles.numbersContainer}>
            {/* First Row: 0 to 7 */}
            <View style={styles.row}>
              {[0, 1, 2, 3, 4, 5, 6, 7].map((call) => {
                const disabled = isDisabled(call);
                return (
                  <TouchableOpacity key={call} style={[styles.numberButton, disabled && styles.disabledButton]} onPress={() => handleNumberPress(call)} disabled={disabled} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                    <Text style={[styles.numberText, disabled && styles.disabledText]}>{call}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            {/* Second Row: 8 to 13 */}
            <View style={styles.secondRow}>
              {[8, 9, 10, 11, 12, 13].map((call) => {
                const disabled = isDisabled(call);
                return (
                  <TouchableOpacity key={call} style={[styles.numberButton, disabled && styles.disabledButton]} onPress={() => handleNumberPress(call)} disabled={disabled} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                    <Text style={[styles.numberText, disabled && styles.disabledText]}>{call}</Text>
                  </TouchableOpacity>
                );
              })}
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
    backgroundColor: "#f5f5f0", // Off-white background
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
  numbersContainer: {
    alignItems: "center",
  },
  row: {
    flexDirection: "row",
    justifyContent: "center",
    marginBottom: 10,
  },
  secondRow: {
    flexDirection: "row",
    justifyContent: "center",
    gap: 10,
    marginBottom: 10,
    width: "100%",
    paddingHorizontal: 0,
  },
  numberButton: {
    padding: 8,
    minWidth: 35,
    alignItems: "center",
  },
  disabledButton: {
    opacity: 1,
  },
  numberText: {
    fontFamily: "Handlee_400Regular",
    fontSize: 28,
    color: "#333333",
  },
  disabledText: {
    color: "#FF3B30", // Dark red color for disabled numbers
  },
});
