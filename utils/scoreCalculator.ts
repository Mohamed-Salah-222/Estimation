/**
 * ESTIMATION CARD GAME - SCORE CALCULATION UTILITIES
 *
 * This file contains all the logic for calculating scores based on the game rules.
 */

type GameData = {
  calls: (number | null)[][];
  results: (number | null)[][];
  scores: number[][];
  isWinner: boolean[][];
  isCaller: boolean[][];
  roundDifferences: (number | null)[];
  statuses: ("preparing" | "playing" | "finished")[][];
  everyoneLost?: boolean[];
  isDashCall?: boolean[][];
  manualRisk?: boolean[][]; // NEW
  mode?: "classic" | "mini" | "micro"; // NEW
};

/**
 * Calculate score for a single player in a round
 *
 * @param bid - Player's bid/call
 * @param result - Actual tricks won
 * @param isDash - Is this a dash (0 bid) call?
 * @param isPositiveDash - Is this a +Dash (easier) or regular Dash?
 * @param isCaller - Is this player the caller?
 * @param isRisk - Is this a risk round (total calls != 13)?
 * @param isOnlyWinner - Is this player the only winner in the round?
 * @param isOnlyLoser - Is this player the only loser in the round?
 * @param isWith - Did this player bid "with" (needs implementation based on your rules)
 * @param riskMultiplier - Risk level multiplier (1x=10, 2x=20, 3x=30, 4x=40)
 * @returns Calculated score for the round
 */
export function calculatePlayerScore(bid: number, result: number, isDash: boolean, isPositiveDash: boolean, isCaller: boolean, isRisk: boolean, isOnlyWinner: boolean, isOnlyLoser: boolean, isWith: boolean = false, riskMultiplier: number = 0): number {
  const madeTheBid = bid === result;
  let score = 0;

  // DASH CALL (Bidding 0)
  if (isDash) {
    if (isPositiveDash) {
      score = madeTheBid ? 25 : -25;
    } else {
      score = madeTheBid ? 30 : -30;
    }
    return score; // Dash calls don't get other bonuses
  }

  // HIGH BIDS (8-13) - Special case, limited bonuses
  if (bid >= 8 && bid <= 13) {
    if (madeTheBid) {
      score = bid * bid;
    } else {
      score = -(bid * bid) / 2;
    }

    // Only winner/loser bonuses still apply for high bids
    if (isOnlyWinner) {
      score += 10;
    }
    if (isOnlyLoser) {
      score -= 10;
    }

    return score; // No caller, with, risk, or round win bonuses for high bids
  }

  // LOW BIDS (1-7) - Normal rules with bonuses
  // 1. ROUND SCORE (Win bonus only - no lose penalty)
  if (madeTheBid) {
    score += 10;
  }

  // 2. TRICKS AMOUNT
  if (madeTheBid) {
    score += result; // Win: add actual tricks won
  } else {
    score -= Math.abs(bid - result); // Lose: subtract the difference
  }

  // 3. CALLER BONUS
  if (isCaller) {
    score += madeTheBid ? 10 : -10;
  }

  // 4. WITH BONUS
  if (isWith) {
    score += madeTheBid ? 10 : -10;
  }

  // 5. ONLY WINNER/LOSER BONUS
  if (isOnlyWinner) {
    score += 10; // Only winner gets +10
  }
  if (isOnlyLoser) {
    score -= 10; // Only loser gets -10
  }

  // 6. RISK BONUS (with multiplier support)
  // Risk tiers: ±2-3 = 1x, ±4-5 = 2x, ±6-7 = 3x, ±8-9 = 4x
  if (isRisk && riskMultiplier > 0) {
    const riskBonus = 10 * riskMultiplier;
    score += madeTheBid ? riskBonus : -riskBonus;
  }

  return score;
}

/**
 * Calculate scores for all players in a round
 *
 * @param game - Current game state
 * @param roundIndex - Index of the round to calculate (0-based)
 * @returns Object containing updated scores, isWinner, and isCaller arrays
 */
