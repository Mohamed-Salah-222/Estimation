import { calculateRoundScores } from "@/utils/scoreCalculator"; //* function to calculate scores
import AsyncStorage from "@react-native-async-storage/async-storage"; //* Phone Storage
import React, { createContext, ReactNode, useContext, useEffect, useState } from "react"; //* React Imports

const GAMES_STORAGE_KEY = "@EstimationCalculator:games"; //* Storage-Key

//! Type Game
export type Game = {
  id: string; //* Unique identifier
  players: string[]; //* array of player names
  mode: "classic" | "mini" | "micro"; //* game modes
  createdDate: string; //* Date of creation
  currentRound: number; //* current active round

  calls: (number | null)[][]; //* 2D array of either numbers or null storing the calls
  results: (number | null)[][]; //* 2D array of either number or null storing the results
  scores: number[][]; //* 2D array storing scores for each round (not cumulative)
  isWinner: boolean[][]; //* 2D array of true > indicating win or false > indicating lose
  isCaller: boolean[][]; //* 2D array of true > is the caller or false > isn't the caller
  isDashCall: boolean[][]; //* 2D array of true > Dash call or false > not a dash call
  callerSuits: (string | null)[][]; //* 2D array of both strings and null because there will only be one caller rest of players will be null
  everyoneLost: boolean[]; //* 1D array: true if everyone lost (triggers multiplier)

  roundDifferences: (number | null)[]; //* an array storing the round differences
  statuses: ("preparing" | "playing" | "finished")[][]; //* 2D array storing round statuses

  manualRisk: boolean[][]; //* Manually set risk player (mandatory rounds)
};

//! Type GameContext
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
  setCaller: (gameId: string, roundIndex: number, playerIndex: number, suit: string) => void;
  finalizeRound: (gameId: string, roundIndex: number) => void;
  setDashCall: (gameId: string, roundIndex: number, playerIndex: number) => void;
  markEveryoneLost: (gameId: string, roundIndex: number) => void;
  addExtraRound: (gameId: string) => void;
  undoRound: (gameId: string, roundIndex: number) => void;
  updatePlayerName: (gameId: string, playerIndex: number, name: string) => void;
  setManualRisk: (gameId: string, roundIndex: number, playerIndex: number) => void;
  clearManualRisk: (gameId: string, roundIndex: number) => void;
};

//! Game Context Creation
const GameContext = createContext<GameContextType | undefined>(undefined);

//! Initializing Game Data
const initializeGameData = (mode: Game["mode"]) => {
  const totalRounds = mode === "classic" ? 18 : mode === "mini" ? 10 : 5; //* Get the total round from the game mode
  const totalPlayers = 4; //* Always 4 players

  const create2DArray = (fillValue: any) => Array.from({ length: totalRounds }, () => Array(totalPlayers).fill(fillValue)); //* Creates 2D array [rounds][players] filled with provided value (avoids reference issues)

  return {
    currentRound: 1, //* Start at round 1
    calls: create2DArray(null), //* storing each player calls
    results: create2DArray(null),
    scores: create2DArray(0), //* storing each player score
    isWinner: create2DArray(false),
    isCaller: create2DArray(false),
    roundDifferences: Array(totalRounds).fill(null),
    statuses: create2DArray("preparing"),
    isDashCall: create2DArray(false),
    callerSuits: create2DArray(null),
    everyoneLost: Array(totalRounds).fill(false),
    manualRisk: create2DArray(false),
  };
};

