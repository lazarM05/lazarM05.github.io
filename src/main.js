import './style.css';
import * as ui from './ui.js';

// index.html still uses inline onclick/oninput attributes (unchanged from the
// original prototype) — those run in global scope, so the handlers they call
// need to exist on window. Everything else in ui.js stays module-private.
Object.assign(window, {
  selectMode: ui.selectMode,
  goHome: ui.goHome,
  goSetup: ui.goSetup,
  addPlayer: ui.addPlayer,
  removePlayer: ui.removePlayer,
  updatePlayerName: ui.updatePlayerName,
  goToPeek: ui.goToPeek,
  unlockPeek: ui.unlockPeek,
  peekNext: ui.peekNext,
  skipVote: ui.skipVote,
  confirmElimination: ui.confirmElimination,
  nextCycle: ui.nextCycle,
  submitGuess: ui.submitGuess,
  showGameOver: ui.showGameOver,
  playAgain: ui.playAgain,
  onImpAutoToggle: ui.onImpAutoToggle,
  onImpCountInput: ui.onImpCountInput,
  onImpCountFocus: ui.onImpCountFocus,
  onCkAutoToggle: ui.onCkAutoToggle,
  onCkCountInput: ui.onCkCountInput,
  onCkCountFocus: ui.onCkCountFocus,
  onToggleBlocked: ui.onToggleBlocked,
  onToggleChange: ui.onToggleChange,
  imposterGuessedWord: ui.imposterGuessedWord,
});

ui.initPlayers();