export function calculateRoundScores(game: GameData, roundIndex: number) {
  const calls = game.calls[roundIndex];
  const results = game.results[roundIndex];
  const roundDifference = game.roundDifferences[roundIndex];

  // Validation
  if (!calls || !results || calls.some((c) => c === null) || results.some((r) => r === null)) {
    throw new Error("Cannot calculate scores: missing calls or results");
  }

  // Type assertion after validation
  const validCalls = calls as number[];
  const validResults = results as number[];

  // Calculate score multiplier based on consecutive "everyone lost" rounds
  let multiplier = 1;

  // First check if CURRENT round should be doubled (caller + 2 with)
  const currentCallerIdx = game.isCaller[roundIndex]?.findIndex((ic) => ic) ?? -1;
  const currentCallerBid = currentCallerIdx !== -1 ? validCalls[currentCallerIdx] : null;
  const currentWithCount = validCalls.filter((call, idx) => !game.isCaller[roundIndex]?.[idx] && !game.isDashCall?.[roundIndex]?.[idx] && call === currentCallerBid && currentCallerBid !== null).length || 0;
  const isCurrentCallerPlusTwoWith = currentCallerIdx !== -1 && currentWithCount >= 2;

  if (isCurrentCallerPlusTwoWith) {
    multiplier *= 2;
  }

  // Then check previous consecutive "everyone lost" rounds
  for (let i = roundIndex - 1; i >= 0; i--) {
    const wasEveryoneLost = game.everyoneLost && game.everyoneLost[i];

    if (wasEveryoneLost) {
      multiplier *= 2;
    } else {
      break;
    }
  }

  // Determine round properties
  const totalCalls = validCalls.reduce((sum, call) => sum + call, 0);
  const isRisk = roundDifference !== null && Math.abs(roundDifference) >= 2;
  const isPositiveDash = totalCalls > 13;

  // Calculate risk multiplier based on round difference
  // ±2-3 = 1x (10 points), ±4-5 = 2x (20 points), ±6-7 = 3x (30 points), ±8-9 = 4x (40 points)
  let riskMultiplier = 0;
  if (roundDifference !== null) {
    const absDiff = Math.abs(roundDifference);
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

  // Determine which player is at risk
  const callerIndex = game.isCaller[roundIndex]?.findIndex((isCaller) => isCaller) ?? -1;
  let riskPlayerIndex = -1;

  // Check if this is a mandatory round in classic mode (14-18)
  const roundNumber = roundIndex + 1;
  const isClassicMode = game.mode === "classic";
  const isMandatoryRound = isClassicMode && roundNumber >= 14 && roundNumber <= 18;

  if (isMandatoryRound) {
    // In mandatory rounds (14-18), use manual risk only
    const manualRiskIndex = game.manualRisk?.[roundIndex]?.findIndex((risk) => risk) ?? -1;
    if (manualRiskIndex !== -1) {
      riskPlayerIndex = manualRiskIndex;
    }
    // If no manual risk is set, riskPlayerIndex stays -1 (no risk player)
  } else {
    // In normal rounds (1-13, 19+), use automatic risk calculation
    if (callerIndex !== -1) {
      // Check positions in order: +3, +2, +1 from caller
      for (let offset = 3; offset >= 1; offset--) {
        const candidateIndex = (callerIndex + offset) % 4;
        const isDC = game.isDashCall?.[roundIndex]?.[candidateIndex] ?? false;

        if (!isDC) {
          riskPlayerIndex = candidateIndex;
          break; // Found the furthest non-DC player
        }
      }
    }
  }

  // Determine winners and losers
  const winners: boolean[] = validCalls.map((call, idx) => call === validResults[idx]);
  const winnersCount = winners.filter((w) => w).length;
  const losersCount = 4 - winnersCount;

  // Determine "only winner" and "only loser"
  const isOnlyWinner = winnersCount === 1;
  const isOnlyLoser = losersCount === 1;

  // Calculate scores for each player
  const roundScores: number[] = [];
  const newIsWinner: boolean[] = [];

  for (let playerIndex = 0; playerIndex < 4; playerIndex++) {
    const bid = validCalls[playerIndex];
    const result = validResults[playerIndex];
    const isDash = bid === 0;
    const madeTheBid = bid === result;

    // Get caller status from game state
    const isCaller = game.isCaller[roundIndex]?.[playerIndex] ?? false;

    const callerBid = game.isCaller[roundIndex]?.findIndex((ic) => ic) !== -1 ? validCalls[game.isCaller[roundIndex].findIndex((ic) => ic)] : null;
    const isWith = !isCaller && callerBid !== null && bid === callerBid;

    // Determine if this player is at risk
    const playerIsAtRisk = isRisk && playerIndex === riskPlayerIndex;

    // Determine if this player gets only winner/loser bonus
    const playerIsOnlyWinner = isOnlyWinner && madeTheBid;
    const playerIsOnlyLoser = isOnlyLoser && !madeTheBid;

    // Calculate base score (with risk multiplier)
    const baseScore = calculatePlayerScore(bid, result, isDash, isPositiveDash, isCaller, playerIsAtRisk, playerIsOnlyWinner, playerIsOnlyLoser, isWith, riskMultiplier);

    // Apply multiplier (from everyone lost / caller+2with)
    const score = baseScore * multiplier;

    roundScores.push(score);
    newIsWinner.push(madeTheBid);
  }

  return {
    scores: roundScores,
    isWinner: newIsWinner,
  };
}

/**
 * Calculate cumulative scores up to a specific round
 *
 * @param game - Current game state
 * @param upToRound - Calculate totals up to this round (1-based)
 * @returns Array of cumulative scores for each player
 */
export function calculateCumulativeScores(game: GameData, upToRound: number): number[] {
  const cumulativeScores = [0, 0, 0, 0];

  for (let roundIndex = 0; roundIndex < upToRound; roundIndex++) {
    const roundScores = game.scores[roundIndex];
    if (roundScores) {
      for (let playerIndex = 0; playerIndex < 4; playerIndex++) {
        cumulativeScores[playerIndex] += roundScores[playerIndex];
      }
    }
  }

  return cumulativeScores;
}

/**
 * Determine who should be the caller for a round
 * Based on typical Estimation rules, the caller rotates each round
 *
 * @param roundIndex - Round index (0-based)
 * @returns Player index who is the caller (0-3)
 */
export function determineCallerForRound(roundIndex: number): number {
  return roundIndex % 4; // Rotates: 0, 1, 2, 3, 0, 1, 2, 3...
}
