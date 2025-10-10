//* Estimation Card Game
//* This File contains all the logic for calculating the scores

//! Game Data Object
type GameData = {
  calls: (number | null)[][]; //* 2D array storing players calls >> Values can be number or null
  results: (number | null)[][]; //* 2D array storing players results >> values can be number or null
  scores: number[][]; //* 2D array stroing players scores >> Number Values
  isWinner: boolean[][]; //* 2D array storing players status >> Values can be true or false
  isCaller: boolean[][]; //* 2D array storing who was the caller of the round
  roundDifferences: (number | null)[]; //* array storing the diff between the  total sum of the players calls and 13 (total cards)
  statuses: ("preparing" | "playing" | "finished")[][]; //* 2D array storing the game status
  everyoneLost?: boolean[]; //* Optional  array tracking if everyone lost the last round
  isDashCall?: boolean[][]; //* Optional 2D array tracking if a player is a dash call or no
  manualRisk?: boolean[][]; //* Optional 2D array to manually set Risks in mandatory Suits rounds
  mode?: "classic" | "mini" | "micro"; //* Storing the game mode variables
};

//! Calculate PLayer Function
export function calculatePlayerScore( //* The return value of the function is a number
  bid: number, //* number of bids the player wants to collect
  result: number, //* number of bids the player actually got
  isDash: boolean, //* is the player a Dash call true = yes , false = no
  isPositiveDash: boolean, //* the player in a positive  dash round
  isCaller: boolean, //* is the player the caller of the round
  isRisk: boolean, //* is the player at risk if yes he gets +10 / -10
  isOnlyWinner: boolean, //* is the player the only winner of the round
  isOnlyLoser: boolean, //* is the player the only loser of the round
  isWith: boolean = false, //*  is the player with calling in the round (asking for the same bids as the caller )
  riskMultiplier: number = 0 //* Risk level (R | 2R |3R | 4R)
): number {
  const madeTheBid = bid === result; //* true > if the player made his bid , false > if the player got less or more tricks than expected
  let score = 0; //* variable to store the score in

  //! DashCall Logic ( Bidding 0 )
  if (isDash) {
    if (isPositiveDash) {
      //* if it is a positive dash it is +25/-25
      score = madeTheBid ? 25 : -25;
    } else {
      //* if not it is +30/-30
      score = madeTheBid ? 30 : -30;
    }
    return score; //* we return early because DashCall doesn't get any bonuses
  }

  //! High bid Logc (8-13)
  if (bid >= 8 && bid <= 13) {
    if (madeTheBid) {
      score = bid * bid;
    } else {
      score = -(bid * bid) / 2;
    }

    //* Only winner and only loser bonuses

    if (isOnlyWinner) {
      score += 10;
    }
    if (isOnlyLoser) {
      score -= 10;
    }
    return score;
  }

  //! Los bids logic (1-7)
  //* 1. Round Win Bonus
  if (madeTheBid) {
    score += 10; //* if you win u get +10 , there is no -10 penality
  }

  //* 2. Tricks Amount Bonus/Penalty
  if (madeTheBid) {
    score += result; //* if you win you get the number of tricks as points
  } else {
    score -= Math.abs(bid - result); //* Lose points equal to how far off you were
  }

  //* 3. Caller Bonus
  if (isCaller) {
    score += madeTheBid ? 10 : -10; //* if you win you get +10 if you lose you get -10
  }

  //* 4. WITH BONUS
  if (isWith) {
    score += madeTheBid ? 10 : -10; //* if you win you get +10 if you lose you get -10
  }

  //* 5. ONLY WINNER/LOSER BONUS
  if (isOnlyWinner) {
    score += 10; //* Only winner gets +10
  }
  if (isOnlyLoser) {
    score -= 10; //* Only loser gets -10
  }

  //* 6. Risk calculation
  if (isRisk && riskMultiplier > 0) {
    const riskBonus = 10 * riskMultiplier;

    score += madeTheBid ? riskBonus : -riskBonus;
  }
  return score;
}

