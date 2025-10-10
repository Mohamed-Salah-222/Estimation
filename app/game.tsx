import { useGame } from "@/context/GameContext";
import { useFonts } from "@expo-google-fonts/cairo";
import { Handlee_400Regular } from "@expo-google-fonts/handlee";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import FontAwesome from "@expo/vector-icons/FontAwesome";
import FontAwesome6 from "@expo/vector-icons/FontAwesome6";
import Foundation from "@expo/vector-icons/Foundation";
import MaterialIcons from "@expo/vector-icons/MaterialIcons";
import * as NavigationBar from "expo-navigation-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Alert, Dimensions, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { CallInputModal } from "./components/CallInputModal";
import { SuitSelectionModal } from "./components/SuitSelectionModal";
import WinnerModal from "./components/WinnerModal";

const { width, height } = Dimensions.get("window");

// ============================================================================
// GAME PAGE COMPONENT
// ============================================================================
/**
 * Game Page - Main game screen with scoresheet
 * Features:
 * - Fixed header with player names and column labels
 * - Scrollable content showing all rounds with 4 sub-columns per player:
 *   1. Win/Loss indicator (✓/-)
 *   2. Score for the round
 *   3. Caller indicator (C/-)
 *   4. Player's call/bid
 * - +/- column showing difference from 13 tricks
 * - Current round interactions (call input, next round button)
 * - Fixed footer with back button
 */
