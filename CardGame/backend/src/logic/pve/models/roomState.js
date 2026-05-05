export function createRoomState({
  roomId = null,
  dealerSide = "player",
  activeSide = dealerSide,
} = {}) {
  return {
    roomId,
    pot: 0,
    currentBet: 0,
    dealerSide,
    activeSide,
  };
}

