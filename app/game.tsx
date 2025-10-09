import { useGame } from "@/context/GameContext";
import { useFonts } from "@expo-google-fonts/cairo";
import { Handlee_400Regular } from "@expo-google-fonts/handlee";
import { Ionicons, MaterialCommunityIcons } from "@expo/vector-icons";
import * as NavigationBar from "expo-navigation-bar";
import { useLocalSearchParams, useRouter } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { Dimensions, ScrollView, StatusBar, StyleSheet, Text, TextInput, TouchableOpacity, View } from "react-native";
import { CallInputModal } from "./components/CallInputModal";
import { SuitSelectionModal } from "./components/SuitSelectionModal";

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

    return false;
  }, [allPlayersCalled, totalCalls, currentGame, currentRound, currentRoundCalls]);

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

  const openCallerModal = (roundIndex: number, playerIndex: number) => {
    if (!currentGame) return;

    setEditingCaller({ roundIndex, playerIndex });
    setSuitModalVisible(true);
  };

  /**
   * Handle caller suit selection
   */
  const handleSelectSuit = (suit: string) => {
    if (editingCaller && currentGame) {
      setCaller(currentGame.id, editingCaller.roundIndex, editingCaller.playerIndex, suit);
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

  /**
   * Handle "everyone lost" button click
   */
  const handleEveryoneLost = (roundIndex: number) => {
    if (!currentGame) return;

    // Mark the PREVIOUS round (row above) as everyone lost
    const actualRoundIndex = roundIndex - 1;

    if (actualRoundIndex < 0) return; // Safety check

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

    // Reset the round data
    undoRound(currentGame.id, roundIndex);

    // Go back to that round
    setCurrentRound(roundIndex + 1); // +1 because currentRound is 1-based
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

      {/* Black edges on left and right */}
      <View style={styles.leftEdge} />
      <View style={styles.rightEdge} />

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
                        <TouchableOpacity onPress={() => handleStartEditingName(index)}>
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
                  // If this is the extra row (beyond totalRounds), check if we need ✗✗ here
                  if (roundIndex >= totalRounds) {
                    // Show ✗✗ if we're playing the last round
                    const isPlayingLastRound = currentRound === totalRounds && currentGame.statuses[totalRounds - 1]?.[0] === "playing";

                    return (
                      <View key={`round-${roundIndex}`} style={styles.roundCell}>
                        {isPlayingLastRound ? (
                          <TouchableOpacity onPress={() => handleEveryoneLost(roundIndex)}>
                            <Text style={styles.everyoneLostButton}>✗✗</Text>
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

                  return (
                    <View key={`round-${roundIndex}`} style={styles.roundCell}>
                      {isPlayingRow ? (
                        <TouchableOpacity onPress={() => handleEveryoneLost(roundIndex)}>
                          <Text style={styles.everyoneLostButton}>✗✗</Text>
                        </TouchableOpacity>
                      ) : isPreviousRound ? (
                        <TouchableOpacity onPress={() => handleUndoRound(roundIndex)}>
                          <Text style={[styles.roundNumber, styles.clickableRoundNumber, isStrikethrough && styles.strikethroughText]}>{roundIndex + 1}</Text>
                        </TouchableOpacity>
                      ) : (
                        <Text style={[styles.roundNumber, isStrikethrough && styles.strikethroughText]}>{roundIndex + 1}</Text>
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

                      return (
                        <View key={`p${playerIndex}-sub1-${roundIndex}`} style={styles.subCell}>
                          {everyoneLostThisRound && <View style={styles.strikethrough} />}
                          {isCurrentRow && isPlayingRow ? (
                            <TouchableOpacity onPress={() => openResultModal(roundIndex, playerIndex)}>
                              <Text style={styles.buttonTextSmall}>🔴</Text>
                            </TouchableOpacity>
                          ) : isCurrentRow && !isPlayingRow ? (
                            <TouchableOpacity onPress={() => handleDashCall(roundIndex, playerIndex)}>
                              <Text style={styles.actionText}>DC</Text>
                            </TouchableOpacity>
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
                            <TouchableOpacity onPress={() => openCallModal(roundIndex, playerIndex)}>
                              <Text style={styles.subColumnData}>...</Text>
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
                            <TouchableOpacity onPress={() => handleWinClick(roundIndex, playerIndex)}>
                              <Text style={styles.buttonTextSmall}>🟢</Text>
                            </TouchableOpacity>
                          ) : isCurrentRow && !isPlayingRow ? (
                            <TouchableOpacity onPress={() => openCallerModal(roundIndex, playerIndex)}>
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

                      // Check if player is at Risk (player at position (caller + 3) % 4)
                      const riskPlayerIndex = callerIndex !== -1 ? (callerIndex + 3) % 4 : -1;
                      const isRisk = playerIndex === riskPlayerIndex && currentGame.roundDifferences[roundIndex] !== null && currentGame.roundDifferences[roundIndex] !== undefined && Math.abs(currentGame.roundDifferences[roundIndex]!) >= 2;

                      const displayCall = isDC ? "DC" : call;

                      return (
                        <View key={`p${playerIndex}-sub4-${roundIndex}`} style={styles.subCell}>
                          {currentGame.everyoneLost[roundIndex] && <View style={styles.strikethrough} />}
                          {isCaller && callerSuit && !isDC ? (
                            <View style={styles.callWithSuitContainer}>
                              <Text style={[styles.suitSymbolInCall, { color: getSuitColor(callerSuit) }]}>{getSuitSymbol(callerSuit)}</Text>
                              <Text style={styles.subColumnData}>{displayCall}</Text>
                            </View>
                          ) : isWith ? (
                            <View style={styles.callWithSuitContainer}>
                              <Text style={styles.withIndicator}>W</Text>
                              <Text style={styles.subColumnData}>{displayCall}</Text>
                            </View>
                          ) : isRisk ? (
                            <View style={styles.callWithSuitContainer}>
                              <Text style={styles.riskIndicator}>R</Text>
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
                            <TouchableOpacity disabled={isConfirmDisabled} onPress={handleConfirmRound}>
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
                          <TouchableOpacity disabled={isConfirmDisabled} onPress={handleConfirmRound}>
                            <Ionicons name="play" size={20} color={isConfirmDisabled ? "#999999" : "#34C759"} />
                          </TouchableOpacity>
                        ) : isPreparingRow ? (
                          <TouchableOpacity disabled={isNextRoundDisabled} onPress={handleNextRound}>
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
            <TouchableOpacity onPress={() => router.back()}>
              <Text style={styles.backButton}>Back</Text>
            </TouchableOpacity>

            {true && (
              <TouchableOpacity onPress={() => currentGame && addExtraRound(currentGame.id)}>
                <Text style={styles.addRoundText}>Add Round</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </View>

      {/* Call Input Modal */}
      {/* Result Input Modal */}
      <CallInputModal visible={isResultModalVisible} onSelect={handleSelectResult} onClose={() => setResultModalVisible(false)} />
      <CallInputModal visible={isModalVisible} onSelect={handleSelectCall} onClose={() => setModalVisible(false)} />
      <SuitSelectionModal visible={isSuitModalVisible} onSelect={handleSelectSuit} onClose={() => setSuitModalVisible(false)} />
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

    color: "#FF9500", // Orange for "Risk"
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
});
