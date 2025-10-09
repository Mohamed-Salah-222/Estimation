import { Handlee_400Regular } from "@expo-google-fonts/handlee";
import { useFonts } from "expo-font";
import React, { useState } from "react";
import { Modal, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";

interface EditPlayerNamesModalProps {
  visible: boolean;
  players: string[];
  onSave: (updatedPlayers: string[]) => void;
  onClose: () => void;
}

export default function EditPlayerNamesModal({ visible, players, onSave, onClose }: EditPlayerNamesModalProps) {
  // Local state to hold temporary player names during editing
  const [tempPlayerNames, setTempPlayerNames] = useState<string[]>(players);

  // Load fonts
  const [fontsLoaded] = useFonts({
    Handlee_400Regular,
  });

  // Update local state when modal opens with new players
  React.useEffect(() => {
    if (visible) {
      setTempPlayerNames(players);
    }
  }, [visible, players]);

  // Handle updating a specific player's name
  const handleNameChange = (index: number, newName: string) => {
    const updated = [...tempPlayerNames];
    updated[index] = newName;
    setTempPlayerNames(updated);
  };

  // Handle focus on input - clear if it's the default name
  const handleFocus = (index: number) => {
    if (tempPlayerNames[index] === `Player ${index + 1}`) {
      const updated = [...tempPlayerNames];
      updated[index] = "";
      setTempPlayerNames(updated);
    }
  };

  // Handle save button press
  const handleSave = () => {
    // Filter out empty names and pass to parent
    const validNames = tempPlayerNames.map((name, index) => name.trim() || `Player ${index + 1}`);
    onSave(validNames);
    onClose();
  };

  // Handle cancel button press
  const handleCancel = () => {
    setTempPlayerNames(players); // Reset to original
    onClose();
  };

  if (!fontsLoaded) {
    return null;
  }

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleCancel}>
      <View style={styles.overlay}>
        <View style={styles.modalContainer}>
          {/* Player name inputs */}
          <View style={styles.inputsContainer}>
            {tempPlayerNames.map((name, index) => (
              <View key={index} style={styles.inputGroup}>
                <TextInput style={styles.input} value={name} onChangeText={(text) => handleNameChange(index, text)} onFocus={() => handleFocus(index)} placeholder={`Player ${index + 1}`} maxLength={15} />
              </View>
            ))}
          </View>

          {/* Action buttons */}
          <View style={styles.buttonsContainer}>
            <TouchableOpacity style={[styles.button, styles.cancelButton]} onPress={handleCancel} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
              <Text style={styles.buttonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.button, styles.saveButton]} onPress={handleSave} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
              <Text style={styles.buttonText}>Save</Text>
            </TouchableOpacity>
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
  },
  modalContainer: {
    width: "50%",
    maxHeight: "60%",
    backgroundColor: "#f5f5f0", // Sticky note yellow/orange
    borderRadius: 4,
    padding: 20,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.3,
    shadowRadius: 10,
    elevation: 8,
  },
  modalTitle: {
    fontFamily: "Handlee_400Regular",
    fontSize: 24,
    color: "#333333",
    textAlign: "center",
    marginBottom: 15,
  },
  inputsContainer: {
    marginBottom: 15,
  },
  inputGroup: {
    marginBottom: 10,
  },
  input: {
    fontFamily: "Handlee_400Regular",
    fontSize: 16,
    backgroundColor: "rgba(255, 255, 255, 0.5)", // Semi-transparent white
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 5,
    borderWidth: 1,
    borderColor: "rgba(0, 0, 0, 0.1)",
  },
  buttonsContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    gap: 10,
  },
  button: {
    flex: 1,
    paddingVertical: 8,
    borderRadius: 6,
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
    elevation: 3,
  },
  cancelButton: {
    backgroundColor: "#ffb3ba", // Light red sticky note
  },
  saveButton: {
    backgroundColor: "#baffc9", // Light green sticky note
  },
  buttonText: {
    fontFamily: "Handlee_400Regular",
    fontSize: 16,
    color: "#333333",
  },
});
