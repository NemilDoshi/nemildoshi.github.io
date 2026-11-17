const game = document.querySelector('#field-game');
const player = game.querySelector('.game-player');
const gameStatus = game.querySelector('.game-status');
const stops = Array.from(game.querySelectorAll('.game-stop'));
const directions = {
  ArrowLeft: [-1, 0],
  ArrowUp: [0, -1],
  ArrowDown: [0, 1],
  ArrowRight: [1, 0],
};
let column = 2;
let row = 2;

function showPlayer() {
  player.style.setProperty('--column', column);
  player.style.setProperty('--row', row);
}

function movePlayer(direction) {
  const [horizontal, vertical] = directions[direction];
  column = Math.max(0, Math.min(4, column + horizontal));
  row = Math.max(0, Math.min(4, row + vertical));
  showPlayer();

  const stop = stops.find(({ dataset }) => Number(dataset.column) === column && Number(dataset.row) === row);
  player.classList.toggle('on-marker', Boolean(stop));
  if (!stop) return;

  const link = stop.querySelector('a');
  if (!link.hidden) return;

  stop.querySelector('.game-locked').hidden = true;
  link.hidden = false;
  const unlocked = stops.filter((marker) => !marker.querySelector('a').hidden).length;
  gameStatus.textContent = `${link.textContent} unlocked. ${unlocked} of ${stops.length} projects unlocked.`;
}

game.addEventListener('keydown', (event) => {
  if (!Object.hasOwn(directions, event.key) || event.altKey || event.metaKey || event.ctrlKey) return;
  event.preventDefault();
  movePlayer(event.key);
});
game.querySelectorAll('[data-move]').forEach((button) => {
  button.addEventListener('click', () => movePlayer(button.dataset.move));
});
game.querySelector('.game-reset').addEventListener('click', () => {
  column = 2;
  row = 2;
  showPlayer();
  player.classList.remove('on-marker');
  stops.forEach((stop) => {
    stop.querySelector('.game-locked').hidden = false;
    stop.querySelector('a').hidden = true;
  });
  gameStatus.textContent = `0 of ${stops.length} projects unlocked`;
});

const checklist = document.querySelector('#race-checklist');
const items = Array.from(checklist.querySelectorAll('input[type="checkbox"]'));
const progress = document.querySelector('#race-progress');
const reset = document.querySelector('#race-reset');

function updateRaceProgress() {
  const checked = items.filter((item) => item.checked).length;
  progress.textContent = checked === items.length
    ? 'Checklist complete.'
    : `${checked} of ${items.length} checked`;
}

checklist.addEventListener('change', updateRaceProgress);
reset.addEventListener('click', () => {
  items.forEach((item) => { item.checked = false; });
  updateRaceProgress();
  items[0].focus();
});

updateRaceProgress();
progress.parentElement.hidden = false;