export default function GamePage() {
  // ===== STATE =====

  // const [currentGame, setCurrentGame] = useState<Game | null>(null);
  const [showWinnerModal, setShowWinnerModal] = useState(false);

  const [isModalVisible, setModalVisible] = useState(false);
  const [isResultModalVisible, setResultModalVisible] = useState(false);
  const [editingCell, setEditingCell] = useState<{ roundIndex: number; playerIndex: number } | null>(null);
  const [editingResult, setEditingResult] = useState<{ roundIndex: number; playerIndex: number } | null>(null);
  const [editingPlayerName, setEditingPlayerName] = useState<number | null>(null);
  const [tempPlayerName, setTempPlayerName] = useState("");

  const [isSuitModalVisible, setSuitModalVisible] = useState(false); // ADD THIS
  const [editingCaller, setEditingCaller] = useState<{ roundIndex: number; playerIndex: number } | null>(null); // ADD THIS

  // ===== HOOKS =====
  const router = useRouter();
  const { gameId } = useLocalSearchParams<{ gameId: string }>();
  const {
    games,
    updateCall,
    updateRoundDifference,
    startPlayingRound,
    updateCurrentRound,
    updateResult,
    setCaller, // ADD THIS
    finalizeRound,
    setDashCall,
    markEveryoneLost,
    addExtraRound,
    undoRound,
    updatePlayerName,
    setManualRisk,
    clearManualRisk,
  } = useGame();

  // ===== FONTS =====
  const [fontsLoaded] = useFonts({
    Handlee_400Regular,
  });

  // ===== LOAD GAME DATA =====

  const currentGame = games.find((g) => g.id === gameId) || null;

  const [currentRound, setCurrentRound] = useState(currentGame?.currentRound || 1);

  // Calculate player scores for leader/last place indicators
  const playerScores = useMemo(() => {
    if (!currentGame) return [];
    return currentGame.players.map((_, pIndex) => {
      return currentGame.scores.reduce((total, round) => total + (round[pIndex] || 0), 0);
    });
  }, [currentGame?.scores, currentGame?.players]);

  const maxScore = useMemo(() => Math.max(...playerScores), [playerScores]);
  const minScore = useMemo(() => Math.min(...playerScores), [playerScores]);
  const hasScores = useMemo(() => maxScore > 0, [maxScore]);

  // DEBUG - Add this temporarily
  console.log("=== SCORE DEBUG ===");
  console.log("playerScores:", playerScores);
  console.log("maxScore:", maxScore);
  console.log("minScore:", minScore);
  console.log("hasScores:", hasScores);
  console.log("Players:", currentGame?.players);

  // ===== HIDE NAVIGATION BAR ON MOUNT =====
  React.useEffect(() => {
    const hideNavBar = async () => {
      await NavigationBar.setVisibilityAsync("hidden");
      await NavigationBar.setBehaviorAsync("inset-swipe");
    };
    hideNavBar();
  }, []);

  useEffect(() => {
    if (currentGame && currentRound !== currentGame.currentRound) {
      updateCurrentRound(currentGame.id, currentRound);
    }
  }, [currentRound, currentGame?.id]);

  useEffect(() => {
    if (currentGame && currentGame.currentRound) {
      setCurrentRound(currentGame.currentRound);
    }
  }, [currentGame?.id]);

  // ===== COMPUTED VALUES WITH useMemo =====
  // This ensures values recalculate when calls are updated
  const currentRoundCalls = useMemo(() => {
    return currentGame ? currentGame.calls[currentRound - 1] || [] : [];
  }, [currentGame?.calls, currentRound]);

  const allPlayersCalled = useMemo(() => {
    return currentRoundCalls.length > 0 && currentRoundCalls.every((call) => call !== null);
  }, [currentRoundCalls]);

  const totalCalls = useMemo(() => {
    return allPlayersCalled ? currentRoundCalls.reduce((sum, call) => (sum ?? 0) + (call ?? 0), 0) : 0;
  }, [allPlayersCalled, currentRoundCalls]) as number;

  const isNextRoundDisabled = useMemo(() => {
    if (!currentGame || !allPlayersCalled || totalCalls === 13) {
      return true;
    }

    // Check if a caller has been selected for current round
    const currentRoundIndex = currentRound - 1;
    const callerIndex = currentGame.isCaller[currentRoundIndex].findIndex((isCaller) => isCaller === true);

    if (callerIndex === -1) {
      return true; // No caller selected
    }

    // Check if caller has the highest bid (or tied for highest)
    const callerBid = currentGame.calls[currentRoundIndex][callerIndex];
    const maxBid = Math.max(...(currentRoundCalls.filter((call) => call !== null) as number[]));

    if (callerBid === null || callerBid < maxBid) {
      return true; // Caller doesn't have the highest bid
    }

    // Check if more than 2 players have DC
    const dcCount = currentGame.isDashCall[currentRoundIndex]?.filter((isDC) => isDC).length || 0;
    if (dcCount > 2) {
      return true; // Cannot have more than 2 DC players
    }

    // NEW: Check manual risk requirement in mandatory rounds (14-18)
    const roundNumber = currentRound;
    const isClassicMode = currentGame.mode === "classic";
    const isMandatoryRound = isClassicMode && roundNumber >= 14 && roundNumber <= 18;

    if (isMandatoryRound) {
      const roundDiff = currentGame.roundDifferences[currentRoundIndex];
      const hasManualRiskMarked = currentGame.manualRisk[currentRoundIndex]?.some((risk) => risk) ?? false;

      // DEBUG LOGS
      console.log("=== MANUAL RISK VALIDATION ===");
      console.log("Round:", roundNumber);
      console.log("Is Mandatory Round:", isMandatoryRound);
      console.log("Round Diff:", roundDiff);
      console.log("Has Manual Risk Marked:", hasManualRiskMarked);
      console.log("Manual Risk Array:", currentGame.manualRisk[currentRoundIndex]);

      // Must have round difference entered
      if (roundDiff === null) {
        console.log("❌ DISABLED: Round difference not entered yet");
        return true; // Can't proceed without knowing the difference
      }

      // If game is ±2 or more, MUST have manual risk marked
      if (Math.abs(roundDiff) >= 2) {
        if (!hasManualRiskMarked) {
          console.log("❌ DISABLED: Risk required but not marked");
          return true; // Risk required but not marked
        }
      }

      // If game is ±1 or 0, CANNOT have manual risk marked
      if (Math.abs(roundDiff) < 2) {
        if (hasManualRiskMarked) {
          console.log("❌ DISABLED: Risk marked but shouldn't be");
          return true; // Risk marked but shouldn't be
        }
      }

      console.log("✅ Manual risk validation passed");
    }

    return false;
  }, [allPlayersCalled, totalCalls, currentGame, currentRound, currentRoundCalls]);

  const isGameFinished = useMemo(() => {
    if (!currentGame) return false;

    // Check if all rounds have been played (all statuses are "finished")
    const allRoundsFinished = currentGame.statuses.every((roundStatuses) => roundStatuses.every((status) => status === "finished"));

    return allRoundsFinished;
  }, [currentGame?.statuses]);

  // Add this function to calculate rankings:
  const getRankings = useMemo(() => {
    if (!currentGame) return [];

    // Calculate final scores for each player
    const finalScores = currentGame.players.map((playerName, playerIndex) => {
      const totalScore = currentGame.scores.reduce((total, round) => total + (round[playerIndex] || 0), 0);

      return {
        playerName,
        score: totalScore,
        playerIndex,
      };
    });

    // Sort by score (highest first)
    finalScores.sort((a, b) => b.score - a.score);

    // Add rank (1-4)
    return finalScores.map((player, index) => ({
      ...player,
      rank: index + 1,
    }));
  }, [currentGame?.scores, currentGame?.players]);

  // Add useEffect to auto-show modal when game finishes:
  useEffect(() => {
    if (isGameFinished) {
      setShowWinnerModal(true);
    }
  }, [isGameFinished]);

  // Check if current round is in playing phase
  const isPlayingPhase = useMemo(() => {
    if (!currentGame || currentRound < 1) return false;
    return currentGame.statuses[currentRound - 1]?.[0] === "playing";
  }, [currentGame?.statuses, currentRound]);

  // For playing phase validation
  const currentRoundResults = useMemo(() => {
    if (!currentGame) return [];
    return currentGame.results[currentRound - 1] || [];
  }, [currentGame, currentGame?.results, currentRound]);

  const allPlayersEnteredResults = useMemo(() => {
    return currentRoundResults.length > 0 && currentRoundResults.every((result) => result !== null);
  }, [currentRoundResults]);

  const totalResults = useMemo(() => {
    return allPlayersEnteredResults ? currentRoundResults.reduce((sum, result) => (sum ?? 0) + (result ?? 0), 0) : 0;
  }, [allPlayersEnteredResults, currentRoundResults]) as number;

  const isConfirmDisabled = useMemo(() => {
    return !allPlayersEnteredResults || totalResults !== 13;
  }, [allPlayersEnteredResults, totalResults]);

  useEffect(() => {
    if (currentGame && currentRound > 0) {
      console.log("=== CALLER DEBUG ===");
      console.log("Round:", currentRound - 1);
      console.log("isCaller:", currentGame.isCaller[currentRound - 1]);
      console.log("callerSuits:", currentGame.callerSuits[currentRound - 1]);
    }
  }, [currentGame?.isCaller, currentGame?.callerSuits, currentRound]);

  useEffect(() => {
    if (!currentGame || !allPlayersCalled) return;

    const currentRoundIndex = currentRound - 1;
    const existingDiff = currentGame.roundDifferences[currentRoundIndex];

    // Only calculate if not already set and all calls are in
    if (existingDiff === null && totalCalls !== 13) {
      const difference = totalCalls - 13;
      updateRoundDifference(currentGame.id, currentRoundIndex, difference);
    }
  }, [currentGame, allPlayersCalled, totalCalls, currentRound]);

  const totalRounds = currentGame?.calls?.length || 0;

  // DEBUG - Remove after fixing
  console.log("=== DEBUG ===");
  console.log("totalRounds:", totalRounds);
  console.log("currentGame.calls.length:", currentGame?.calls?.length);
  console.log("First round calls:", currentGame?.calls?.[0]);
  console.log("currentRound:", currentRound);

  // ===== HANDLERS =====

  /**
   * Open modal to input a player's call for current round
   */
  const openCallModal = (roundIndex: number, playerIndex: number) => {
    setEditingCell({ roundIndex, playerIndex });
    setModalVisible(true);
  };

  /**
   * Save selected call and close modal
   */
  const handleSelectCall = (call: number) => {
    if (editingCell && currentGame) {
      updateCall(currentGame.id, editingCell.roundIndex, editingCell.playerIndex, call);
    }
    setModalVisible(false);
    setEditingCell(null);
  };

  /**
   * Open modal to input actual result (for red button)
   */
  const openResultModal = (roundIndex: number, playerIndex: number) => {
    setEditingResult({ roundIndex, playerIndex });
    setResultModalVisible(true);
  };

  /**
   * Save selected result and close modal
   */
  const handleSelectResult = (result: number) => {
    if (editingResult && currentGame) {
      updateResult(currentGame.id, editingResult.roundIndex, editingResult.playerIndex, result);
    }
    setResultModalVisible(false);
    setEditingResult(null);
  };

  /**
   * Handle green button click - player won their bid
   */
  const handleWinClick = (roundIndex: number, playerIndex: number) => {
    if (!currentGame) return;
    const playerBid = currentGame.calls[roundIndex][playerIndex];
    if (playerBid !== null) {
      updateResult(currentGame.id, roundIndex, playerIndex, playerBid);
    }
  };

  const getSuitSymbol = (suit: string | null) => {
    if (!suit) return "";
    const symbols: Record<string, string> = {
      spades: "♠",
      hearts: "♥",
      diamonds: "♦",
      clubs: "♣",
      suns: "☀",
    };
    return symbols[suit] || "";
  };

  /**
   * Get suit color
   */
  const getSuitColor = (suit: string | null) => {
    if (!suit) return "#333333";
    if (suit === "hearts" || suit === "diamonds") return "#FF3B30";
    if (suit === "suns") return "#FF9500";
    return "#000000";
  };

  /**
   * Move to next round - Save difference and increment round number
   */
  const handleNextRound = () => {
    if (!currentGame || isNextRoundDisabled) return;

    const difference = totalCalls - 13;
    updateRoundDifference(currentGame.id, currentRound - 1, difference);
    startPlayingRound(currentGame.id, currentRound - 1);
  };

  /**
   * Confirm round results and move to next round
   */
  const handleConfirmRound = () => {
    console.log("=== CONFIRM ROUND CLICKED ===");
    console.log("isConfirmDisabled:", isConfirmDisabled);
    console.log("currentGame:", currentGame);

    if (!currentGame || isConfirmDisabled) return;

    // Calculate scores and finalize the round
    finalizeRound(currentGame.id, currentRound - 1);

    // Move to next round
    setCurrentRound((prev) => prev + 1);
  };

  const getMandatorySuitForRound = (roundNumber: number): string | null => {
    switch (roundNumber) {
      case 14:
        return "suns";
      case 15:
        return "spades";
      case 16:
        return "hearts";
      case 17:
        return "diamonds";
      case 18:
        return "clubs";
      default:
        return null;
    }
  };

  const openCallerModal = (roundIndex: number, playerIndex: number) => {
    if (!currentGame) return;

    const roundNumber = roundIndex + 1;
    const isClassicMode = currentGame.mode === "classic";
    const mandatorySuit = isClassicMode ? getMandatorySuitForRound(roundNumber) : null;

    // Get player's current bid
    const currentBid = currentGame.calls[roundIndex]?.[playerIndex];

    // DEBUG LOGS
    console.log("=== CALLER MODAL DEBUG ===");
    console.log("Round Number:", roundNumber);
    console.log("Is Classic Mode:", isClassicMode);
    console.log("Mandatory Suit:", mandatorySuit);
    console.log("Current Bid:", currentBid);
    console.log("Should auto-set?", mandatorySuit && (currentBid === null || currentBid < 8));

    // If it's a mandatory suit round AND bid is less than 8
    if (mandatorySuit && (currentBid === null || currentBid < 8)) {
      // Auto-set caller with mandatory suit (no modal, no bid correction)
      console.log("✅ Auto-setting caller with mandatory suit:", mandatorySuit);
      setCaller(currentGame.id, roundIndex, playerIndex, mandatorySuit);
      return;
    }

    // Otherwise, open modal for suit selection
    console.log("🎯 Opening modal for suit selection");
    setEditingCaller({ roundIndex, playerIndex });
    setSuitModalVisible(true);
  };

  const handleSelectSuit = (suit: string) => {
    if (editingCaller && currentGame) {
      const { roundIndex, playerIndex } = editingCaller;

      // Get current bid for this player
      const currentBid = currentGame.calls[roundIndex]?.[playerIndex];

      // Only auto-correct to 4 if NOT in a mandatory suit round
      const roundNumber = roundIndex + 1;
      const isClassicMode = currentGame.mode === "classic";
      const mandatorySuit = isClassicMode ? getMandatorySuitForRound(roundNumber) : null;

      if (!mandatorySuit) {
        // Normal rounds: Check if bid needs auto-correction (null or < 4)
        if (currentBid === null || currentBid < 4) {
          // Auto-correct bid to 4
          updateCall(currentGame.id, roundIndex, playerIndex, 4);
        }
      }
      // Note: In mandatory rounds, we don't auto-correct the bid

      // Set caller (this will automatically remove DC status via setCaller in context)
      setCaller(currentGame.id, roundIndex, playerIndex, suit);
    }

    setSuitModalVisible(false);
    setEditingCaller(null);
  };
  /**
   * Mark current round as "playing" status
   */
  const handleStartPlaying = () => {
    if (!currentGame || isNextRoundDisabled) return;
    startPlayingRound(currentGame.id, currentRound - 1);
  };

  const handleDashCall = (roundIndex: number, playerIndex: number) => {
    if (!currentGame) return;
    setDashCall(currentGame.id, roundIndex, playerIndex);
  };

  const handleManualRiskToggle = (roundIndex: number, playerIndex: number) => {
    if (!currentGame) return;

    const currentlyHasRisk = currentGame.manualRisk[roundIndex]?.[playerIndex] ?? false;

    console.log("=== TOGGLE MANUAL RISK ===");
    console.log("Round Index:", roundIndex);
    console.log("Player Index:", playerIndex);
    console.log("Currently Has Risk:", currentlyHasRisk);
    console.log("Before:", currentGame.manualRisk[roundIndex]);

    if (currentlyHasRisk) {
      clearManualRisk(currentGame.id, roundIndex);
    } else {
      setManualRisk(currentGame.id, roundIndex, playerIndex);
    }
  };

  /**
   * Handle "everyone lost" button click
   */
  const handleEveryoneLost = (roundIndex: number) => {
    if (!currentGame) return;

    // Mark the PREVIOUS round (row above) as everyone lost
    const actualRoundIndex = roundIndex - 1;

    if (actualRoundIndex < 0) return; // Safety check

    // Check if this is the last round based on game mode
    const maxRounds = currentGame.mode === "mini" ? 10 : currentGame.mode === "micro" ? 5 : 18; // classic = 18
    const currentTotalRounds = currentGame.calls.length;
    const isLastRound = actualRoundIndex + 1 === currentTotalRounds;

    // If it's the last round (regardless of original max), add an extra round
    if (isLastRound) {
      addExtraRound(currentGame.id);
    }

    // Mark everyone as lost
    markEveryoneLost(currentGame.id, actualRoundIndex);

    // Move to next round
    setCurrentRound((prev) => prev + 1);
  };

  /**
   * Calculate score multiplier based on consecutive "everyone lost" rounds
   */
  const getScoreMultiplier = (roundIndex: number): number => {
    if (!currentGame || roundIndex === 0) return 1;

    let multiplier = 1;
    // Check previous rounds for consecutive "everyone lost" OR "caller + 2 with"
    for (let i = roundIndex - 1; i >= 0; i--) {
      const wasEveryoneLost = currentGame.everyoneLost[i];

      // Check if it was a "caller + 2 with" round
      const callerIdx = currentGame.isCaller[i]?.findIndex((ic) => ic) ?? -1;
      const callerBid = callerIdx !== -1 ? currentGame.calls[i]?.[callerIdx] : null;
      const withCount = currentGame.calls[i]?.filter((call, idx) => !currentGame.isCaller[i]?.[idx] && !currentGame.isDashCall[i]?.[idx] && call === callerBid && callerBid !== null).length || 0;
      const wasCallerPlusTwoWith = callerIdx !== -1 && withCount >= 2;

      if (wasEveryoneLost || wasCallerPlusTwoWith) {
        multiplier *= 2;
      } else {
        break;
      }
    }

    return multiplier;
  };

  const handleUndoRound = (roundIndex: number) => {
    if (!currentGame) return;

    Alert.alert("Edit Round", `Are you sure you want to reset Round ${roundIndex + 1}? All data for this round will be deleted.`, [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Edit",
        style: "destructive",
        onPress: () => {
          // Reset the round data
          undoRound(currentGame.id, roundIndex);
          // Go back to that round
          setCurrentRound(roundIndex + 1); // +1 because currentRound is 1-based
        },
      },
    ]);
  };

  /**
   * Start editing a player name - clear the field
   */
  const handleStartEditingName = (playerIndex: number) => {
    setEditingPlayerName(playerIndex);
    setTempPlayerName(""); // Start with empty field
  };

  /**
   * Finish editing - save if not empty, revert if empty
   */
  const handleFinishEditingName = (playerIndex: number) => {
    if (currentGame) {
      if (tempPlayerName.trim()) {
        // Save the new name
        updatePlayerName(currentGame.id, playerIndex, tempPlayerName);
      }
      // If empty, just revert (don't update)
    }
    setEditingPlayerName(null);
    setTempPlayerName("");
  };

  // ===== WAIT FOR FONTS AND GAME DATA =====
  if (!fontsLoaded || !currentGame) {
    return (
      <View style={styles.container}>
        <Text style={styles.columnHeader}>Loading Game...</Text>
      </View>
    );
  }

  // ===== SAFETY CHECK FOR GAME DATA INTEGRITY =====
  if (!currentGame.calls || !currentGame.statuses || !currentGame.scores) {
    return (
      <View style={styles.container}>
        <Text style={styles.columnHeader}>Game data error...</Text>
      </View>
    );
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

      {/* Notebook background lines */}
      {lines}

      {/* Main Content - White Sticky Note with Scoresheet */}
      <View style={styles.outerContainer}>
        <View style={styles.whiteNote}>
          {/* FIXED HEADER - Column labels and player names */}
          <View style={styles.fixedHeader}>
            <View style={styles.columnsContainer}>
              <View style={styles.headerUnderline} />

              {/* Round number column header */}
              <View style={styles.roundColumn}>
                <Text style={styles.columnHeader}>R</Text>
              </View>

              {/* Player column headers */}
              {currentGame.players.map((player, index) => {
                const currentPlayerScore = playerScores[index];
                const isLeader = hasScores && currentPlayerScore === maxScore;
                const isLastPlace = hasScores && currentPlayerScore === minScore && currentPlayerScore !== maxScore;

                return (
                  <View key={index} style={styles.playerColumn}>
                    <View style={styles.verticalLine} />
                    <View style={styles.playerNameContainer}>
                      {editingPlayerName === index ? (
                        <TextInput style={styles.columnHeader} value={tempPlayerName} onChangeText={setTempPlayerName} onBlur={() => handleFinishEditingName(index)} placeholder={`Player ${index + 1}`} maxLength={15} autoFocus={true} />
                      ) : (
                        <TouchableOpacity onPress={() => handleStartEditingName(index)} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                          <Text style={styles.columnHeader} numberOfLines={1}>
                            {player}
                          </Text>
                        </TouchableOpacity>
                      )}

                      {/* Emoji indicator directly in name container */}
                      <View style={styles.emojiHeaderContainer}>
                        {isLeader && <MaterialCommunityIcons name="crown" size={16} color="#333333" />}
                        {isLastPlace && <MaterialCommunityIcons name="cup-outline" size={16} color="#333333" />}
                      </View>
                    </View>

                    <View style={styles.verticalLine3} />
                  </View>
                );
              })}

              {/* +/- column header (difference from 13) */}
              <View style={styles.roundColumn}>
                <View style={styles.verticalLine} />
                <Text style={styles.columnHeader}>+/-</Text>
              </View>
            </View>
          </View>

          {/* SCROLLABLE CONTENT - All rounds data */}
          <ScrollView style={styles.scrollableContent}>
            <View style={styles.columnsContainer}>
              {/* Round numbers column */}
              <View style={styles.roundColumn}>
                {Array.from({ length: totalRounds + 1 }).map((_, roundIndex) => {
                  // If this is the extra row (beyond totalRounds), check if we need skull here
                  if (roundIndex >= totalRounds) {
                    // Show skull if we're playing the last round
                    const isPlayingLastRound = currentRound === totalRounds && currentGame.statuses[totalRounds - 1]?.[0] === "playing";

                    return (
                      <View key={`round-${roundIndex}`} style={styles.roundCell}>
                        {isPlayingLastRound ? (
                          <TouchableOpacity onPress={() => handleEveryoneLost(roundIndex)} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                            <Foundation name="skull" size={24} color="black" />
                          </TouchableOpacity>
                        ) : (
                          <Text style={styles.roundNumber}></Text>
                        )}
                      </View>
                    );
                  }

                  // Normal logic for actual rounds
                  const isPlayingRow = roundIndex === currentRound && currentGame.statuses[roundIndex - 1]?.[0] === "playing";
                  const isCurrentRoundPlaying = currentGame.statuses[currentRound - 1]?.[0] === "playing";
                  const isPreviousRound = isCurrentRoundPlaying
                    ? roundIndex + 1 === currentRound // If playing, can click current round number
                    : roundIndex + 1 === currentRound - 1; // If preparing, can click previous round number
                  const isStrikethrough = currentGame.everyoneLost[roundIndex];

                  // Check if this is a mandatory suit round in classic mode (rounds 14-18)
                  const isClassicMode = currentGame.mode === "classic";
                  const roundNumber = roundIndex + 1;
                  const isMandatorySuitRound = isClassicMode && roundNumber >= 14 && roundNumber <= 18;

                  // Get mandatory suit symbol and color
                  const getMandatorySuit = (round: number) => {
                    switch (round) {
                      case 14:
                        return { symbol: "☀", color: "#FF9500" }; // Suns
                      case 15:
                        return { symbol: "♠", color: "#000000" }; // Spades
                      case 16:
                        return { symbol: "♥", color: "#FF3B30" }; // Hearts
                      case 17:
                        return { symbol: "♦", color: "#FF3B30" }; // Diamonds
                      case 18:
                        return { symbol: "♣", color: "#000000" }; // Clubs (Triffle)
                      default:
                        return null;
                    }
                  };

                  const mandatorySuit = isMandatorySuitRound ? getMandatorySuit(roundNumber) : null;

                  return (
                    <View key={`round-${roundIndex}`} style={styles.roundCell}>
                      {isPlayingRow ? (
                        <TouchableOpacity onPress={() => handleEveryoneLost(roundIndex)} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                          <Foundation name="skull" size={24} color="black" />
                        </TouchableOpacity>
                      ) : isPreviousRound ? (
                        <TouchableOpacity onPress={() => handleUndoRound(roundIndex)} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                          {mandatorySuit ? (
                            // Mandatory suit rounds (14-18): NO circle, just suit symbol
                            <Text style={[styles.mandatorySuitSymbol, { color: mandatorySuit.color }]}>{mandatorySuit.symbol}</Text>
                          ) : (
                            // Normal rounds (1-13, 19+): Circle with number
                            <View style={styles.roundNumberCircle}>
                              <Text style={[styles.roundNumberInCircle, isStrikethrough && styles.strikethroughText]}>{roundNumber}</Text>
                            </View>
                          )}
                        </TouchableOpacity>
                      ) : mandatorySuit ? (
                        <Text style={[styles.mandatorySuitSymbol, { color: mandatorySuit.color }, isStrikethrough && styles.strikethroughText]}>{mandatorySuit.symbol}</Text>
                      ) : (
                        <Text style={[styles.roundNumber, isStrikethrough && styles.strikethroughText]}>{roundNumber}</Text>
                      )}
                    </View>
                  );
                })}
              </View>

              {/* Player columns - Each has 4 sub-columns */}
              {currentGame.players.map((player, playerIndex) => (
                <View key={`player-col-${playerIndex}`} style={styles.playerColumn}>
                  <View style={styles.verticalLine} />

                  {/* Sub-column 1: Win/Loss indicator */}
                  <View style={styles.firstSubColumn}>
                    {Array.from({ length: totalRounds }).map((_, roundIndex) => {
                      const isCurrentRow = roundIndex + 1 === currentRound;
                      const isPlayingRow = currentGame.statuses[roundIndex]?.[0] === "playing";
                      const isFinished = currentGame.statuses[roundIndex]?.[0] === "finished";
                      const isWinner = currentGame.isWinner[roundIndex][playerIndex];
                      const everyoneLostThisRound = currentGame.everyoneLost[roundIndex];

                      // Check if this is a mandatory suit round (14-18 in classic mode)
                      const roundNumber = roundIndex + 1; // Convert to 1-based
                      const isMandatorySuitRound = currentGame.mode === "classic" && roundNumber >= 14 && roundNumber <= 18;
                      const hasManualRisk = currentGame.manualRisk[roundIndex]?.[playerIndex] ?? false;

                      return (
                        <View key={`p${playerIndex}-sub1-${roundIndex}`} style={styles.subCell}>
                          {everyoneLostThisRound && <View style={styles.strikethrough} />}
                          {isCurrentRow && isPlayingRow ? (
                            <TouchableOpacity onPress={() => openResultModal(roundIndex, playerIndex)} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                              <MaterialIcons name="cancel" size={24} color="red" />
                            </TouchableOpacity>
                          ) : isCurrentRow && !isPlayingRow ? (
                            isMandatorySuitRound ? (
                              // Show R button for rounds 14-18 in classic mode (Manual Risk)
                              <TouchableOpacity onPress={() => handleManualRiskToggle(roundIndex, playerIndex)} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                                <Text style={[styles.actionText, hasManualRisk && styles.activeRisk]}>R</Text>
                              </TouchableOpacity>
                            ) : (
                              // Show DC button for rounds 1-13 (and mini/micro modes)
                              <TouchableOpacity onPress={() => handleDashCall(roundIndex, playerIndex)} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                                <Text style={styles.actionText}>DC</Text>
                              </TouchableOpacity>
                            )
                          ) : isFinished ? (
                            <Text style={[styles.subColumnData, isWinner ? styles.winIndicator : styles.loseIndicator]}>{isWinner ? "✓" : "✗"}</Text>
                          ) : (
                            <Text style={styles.subColumnData}></Text>
                          )}
                        </View>
                      );
                    })}
                  </View>

                  {/* Sub-column 2: Score / Call input */}
                  <View style={styles.SecondSubColumn}>
                    {Array.from({ length: totalRounds }).map((_, roundIndex) => {
                      const isCurrentRow = roundIndex + 1 === currentRound;
                      const isPlayingRow = currentGame.statuses[roundIndex]?.[0] === "playing";

                      return (
                        <View key={`p${playerIndex}-sub2-${roundIndex}`} style={styles.subCell}>
                          {currentGame.everyoneLost[roundIndex] && <View style={styles.strikethrough} />}
                          {isCurrentRow && isPlayingRow ? (
                            <Text style={styles.subColumnData}>{currentGame.results[roundIndex][playerIndex] ?? "..."}</Text>
                          ) : isCurrentRow && !isPlayingRow ? (
                            <TouchableOpacity onPress={() => openCallModal(roundIndex, playerIndex)} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                              <FontAwesome6 name="pencil" size={16} color="#333333" />
                            </TouchableOpacity>
                          ) : (
                            <Text style={styles.subColumnData}>{currentGame.statuses[roundIndex]?.[0] === "finished" ? currentGame.scores.slice(0, roundIndex + 1).reduce((total, round) => total + (round[playerIndex] || 0), 0) : null}</Text>
                          )}
                        </View>
                      );
                    })}
                  </View>

                  {/* Sub-column 3: Caller indicator */}
                  <View style={styles.ThirdSubColumn}>
                    {Array.from({ length: totalRounds }).map((_, roundIndex) => {
                      const isCurrentRow = roundIndex + 1 === currentRound;
                      const isPlayingRow = currentGame.statuses[roundIndex]?.[0] === "playing";

                      return (
                        <View key={`p${playerIndex}-sub3-${roundIndex}`} style={styles.subCell}>
                          {currentGame.everyoneLost[roundIndex] && <View style={styles.strikethrough} />}
                          {isCurrentRow && isPlayingRow ? (
                            <TouchableOpacity onPress={() => handleWinClick(roundIndex, playerIndex)} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                              <FontAwesome name="check-circle" size={24} color="green" />
                            </TouchableOpacity>
                          ) : isCurrentRow && !isPlayingRow ? (
                            <TouchableOpacity onPress={() => openCallerModal(roundIndex, playerIndex)} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                              <Text style={styles.actionText}>C</Text>
                            </TouchableOpacity>
                          ) : (
                            <Text style={styles.subColumnData}></Text>
                          )}
                        </View>
                      );
                    })}
                  </View>

                  {/* Sub-column 4: Player's call/bid */}
                  <View style={styles.ForthSubColumn}>
                    {Array.from({ length: totalRounds }).map((_, roundIndex) => {
                      const call = currentGame.calls[roundIndex]?.[playerIndex];
                      const isDC = currentGame.isDashCall[roundIndex]?.[playerIndex];
                      const isCaller = currentGame.isCaller[roundIndex]?.[playerIndex];
                      const callerSuit = currentGame.callerSuits[roundIndex]?.[playerIndex];

                      // Check if player is "With" (same bid as caller, but not the caller)
                      const callerIndex = currentGame.isCaller[roundIndex]?.findIndex((ic) => ic) ?? -1;
                      const callerBid = callerIndex !== -1 ? currentGame.calls[roundIndex]?.[callerIndex] : null;
                      const isWith = !isCaller && !isDC && callerBid !== null && call === callerBid;

                      // Check if this is a mandatory round in classic mode (14-18)
                      const roundNumber = roundIndex + 1;
                      const isClassicMode = currentGame.mode === "classic";
                      const isMandatoryRound = isClassicMode && roundNumber >= 14 && roundNumber <= 18;

                      // Determine risk player
                      let riskPlayerIndex = -1;

                      if (isMandatoryRound) {
                        // In mandatory rounds (14-18), use manual risk only
                        const manualRiskIndex = currentGame.manualRisk?.[roundIndex]?.findIndex((risk) => risk) ?? -1;
                        if (manualRiskIndex !== -1) {
                          riskPlayerIndex = manualRiskIndex;
                        }
                      } else {
                        // In normal rounds (1-13, 19+), use automatic risk calculation
                        if (callerIndex !== -1) {
                          // Check positions in order: +3, +2, +1 from caller
                          for (let offset = 3; offset >= 1; offset--) {
                            const candidateIndex = (callerIndex + offset) % 4;
                            const candidateIsDC = currentGame.isDashCall[roundIndex]?.[candidateIndex] ?? false;

                            if (!candidateIsDC) {
                              riskPlayerIndex = candidateIndex;
                              break; // Found the furthest non-DC player
                            }
                          }
                        }
                      }

                      const roundDiff = currentGame.roundDifferences[roundIndex];
                      const isRisk = playerIndex === riskPlayerIndex && roundDiff !== null && roundDiff !== undefined && Math.abs(roundDiff) >= 2;

                      // Calculate risk multiplier for display
                      let riskMultiplier = 0;
                      if (isRisk && roundDiff !== null) {
                        const absDiff = Math.abs(roundDiff);
                        if (absDiff >= 8) {
                          riskMultiplier = 4; // Quad risk: ±8 or ±9
                        } else if (absDiff >= 6) {
                          riskMultiplier = 3; // Triple risk: ±6 or ±7
                        } else if (absDiff >= 4) {
                          riskMultiplier = 2; // Double risk: ±4 or ±5
                        } else if (absDiff >= 2) {
                          riskMultiplier = 1; // Single risk: ±2 or ±3
                        }
                      }

                      // Determine indicator text based on conditions
                      let indicatorText = "";
                      if (isRisk && isWith) {
                        // Both Risk and With
                        indicatorText = riskMultiplier > 1 ? `${riskMultiplier}RW` : "RW";
                      } else if (isRisk) {
                        // Risk only
                        indicatorText = riskMultiplier > 1 ? `${riskMultiplier}R` : "R";
                      } else if (isWith) {
                        // With only
                        indicatorText = "W";
                      }

                      const displayCall = isDC ? "DC" : call;

                      return (
                        <View key={`p${playerIndex}-sub4-${roundIndex}`} style={styles.subCell}>
                          {currentGame.everyoneLost[roundIndex] && <View style={styles.strikethrough} />}
                          {isCaller && callerSuit && !isDC ? (
                            <View style={styles.callWithSuitContainer}>
                              <Text style={[styles.suitSymbolInCall, { color: getSuitColor(callerSuit) }]}>{getSuitSymbol(callerSuit)}</Text>
                              <Text style={styles.subColumnData}>{displayCall}</Text>
                            </View>
                          ) : isRisk || isWith ? (
                            <View style={styles.callWithSuitContainer}>
                              <Text style={styles.riskIndicator}>{indicatorText}</Text>
                              <Text style={styles.subColumnData}>{displayCall}</Text>
                            </View>
                          ) : (
                            <Text style={styles.subColumnData}>{displayCall}</Text>
                          )}
                        </View>
                      );
                    })}
                  </View>

                  <View style={styles.verticalLine3} />
                </View>
              ))}

              {/* +/- column showing difference from 13 and next round button */}
              <View style={styles.roundColumn}>
                <View style={styles.verticalLine} />
                <View style={styles.scoreDiffColumn}>
                  {Array.from({ length: totalRounds + 1 }).map((_, roundIndex) => {
                    // If this is the extra row (beyond totalRounds), check if we need arrows here
                    if (roundIndex >= totalRounds) {
                      // Show playing arrow if we're playing the last round
                      const isPlayingLastRound = currentRound === totalRounds && currentGame.statuses[totalRounds - 1]?.[0] === "playing";

                      return (
                        <View key={`diff-${roundIndex}`} style={styles.roundCell}>
                          {isPlayingLastRound ? (
                            <TouchableOpacity disabled={isConfirmDisabled} onPress={handleConfirmRound} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                              <Ionicons name="play" size={20} color={isConfirmDisabled ? "#999999" : "#34C759"} />
                            </TouchableOpacity>
                          ) : (
                            <Text style={styles.scoreDiffData}></Text>
                          )}
                        </View>
                      );
                    }

                    // Normal logic for actual rounds
                    const difference = currentGame.roundDifferences[roundIndex];
                    const displayValue = difference !== null && difference > 0 ? `+${difference}` : difference;
                    const isPreparingRow = roundIndex + 1 === currentRound && currentGame.statuses[roundIndex]?.[0] !== "playing";
                    const isPlayingRow = roundIndex === currentRound && currentGame.statuses[roundIndex - 1]?.[0] === "playing";

                    return (
                      <View key={`diff-${roundIndex}`} style={styles.roundCell}>
                        {isPlayingRow ? (
                          <TouchableOpacity disabled={isConfirmDisabled} onPress={handleConfirmRound} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                            <Ionicons name="play" size={20} color={isConfirmDisabled ? "#999999" : "#34C759"} />
                          </TouchableOpacity>
                        ) : isPreparingRow ? (
                          <TouchableOpacity disabled={isNextRoundDisabled} onPress={handleNextRound} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                            <Ionicons name="play" size={20} color={isNextRoundDisabled ? "#999999" : "#34C759"} />
                          </TouchableOpacity>
                        ) : (
                          <Text style={styles.scoreDiffData}>{displayValue}</Text>
                        )}
                      </View>
                    );
                  })}
                </View>
              </View>
            </View>
          </ScrollView>

          {/* FIXED FOOTER - Back button */}
          <View style={styles.fixedFooter}>
            <TouchableOpacity onPress={() => router.back()} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
              <Text style={styles.backButton}>Back</Text>
            </TouchableOpacity>

            {currentGame && currentGame.currentRound === totalRounds && (
              <TouchableOpacity onPress={() => currentGame && addExtraRound(currentGame.id)} hitSlop={{ top: 15, bottom: 15, left: 15, right: 15 }}>
                <Text style={styles.addRoundText}>Add Round</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Call Input Modal */}
      {/* Result Input Modal */}
      <CallInputModal visible={isResultModalVisible} onSelect={handleSelectResult} onClose={() => setResultModalVisible(false)} />
      <CallInputModal
        visible={isModalVisible}
        onSelect={handleSelectCall}
        onClose={() => setModalVisible(false)}
        callerBid={
          editingCell && currentGame
            ? (() => {
                const callerIndex = currentGame.isCaller[editingCell.roundIndex]?.findIndex((ic) => ic);
                return callerIndex !== -1 ? currentGame.calls[editingCell.roundIndex][callerIndex] : null;
              })()
            : null
        }
        isPlayerCaller={editingCell && currentGame ? currentGame.isCaller[editingCell.roundIndex]?.[editingCell.playerIndex] ?? false : false}
      />
      <SuitSelectionModal visible={isSuitModalVisible} onSelect={handleSelectSuit} onClose={() => setSuitModalVisible(false)} />
      <WinnerModal visible={showWinnerModal} rankings={getRankings} onClose={() => setShowWinnerModal(false)} />
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

  // Outer container for white note
  outerContainer: {
    flex: 1,
    marginLeft: 30,
    marginRight: 30,
    marginTop: -10,
    marginBottom: -10,
    padding: 20,
  },

  // White sticky note background
  whiteNote: {
    backgroundColor: "#ffffff",
    borderRadius: 8,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
    padding: 15,
    flex: 1,
    flexDirection: "column",
  },

  // Fixed header section
  fixedHeader: {
    paddingBottom: 0,
  },

  // Scrollable content section
  scrollableContent: {
    flex: 1,
  },

  // Fixed footer section
  fixedFooter: {
    borderTopWidth: 1,
    borderTopColor: "rgba(0, 0, 0, 0.15)",
    paddingHorizontal: 15,
    height: 20,
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  addRoundButton: {
    // Add this to ensure consistent alignment
    justifyContent: "center",
    alignItems: "center",
  },
  addRoundText: {
    fontFamily: "Handlee_400Regular",
    fontSize: 14,
    color: "#007AFF",
    marginTop: 0, // Changed from 2 to 0
    textAlignVertical: "center",
  },
  backButton: {
    fontFamily: "Handlee_400Regular",
    fontSize: 14,
    color: "#333333",
    marginTop: 0, // Changed from 2 to 0
    textAlignVertical: "center",
  },

  // Columns container
  columnsContainer: {
    flexDirection: "row",
    width: "100%",
  },

  // Round column (narrow)
  roundColumn: {
    flex: 0.5,
    position: "relative",
    alignItems: "center",
  },

  // Player columns (wider - contains 4 sub-columns)
  playerColumn: {
    flex: 2,
    position: "relative",
    alignItems: "center",
  },

  // Vertical separator lines
  verticalLine: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(0, 0, 0, 0.15)",
  },
  verticalLine3: {
    position: "absolute",
    left: "75%",
    top: 0,
    bottom: 0,
    width: 1,
    backgroundColor: "rgba(0, 0, 0, 0.15)",
  },

  // Column headers
  columnHeader: {
    fontFamily: "Handlee_400Regular",
    fontSize: 16,
    color: "#333333",
    textAlign: "center",
    marginBottom: 10,
  },
  headerUnderline: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 15,
    height: 1,
    backgroundColor: "rgba(0, 0, 0, 0.15)",
  },

  // Player name container in header
  playerNameContainer: {
    width: "100%",
    paddingLeft: 10,
    paddingRight: "25%",
    marginBottom: 10,
  },

  // Round cell
  roundCell: {
    width: "100%",
    height: 35,
    alignItems: "center",
    justifyContent: "center",
    borderBottomWidth: 1,
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
  },
  roundNumber: {
    fontFamily: "Handlee_400Regular",
    fontSize: 14,
    color: "#333333",
  },

  // Sub-columns within player columns
  subCell: {
    width: "100%",
    height: 35,
    justifyContent: "center",
    alignItems: "center",
    borderBottomColor: "rgba(0, 0, 0, 0.05)",
  },
  firstSubColumn: {
    position: "absolute",
    left: 0,
    top: 0,
    width: "25%",
    alignItems: "center",
  },
  SecondSubColumn: {
    position: "absolute",
    left: 0,
    top: 0,
    width: "75%",
    alignItems: "center",
  },
  ThirdSubColumn: {
    position: "absolute",
    left: 0,
    top: 0,
    width: "125%",
    alignItems: "center",
  },
  ForthSubColumn: {
    position: "absolute",
    left: 0,
    top: 0,
    width: "175%",
    alignItems: "center",
  },

  // Sub-column data text
  subColumnData: {
    fontFamily: "Handlee_400Regular",
    fontSize: 16,
    height: 35,
    textAlignVertical: "center",
  },
  actionText: {
    fontFamily: "Handlee_400Regular",
    fontSize: 16,
    color: "#007AFF",
    textAlign: "center",
  },

  // Score difference column
  scoreDiffColumn: {
    width: "100%",
    alignItems: "center",
    paddingLeft: 10,
  },
  scoreDiffData: {
    fontFamily: "Handlee_400Regular",
    fontSize: 14,
    height: 35,
    textAlignVertical: "center",
    color: "#333333",
  },

  // Next round arrow
  nextRoundArrow: {
    fontSize: 20,
    color: "#34C759", // Green like the win indicator
    fontWeight: "bold",
  },
  disabledArrow: {
    opacity: 0.3,
    color: "#999999",
  },
  buttonText: {
    fontSize: 20,
  },
  callerActive: {
    color: "#34C759",
    fontWeight: "bold",
  },
  winIndicator: {
    color: "#34C759", // Green color
    fontWeight: "bold",
    fontSize: 18,
  },
  loseIndicator: {
    color: "#FF3B30", // Red color
    fontWeight: "bold",
    fontSize: 18,
  },
  playingPhaseContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center", // Change this to move items
    gap: 4,
    width: "100%", // Takes full width of parent
    paddingHorizontal: 5, // Add padding to move items away from edges
  },
  suitSymbolSmall: {
    fontSize: 16,
    fontWeight: "bold",
  },
  buttonTextSmall: {
    fontSize: 16,
  },
  spacer: {
    width: 16, // Same width as suit symbol to keep alignment
  },
  callWithSuitContainer: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 3,
  },
  suitSymbolInCall: {
    fontSize: 14,
    fontWeight: "bold",
  },
  everyoneLostButton: {
    fontFamily: "Handlee_400Regular",
    fontSize: 16,
    color: "#FF3B30",
    fontWeight: "bold",
  },
  strikethrough: {
    position: "absolute",
    left: 0,
    right: 0,
    top: "50%",
    height: 2,
    backgroundColor: "#FF3B30",
    zIndex: 10,
  },
  withIndicator: {
    fontSize: 12,

    color: "#007AFF", // Blue for "With"
    fontFamily: "Handlee_400Regular",
  },
  riskIndicator: {
    fontSize: 12,

    color: "#ff0000ff", // Orange for "Risk"
    fontFamily: "Handlee_400Regular",
  },
  clickableRoundNumber: {
    color: "#007AFF", // Blue to indicate clickable
    fontWeight: "bold",
  },
  strikethroughText: {
    textDecorationLine: "line-through",
    textDecorationStyle: "solid",
  },
  emojiHeaderContainer: {
    position: "absolute",
    right: 4, // Changed from 0 to 10 - adjust this number to move left/right
    top: 5,
    width: 30,
    alignItems: "center",
  },
  emojiHeader: {
    fontFamily: "Handlee_400Regular",
    fontSize: 16,
    color: "#333333",
  },
  roundNumberCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: "#000000ff",
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: "#E3F2FD",
  },
  roundNumberInCircle: {
    fontFamily: "Handlee_400Regular",
    fontSize: 14,
    color: "#000000ff",
  },
  mandatorySuitSymbol: {
    fontSize: 20,
    fontWeight: "bold",
    textAlign: "center",
  },
  activeRisk: {
    color: "#DC143C", // Crimson red to show it's selected
    fontWeight: "bold",
  },
  manualRiskButton: {
    fontSize: 14,
    fontWeight: "bold",
    color: "#666666",
    textAlign: "center",
  },
  manualRiskButtonActive: {
    color: "#FF3B30", // Red when active
    fontWeight: "900",
  },
});
