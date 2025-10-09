import { calculateRoundScores } from "@/utils/scoreCalculator";
import AsyncStorage from "@react-native-async-storage/async-storage";
import React, { createContext, ReactNode, useContext, useEffect, useState } from "react";

// ============================================================================
// STORAGE KEY
// ============================================================================
const GAMES_STORAGE_KEY = "@EstimationCalculator:games";

// ============================================================================
// TYPE DEFINITIONS
// ============================================================================

/**
 * Game data structure
 * Contains all information for a single Estimation game including players,
 * rounds, calls, results, and scores
 */
export type Game = {
  id: string; // Unique identifier (timestamp)
  players: string[]; // Array of 4 player names
  mode: "classic" | "mini" | "micro"; // Game mode determines number of rounds
  createdDate: string; // Human-readable creation date
  currentRound: number;

  // Round data (2D arrays: [roundIndex][playerIndex])
  calls: (number | null)[][]; // Player bids for each round
  results: (number | null)[][]; // Actual tricks won by each player
  scores: number[][]; // Calculated scores per round
  isWinner: boolean[][]; // Whether player won their bid
  isCaller: boolean[][]; // Whether player is the caller
  isDashCall: boolean[][];
  callerSuits: (string | null)[][];
  everyoneLost: boolean[];

  // Round metadata (1D array: [roundIndex])
  roundDifferences: (number | null)[]; // Difference from 13 (for risk calculation)
  statuses: ("preparing" | "playing" | "finished")[][]; // Current status of each round
};

/**
 * Context API interface
 * Defines all functions available to components that use this context
 */
type GameContextType = {
  games: Game[];
  addGame: (mode: Game["mode"]) => void;
  deleteGame: (id: string) => void;
  deleteMultipleGames: (ids: string[]) => void;
  updateCall: (gameId: string, roundIndex: number, playerIndex: number, call: number) => void;
  updateRoundDifference: (gameId: string, roundIndex: number, difference: number) => void;
  startPlayingRound: (gameId: string, roundIndex: number) => void;
  updateCurrentRound: (gameId: string, roundNumber: number) => void;
  updateResult: (gameId: string, roundIndex: number, playerIndex: number, result: number) => void;
  setCaller: (gameId: string, roundIndex: number, playerIndex: number, suit: string) => void; // ADD THIS
  finalizeRound: (gameId: string, roundIndex: number) => void;
  setDashCall: (gameId: string, roundIndex: number, playerIndex: number) => void; // ADD THIS
  markEveryoneLost: (gameId: string, roundIndex: number) => void;
  addExtraRound: (gameId: string) => void;
  undoRound: (gameId: string, roundIndex: number) => void;
  updatePlayerName: (gameId: string, playerIndex: number, name: string) => void;
};

// ============================================================================
// CONTEXT CREATION
// ============================================================================
const GameContext = createContext<GameContextType | undefined>(undefined);

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

/**
 * Initialize empty game data structure based on game mode
 * @param mode - Game mode (classic: 18 rounds, mini: 10 rounds, micro: 5 rounds)
 * @returns Object with all initialized arrays for a new game
 */
const initializeGameData = (mode: Game["mode"]) => {
  const totalRounds = mode === "classic" ? 18 : mode === "mini" ? 10 : 5;
  const totalPlayers = 4;

  // Helper to create 2D arrays filled with a default value
  const create2DArray = (fillValue: any) => Array.from({ length: totalRounds }, () => Array(totalPlayers).fill(fillValue));

  return {
    currentRound: 1,
    calls: create2DArray(null),
    results: create2DArray(null),
    scores: create2DArray(0),
    isWinner: create2DArray(false),
    isCaller: create2DArray(false),
    roundDifferences: Array(totalRounds).fill(null),
    statuses: create2DArray("preparing"),
    isDashCall: create2DArray(false),
    callerSuits: create2DArray(null),
    everyoneLost: Array(totalRounds).fill(false),
  };
};

// ============================================================================
// PROVIDER COMPONENT
// ============================================================================

/**
 * GameProvider component
 * Wraps the app to provide game state and functions to all child components
 */