//! Game Provider Component
export const GameProvider = ({ children }: { children: ReactNode }) => {
  const [games, setGames] = useState<Game[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  //* Loading games from storage
  useEffect(() => {
    const loadGames = async () => {
      try {
        //* Getting the games from phone storage (AsyncStorage)
        const storedGames = await AsyncStorage.getItem(GAMES_STORAGE_KEY);

        //* if there are games then parse them into JS objects and arrays so we can render them in the screen
        if (storedGames !== null) {
          setGames(JSON.parse(storedGames));
        }
      } catch (e) {
        console.error("Failed to load games.", e);
      } finally {
        //* Stop the loading
        setIsLoading(false);
      }
    };
    loadGames();
  }, []); //* Run only one time when we first mount

  //* Save games to the storage
  useEffect(() => {
    //* When loading is done we can save
    if (!isLoading) {
      const saveGames = async () => {
        try {
          //* adding the game to the storage
          await AsyncStorage.setItem(GAMES_STORAGE_KEY, JSON.stringify(games));
        } catch (e) {
          console.error("Failed to save games.", e);
        }
      };
      saveGames();
    }
  }, [games, isLoading]); //* Run this whenever the games or the loading state changes

  //! 1. Add Game
  const addGame = (mode: Game["mode"]) => {
    //* initialize the game data
    const gameData = initializeGameData(mode);
    //* the new game
    const newGame: Game = {
      id: new Date().toISOString(), //* Unique identifier
      players: ["Player 1", "Player 2", "Player 3", "Player 4"],
      mode,
      createdDate: new Date().toLocaleDateString(),
      ...gameData, //* rest of the helper function
    };
    setGames((prevGames) => [...prevGames, newGame]); //* add the new game
  };

  //! 2. Delete Game
  const deleteGame = (id: string) => {
    setGames((prevGames) => prevGames.filter((game) => game.id !== id)); //* filter based on id
  };

  //! 3. Delete Multiple Games
  const deleteMultipleGames = (ids: string[]) => {
    setGames((prevGames) => prevGames.filter((game) => !ids.includes(game.id))); //* filter based on the ids array
  };

  //! 4. Update Call
  const updateCall = (gameId: string, roundIndex: number, playerIndex: number, call: number) => {
    setGames((prevGames) =>
      //* Map over the games array
      prevGames.map((game) => {
        if (game.id === gameId) {
          //* if we found a game with an id that matches
          //* we map again over the calls array to find the round that needs the update
          const newCalls = game.calls.map((round, idx) =>
            //* if we found the right round index we then map over that round to find the right player that we need to change his call
            idx === roundIndex ? round.map((c, pIdx) => (pIdx === playerIndex ? call : c)) : round
          );

          //* if a player changes his call that means he is no longer a Dash call so we make it false
          const newIsDashCall = game.isDashCall.map((round, idx) => (idx === roundIndex ? round.map((dc, pIdx) => (pIdx === playerIndex ? false : dc)) : round));

          //* we return the game with the changes needed and everything else stays the same
          return { ...game, calls: newCalls, isDashCall: newIsDashCall };
        }
        //* returning the other games without changing anything in them
        return game;
      })
    );
  };

  //! 5. Set Dash Call
  const setDashCall = (gameId: string, roundIndex: number, playerIndex: number) => {
    setGames((prevGames) =>
      //* map over the games to find the right one
      prevGames.map((game) => {
        if (game.id === gameId) {
          //* after you find the game map over the calls to find the round we need to change
          const newCalls = game.calls.map((round, idx) =>
            //* after you find the round map over the player to find the player that needs to be a dash caller and set their call to 0
            idx === roundIndex ? round.map((c, pIdx) => (pIdx === playerIndex ? 0 : c)) : round
          );
          //* after setting his call to 0 mark him as a dashcall
          const newIsDashCall = game.isDashCall.map((round, idx) => (idx === roundIndex ? round.map((dc, pIdx) => (pIdx === playerIndex ? true : dc)) : round));

          return { ...game, calls: newCalls, isDashCall: newIsDashCall }; //* we return the game with the changes needed and everything else stays the same
        }
        return game; //* returning the other games without changing anything in them
      })
    );
  };

  //! 6. Update Round Difference
  const updateRoundDifference = (gameId: string, roundIndex: number, difference: number) => {
    setGames((prevGames) =>
      //* Mapping over the games
      prevGames.map((game) => {
        if (game.id === gameId) {
          //* if found the game
          const newDifferences = [...game.roundDifferences]; //* create a new array with the data from the old differences array
          newDifferences[roundIndex] = difference; //* we change the value at the right index to the new difference
          return { ...game, roundDifferences: newDifferences }; //* we return the rest of the game and the newDifferences we changed
        }
        return game; //* no changes to rest of the games
      })
    );
  };

  //! 7. Update Result
  const updateResult = (gameId: string, roundIndex: number, playerIndex: number, result: number) => {
    setGames((prevGames) =>
      //* Mapping over the games
      prevGames.map((game) => {
        if (game.id === gameId) {
          //* if found the game
          //* map over the results array to find the right round
          const newResults = game.results.map((round, idx) =>
            //* map over the round to find the right player and update their result
            idx === roundIndex ? round.map((r, pIdx) => (pIdx === playerIndex ? result : r)) : round
          );
          return { ...game, results: newResults };
        }
        return game;
      })
    );
  };

  //! 8. Start Playing Round
  const startPlayingRound = (gameId: string, roundIndex: number) => {
    setGames((prevGames) =>
      //* Mapping over the games
      prevGames.map((game) => {
        if (game.id === gameId) {
          //* if found the game
          const newStatuses = game.statuses.map((row) => [...row]); //* copy all statuses
          for (let i = 0; i < newStatuses[roundIndex].length; i++) {
            newStatuses[roundIndex][i] = "playing"; //* change everyone to playing
          }
          return { ...game, statuses: newStatuses };
        }
        return game;
      })
    );
  };

  //! 9. Update Current Round
  const updateCurrentRound = (gameId: string, roundNumber: number) => {
    setGames((prevGames) =>
      //* Mapping over the games
      prevGames.map((game) => {
        if (game.id === gameId) {
          //* if found the game update the currentRound number
          return { ...game, currentRound: roundNumber };
        }
        return game;
      })
    );
  };

  //! 10. Set Caller
  const setCaller = (gameId: string, roundIndex: number, playerIndex: number, suit: string) => {
    setGames((prevGames) =>
      //* Mapping over the games
      prevGames.map((game) => {
        if (game.id === gameId) {
          //* if found the game

          //* set this player only as the caller and unset others
          const newIsCaller = game.isCaller.map((round, rIdx) => {
            if (rIdx === roundIndex) {
              return round.map((_, pIdx) => pIdx === playerIndex);
            }
            return round;
          });

          //* set the suit for this caller
          const newCallerSuits = game.callerSuits.map((round, rIdx) => {
            if (rIdx === roundIndex) {
              return round.map((_, pIdx) => (pIdx === playerIndex ? suit : null));
            }
            return round;
          });

          //* reset isDashCall for this player cause you can't be both dash and caller
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

  //! 11. Mark Everyone Lost
  const markEveryoneLost = (gameId: string, roundIndex: number) => {
    setGames((prevGames) =>
      //* Mapping over the games
      prevGames.map((game) => {
        if (game.id === gameId) {
          //* Mark everyone as having lost (isWinner = false for all)
          const newIsWinner = [...game.isWinner];
          newIsWinner[roundIndex] = [false, false, false, false];

          //* Set scores to 0 for this round (will be recalculated with multiplier later)
          const newScores = [...game.scores];
          newScores[roundIndex] = [0, 0, 0, 0];

          //* Mark this round as everyone lost
          const newEveryoneLost = [...game.everyoneLost];
          newEveryoneLost[roundIndex] = true;

          //* Mark round as finished
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

  //! 12. Finalize Round
  const finalizeRound = (gameId: string, roundIndex: number) => {
    setGames((prevGames) =>
      prevGames.map((game) => {
        if (game.id === gameId) {
          //* Get this round calls and results
          const calls = game.calls[roundIndex];
          const results = game.results[roundIndex];

          //* Validate so we don't call the calculate function with incomplete data
          if (!calls || !results || calls.some((c) => c === null) || results.some((r) => r === null)) {
            console.error("Cannot finalize round: missing calls or results");
            return game; //* Don't update if data is incomplete
          }

          //* Call the calculate function and destructure the results
          const { scores, isWinner } = calculateRoundScores(game, roundIndex);

          //* Copy scores array and update this round
          const newScores = [...game.scores];
          newScores[roundIndex] = scores;

          //* Copy isWinner array and update this round
          const newIsWinner = [...game.isWinner];
          newIsWinner[roundIndex] = isWinner;

          //* Set all players in this round to "finished"
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

  //! 13. Add Extra Round
  const addExtraRound = (gameId: string) => {
    setGames((prevGames) =>
      //* Mapping over the games
      prevGames.map((game) => {
        if (game.id === gameId) {
          //* add one empty round to all arrays
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
            manualRisk: [...game.manualRisk, [false, false, false, false]],
          };
        }
        return game;
      })
    );
  };

  //! 14. Undo Round
  const undoRound = (gameId: string, roundIndex: number) => {
    setGames((prevGames) =>
      prevGames.map((game) => {
        if (game.id === gameId) {
          const totalRounds = game.calls.length;

          //* Reset all data for this round AND all subsequent rounds
          const newCalls = [...game.calls];
          const newResults = [...game.results];
          const newScores = [...game.scores];
          const newIsWinner = [...game.isWinner];
          const newIsCaller = [...game.isCaller];
          const newIsDashCall = [...game.isDashCall];
          const newCallerSuits = [...game.callerSuits];
          const newEveryoneLost = [...game.everyoneLost];
          const newRoundDifferences = [...game.roundDifferences];
          const newStatuses = [...game.statuses];
          const newManualRisk = [...game.manualRisk];

          //* Clear from roundIndex onwards (because later rounds depend on earlier ones)
          for (let i = roundIndex; i < totalRounds; i++) {
            newCalls[i] = [null, null, null, null];
            newResults[i] = [null, null, null, null];
            newScores[i] = [0, 0, 0, 0];
            newIsWinner[i] = [false, false, false, false];
            newIsCaller[i] = [false, false, false, false];
            newIsDashCall[i] = [false, false, false, false];
            newCallerSuits[i] = [null, null, null, null];
            newEveryoneLost[i] = false;
            newRoundDifferences[i] = null;
            newStatuses[i] = ["preparing", "preparing", "preparing", "preparing"];
            newManualRisk[i] = [false, false, false, false];
          }

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
            manualRisk: newManualRisk,
          };
        }
        return game;
      })
    );
  };

  //! 15. Set Manual Risk
  const setManualRisk = (gameId: string, roundIndex: number, playerIndex: number) => {
    setGames((prevGames) =>
      //* Mapping over the games
      prevGames.map((game) => {
        if (game.id === gameId) {
          //* Set only this player as manual risk, unset others in this round
          const newManualRisk = game.manualRisk.map((round, rIdx) => {
            if (rIdx === roundIndex) {
              return round.map((_, pIdx) => pIdx === playerIndex);
            }
            return round;
          });

          return { ...game, manualRisk: newManualRisk };
        }
        return game;
      })
    );
  };

  //! 16. Clear Manual Risk
  const clearManualRisk = (gameId: string, roundIndex: number) => {
    setGames((prevGames) =>
      //* Mapping over the games
      prevGames.map((game) => {
        if (game.id === gameId) {
          //* Clear all manual risk for this round
          const newManualRisk = game.manualRisk.map((round, rIdx) => {
            if (rIdx === roundIndex) {
              return [false, false, false, false];
            }
            return round;
          });

          return { ...game, manualRisk: newManualRisk };
        }
        return game;
      })
    );
  };

  //! 17. Update Player Name
  const updatePlayerName = (gameId: string, playerIndex: number, name: string) => {
    setGames((prevGames) =>
      //* Mapping over the games
      prevGames.map((game) => {
        if (game.id === gameId) {
          //* Copy players array
          const newPlayers = [...game.players];
          //* Update specific player's name (trim whitespace, fallback to default)
          newPlayers[playerIndex] = name.trim() || `Player ${playerIndex + 1}`;
          return { ...game, players: newPlayers };
        }
        return game;
      })
    );
  };

  //* Sort games by ID (newest first)
  const sortedGames = [...games].sort((a, b) => b.id.localeCompare(a.id));

  //* Create the context value object with all games and functions
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
    setCaller,
    finalizeRound,
    setDashCall,
    markEveryoneLost,
    addExtraRound,
    undoRound,
    updatePlayerName,
    setManualRisk,
    clearManualRisk,
  };

  //* Provide the context to all children components
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
};

//! Custom Hook to Access Game Context
export const useGame = () => {
  const context = useContext(GameContext);
  //* Throw error if hook is used outside of GameProvider
  if (context === undefined) {
    throw new Error("useGame must be used within a GameProvider");
  }
  return context;
};