//! Calculate Round
export function calculateRoundScores(
  game: GameData, //* game Object
  roundIndex: number //* the round index to calculate
) {
  //* Extract round Data
  const calls = game.calls[roundIndex];
  const results = game.results[roundIndex];
  const roundDifference = game.roundDifferences[roundIndex];

  //* Validation
  //* if there is no calls or no results or any of the calls is null (player didn't choose their bid yet) or any of the results null we can't calculate
  if (!calls || !results || calls.some((c) => c === null) || results.some((r) => r === null)) {
    throw new Error("Cannot calculate scores: missing calls or results");
  }

  //* Type Assertion
  const validCalls = calls as number[];
  const validResults = results as number[];

  let multiplier = 1;

  //* find the index of the caller
  const currentCallerIdx = game.isCaller[roundIndex]?.findIndex((ic) => ic) ?? -1;
  //* get the caller bid if found
  const currentCallerBid = currentCallerIdx !== -1 ? validCalls[currentCallerIdx] : null;
  //* Count with players
  const currentWithCount =
    validCalls.filter(
      (call, idx) =>
        !game.isCaller[roundIndex]?.[idx] && //* not the caller
        !game.isDashCall?.[roundIndex]?.[idx] && //* not dash caller
        call === currentCallerBid && //* bid matches caller
        currentCallerBid !== null //* caller bid exists
    ).length || 0;

  //* +2 With Counting
  const isCurrentCallerPlusTwoWith = currentCallerIdx !== -1 && currentWithCount >= 2;

  if (isCurrentCallerPlusTwoWith) {
    multiplier *= 2;
  }

  //* Check Previous rounds in everyone lost

  for (let i = roundIndex - 1; i >= 0; i--) {
    const wasEveryoneLost = game.everyoneLost && game.everyoneLost[i]; //* check if everyone lost last round

    if (wasEveryoneLost) {
      multiplier *= 2; //* update the multiplier
    } else {
      break; //* break out of the loop if no one lost last round
    }
  }

  //* Round Properties
  const totalCalls = validCalls.reduce((sum, call) => sum + call, 0);
  const isRisk = roundDifference !== null && Math.abs(roundDifference) >= 2;
  const isPositiveDash = totalCalls > 13;

  //* Calculate the risk Multiplier

  let riskMultiplier = 0;
  if (roundDifference !== null) {
    const absDiff = Math.abs(roundDifference);
    if (absDiff >= 8) {
      riskMultiplier = 4;
    } else if (absDiff >= 6) {
      riskMultiplier = 3;
    } else if (absDiff >= 4) {
      riskMultiplier = 2;
    } else if (absDiff >= 2) {
      riskMultiplier = 1;
    }
  }

  //* Determine which player is at risk
  const callerIndex = game.isCaller[roundIndex]?.findIndex((isCaller) => isCaller) ?? -1;
  let riskPlayerIndex = -1;

  //* Check if this is mandatory Round in Classic mode
  const roundNumber = roundIndex + 1;
  const isClassicMode = game.mode === "classic";
  const isMandatoryRound = isClassicMode && roundNumber >= 14 && roundNumber <= 18;

  //* Mandatory Suit Rounds

  if (isMandatoryRound) {
    const manualRiskIndex = game.manualRisk?.[roundIndex]?.findIndex((risk) => risk) ?? -1;
    if (manualRiskIndex !== -1) {
      riskPlayerIndex = manualRiskIndex;
    }
  } else {
    //* the Automatic Risk
    if (callerIndex !== -1) {
      for (let offset = 3; offset >= 1; offset--) {
        const candidateIndex = (callerIndex + offset) % 4;
        const isDC = game.isDashCall?.[roundIndex]?.[candidateIndex] ?? false;

        if (!isDC) {
          riskPlayerIndex = candidateIndex;
          break;
        }
      }
    }
  }

  //* Winners and losers
  const winners: boolean[] = validCalls.map((call, idx) => call === validResults[idx]);
  const winnersCount = winners.filter((w) => w).length;
  const losersCount = 4 - winnersCount;

  const isOnlyWinner = winnersCount === 1;
  const isOnlyLoser = losersCount === 1;

  //! Calucalte Scores for all players

  //* Calculate scores for each player
  const roundScores: number[] = [];
  const newIsWinner: boolean[] = [];

  for (let playerIndex = 0; playerIndex < 4; playerIndex++) {
    const bid = validCalls[playerIndex];
    const result = validResults[playerIndex];
    const isDash = bid === 0;
    const madeTheBid = bid === result;

    //* Get caller status from game state
    const isCaller = game.isCaller[roundIndex]?.[playerIndex] ?? false;

    const callerBid = game.isCaller[roundIndex]?.findIndex((ic) => ic) !== -1 ? validCalls[game.isCaller[roundIndex].findIndex((ic) => ic)] : null;
    const isWith = !isCaller && callerBid !== null && bid === callerBid;

    //* Determine if this player is at risk
    const playerIsAtRisk = isRisk && playerIndex === riskPlayerIndex;

    //* Determine if this player gets only winner/loser bonus
    const playerIsOnlyWinner = isOnlyWinner && madeTheBid;
    const playerIsOnlyLoser = isOnlyLoser && !madeTheBid;

    //* Calculate base score (with risk multiplier)
    const baseScore = calculatePlayerScore(bid, result, isDash, isPositiveDash, isCaller, playerIsAtRisk, playerIsOnlyWinner, playerIsOnlyLoser, isWith, riskMultiplier);

    //* Apply multiplier (from everyone lost / caller+2with)
    const score = baseScore * multiplier;

    roundScores.push(score);
    newIsWinner.push(madeTheBid);
  }
  return {
    scores: roundScores,
    isWinner: newIsWinner,
  };
}

export function calculateCumulativeScores(game: GameData, upToRound: number): number[] {
  //* start counting at 0 for everyone
  const cumulativeScores = [0, 0, 0, 0];

  //* Loop through each round untill the currecnt one
  for (let roundIndex = 0; roundIndex < upToRound; roundIndex++) {
    //* Get that round's scores
    const roundScores = game.scores[roundIndex];

    //* If scores exist for that round
    if (roundScores) {
      for (let playerIndex = 0; playerIndex < 4; playerIndex++) {
        cumulativeScores[playerIndex] += roundScores[playerIndex]; //* Add to total
      }
    }
  }

  return cumulativeScores;
}

export function determineCallerForRound(roundIndex: number): number {
  return roundIndex % 4;
}