export const GameProvider = ({ children }: { children: ReactNode }) => {
  // ===== STATE =====
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // ===== LOAD GAMES FROM STORAGE ON MOUNT =====
  useEffect(() => {
    const loadGames = async () => {
      try {
        const storedGames = await AsyncStorage.getItem(GAMES_STORAGE_KEY);
        if (storedGames !== null) {
          setGames(JSON.parse(storedGames));
        }
      } catch (e) {
        console.error("Failed to load games.", e);
      } finally {
        setIsLoading(false);
      }
    };
    loadGames();
  }, []);

  // ===== SAVE GAMES TO STORAGE WHENEVER GAMES CHANGE =====
  useEffect(() => {
    if (!isLoading) {
      const saveGames = async () => {
        try {
          await AsyncStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(games));
        } catch (e) {
          console.error("Failed to save games.", e);
        }
      };
      saveGames();
    }
  }, [games, isLoading]);

  // ===== GAME MANAGEMENT FUNCTIONS =====

  /**
   * Create a new game with default player names and empty data
   */
  const addGame = (mode: Game["mode"]) => {
    const gameData = initializeGameData(mode);
    const newGame: Game = {
      id: new Date().toISOString(),
      players: ["Player 1", "Player 2", "Player 3", "Player 4"],
      mode,
      createdDate: new Date().toLocaleDateString(),
      ...gameData,
    };
    setGames((prevGames) => [...prevGames, newGame]);
  };

  /**
   * Delete a single game by ID
   */
  const deleteGame = (id: string) => {
    setGames((prevGames) => prevGames.filter((game) => game.id !== id));
  };

  /**
   * Delete multiple games by their IDs
   */
  const deleteMultipleGames = (ids: string[]) => {
    setGames((prevGames) => prevGames.filter((game) => !ids.includes(game.id)));
  };

  // ===== ROUND DATA UPDATE FUNCTIONS =====

  /**
   * Update a player's call (bid) for a specific round
   */
  const updateCall = (gameId: string, roundIndex: number, playerIndex: number, call: number) => {
    setGames((prevGames) =>
      prevGames.map((game) => {
        if (game.id === gameId) {
          const newCalls = game.calls.map((round, idx) => (idx === roundIndex ? round.map((c, pIdx) => (pIdx === playerIndex ? call : c)) : round));

          // Reset isDashCall to false when manually changing call
          const newIsDashCall = game.isDashCall.map((round, idx) => (idx === roundIndex ? round.map((dc, pIdx) => (pIdx === playerIndex ? false : dc)) : round));

          return { ...game, calls: newCalls, isDashCall: newIsDashCall };
        }
        return game;
      })
    );
  };

  const setDashCall = (gameId: string, roundIndex: number, playerIndex: number) => {
    setGames((prevGames) =>
      prevGames.map((game) => {
        if (game.id === gameId) {
          // Set call to 0
          const newCalls = game.calls.map((round, idx) => (idx === roundIndex ? round.map((c, pIdx) => (pIdx === playerIndex ? 0 : c)) : round));

          // Mark as dash call
          const newIsDashCall = game.isDashCall.map((round, idx) => (idx === roundIndex ? round.map((dc, pIdx) => (pIdx === playerIndex ? true : dc)) : round));

          return { ...game, calls: newCalls, isDashCall: newIsDashCall };
        }
        return game;
      })
    );
  };

  /**
   * Update the difference from 13 for a specific round (used for risk calculation)
   */
  const updateRoundDifference = (gameId: string, roundIndex: number, difference: number) => {
    setGames((prevGames) =>
      prevGames.map((game) => {
        if (game.id === gameId) {
          const newDifferences = [...game.roundDifferences];
          newDifferences[roundIndex] = difference;
          return { ...game, roundDifferences: newDifferences };
        }
        return game;
      })
    );
  };

  const updateResult = (gameId: string, roundIndex: number, playerIndex: number, result: number) => {
    setGames((prevGames) =>
      prevGames.map((game) => {
        if (game.id === gameId) {
          const newResults = game.results.map((round, idx) => (idx === roundIndex ? round.map((r, pIdx) => (pIdx === playerIndex ? result : r)) : round));
          return { ...game, results: newResults };
        }
        return game;
      })
    );
  };

  /**
   * Mark a round as "playing" for all players
   */
  const startPlayingRound = (gameId: string, roundIndex: number) => {
    setGames((prevGames) =>
      prevGames.map((game) => {
        if (game.id === gameId) {
          const newStatuses = game.statuses.map((row) => [...row]);
          for (let i = 0; i < newStatuses[roundIndex].length; i++) {
            newStatuses[roundIndex][i] = "playing";
          }
          return { ...game, statuses: newStatuses };
        }
        return game;
      })
    );
  };

  const updateCurrentRound = (gameId: string, roundNumber: number) => {
    setGames((prevGames) =>
      prevGames.map((game) => {
        if (game.id === gameId) {
          return { ...game, currentRound: roundNumber };
        }
        return game;
      })
    );
  };

  /**
   * Toggle caller status for a player in a specific round
   */
  const setCaller = (gameId: string, roundIndex: number, playerIndex: number, suit: string) => {
    setGames((prevGames) =>
      prevGames.map((game) => {
        if (game.id === gameId) {
          // Set only this player as caller, unset others
          const newIsCaller = game.isCaller.map((round, rIdx) => {
            if (rIdx === roundIndex) {
              return round.map((_, pIdx) => pIdx === playerIndex);
            }
            return round;
          });

          // Set the suit for this caller
          const newCallerSuits = game.callerSuits.map((round, rIdx) => {
            if (rIdx === roundIndex) {
              return round.map((_, pIdx) => (pIdx === playerIndex ? suit : null));
            }
            return round;
          });

          // Reset isDashCall when setting as caller (can't be both)
          const newIsDashCall = game.isDashCall.map((round, rIdx) => {
            if (rIdx === roundIndex) {
              return round.map((dc, pIdx) => (pIdx === playerIndex ? false : dc));
            }
            return round;
          });

          return { ...game, isCaller: newIsCaller, callerSuits: newCallerSuits, isDashCall: newIsDashCall };
        }
        return game;
      })
    );
  };

  const markEveryoneLost = (gameId: string, roundIndex: number) => {
    setGames((prevGames) =>
      prevGames.map((game) => {
        if (game.id === gameId) {
          // Mark everyone as having lost (isWinner = false for all)
          const newIsWinner = [...game.isWinner];
          newIsWinner[roundIndex] = [false, false, false, false];

          // Set scores to 0 for this round (will be recalculated with multiplier later)
          const newScores = [...game.scores];
          newScores[roundIndex] = [0, 0, 0, 0];

          // Mark this round as everyone lost
          const newEveryoneLost = [...game.everyoneLost];
          newEveryoneLost[roundIndex] = true;

          // Mark round as finished
          const newStatuses = game.statuses.map((row, idx) => (idx === roundIndex ? row.map(() => "finished" as const) : row));

          return {
            ...game,
            isWinner: newIsWinner,
            scores: newScores,
            everyoneLost: newEveryoneLost,
            statuses: newStatuses,
          };
        }
        return game;
      })
    );
  };

  /**
   * Add an extra round to the game (for double round edge case)
   */
  const addExtraRound = (gameId: string) => {
    setGames((prevGames) =>
      prevGames.map((game) => {
        if (game.id === gameId) {
          // Add one more round to all arrays
          return {
            ...game,
            calls: [...game.calls, [null, null, null, null]],
            results: [...game.results, [null, null, null, null]],
            scores: [...game.scores, [0, 0, 0, 0]],
            isWinner: [...game.isWinner, [false, false, false, false]],
            isCaller: [...game.isCaller, [false, false, false, false]],
            isDashCall: [...game.isDashCall, [false, false, false, false]],
            callerSuits: [...game.callerSuits, [null, null, null, null]],
            everyoneLost: [...game.everyoneLost, false],
            roundDifferences: [...game.roundDifferences, null],
            statuses: [...game.statuses, ["preparing", "preparing", "preparing", "preparing"]],
          };
        }
        return game;
      })
    );
  };

  /**
   * Undo a round - Reset all data for a specific round as if it was never played
   */
  const undoRound = (gameId: string, roundIndex: number) => {
    setGames((prevGames) =>
      prevGames.map((game) => {
        if (game.id === gameId) {
          // Reset all data for this round
          const newCalls = [...game.calls];
          newCalls[roundIndex] = [null, null, null, null];

          const newResults = [...game.results];
          newResults[roundIndex] = [null, null, null, null];

          const newScores = [...game.scores];
          newScores[roundIndex] = [0, 0, 0, 0];

          const newIsWinner = [...game.isWinner];
          newIsWinner[roundIndex] = [false, false, false, false];

          const newIsCaller = [...game.isCaller];
          newIsCaller[roundIndex] = [false, false, false, false];

          const newIsDashCall = [...game.isDashCall];
          newIsDashCall[roundIndex] = [false, false, false, false];

          const newCallerSuits = [...game.callerSuits];
          newCallerSuits[roundIndex] = [null, null, null, null];

          const newEveryoneLost = [...game.everyoneLost];
          newEveryoneLost[roundIndex] = false;

          const newRoundDifferences = [...game.roundDifferences];
          newRoundDifferences[roundIndex] = null;

          const newStatuses = game.statuses.map((row, idx) => (idx === roundIndex ? row.map(() => "preparing" as const) : row));

          return {
            ...game,
            calls: newCalls,
            results: newResults,
            scores: newScores,
            isWinner: newIsWinner,
            isCaller: newIsCaller,
            isDashCall: newIsDashCall,
            callerSuits: newCallerSuits,
            everyoneLost: newEveryoneLost,
            roundDifferences: newRoundDifferences,
            statuses: newStatuses,
          };
        }
        return game;
      })
    );
  };

  /**
   * Update a player's name
   */
  const updatePlayerName = (gameId: string, playerIndex: number, name: string) => {
    setGames((prevGames) =>
      prevGames.map((game) => {
        if (game.id === gameId) {
          const newPlayers = [...game.players];
          newPlayers[playerIndex] = name.trim() || `Player ${playerIndex + 1}`;
          return { ...game, players: newPlayers };
        }
        return game;
      })
    );
  };

  /**
   * Finalize a round - Calculate scores, mark winners, and update statuses
   */
  const finalizeRound = (gameId: string, roundIndex: number) => {
    setGames((prevGames) =>
      prevGames.map((game) => {
        if (game.id === gameId) {
          const calls = game.calls[roundIndex];
          const results = game.results[roundIndex];
          const roundDifference = game.roundDifferences[roundIndex];

          // Validation
          if (!calls || !results || calls.some((c) => c === null) || results.some((r) => r === null)) {
            console.error("Cannot finalize round: missing calls or results");
            return game;
          }

          // Calculate scores using the utility function
          const { scores, isWinner } = calculateRoundScores(game, roundIndex);

          // Update game state
          const newScores = [...game.scores];
          newScores[roundIndex] = scores;

          const newIsWinner = [...game.isWinner];
          newIsWinner[roundIndex] = isWinner;

          const newStatuses = game.statuses.map((row, idx) => (idx === roundIndex ? row.map(() => "finished" as const) : row));

          return {
            ...game,
            scores: newScores,
            isWinner: newIsWinner,
            statuses: newStatuses,
          };
        }
        return game;
      })
    );
  };

  // ===== SORT GAMES (NEWEST FIRST) =====
  const sortedGames = [...games].sort((a, b) => b.id.localeCompare(a.id));

  // ===== PROVIDE CONTEXT VALUE =====
  const value = {
    games: sortedGames,
    addGame,
    deleteGame,
    deleteMultipleGames,
    updateCall,
    updateRoundDifference,
    startPlayingRound,
    updateCurrentRound,
    updateResult,
    setCaller, // ADD THIS
    finalizeRound, // ADD THIS
    setDashCall, // ADD THIS
    markEveryoneLost,
    addExtraRound,
    undoRound,
    updatePlayerName,
  };

  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

// ============================================================================
// CUSTOM HOOK
// ============================================================================

/**
 * Custom hook to access game context
 * @throws Error if used outside of GameProvider
 */
export const useGame = () => {
  const context = useContext(GameContext);
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
};
