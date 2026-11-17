const projectLinks = document.querySelectorAll('.pitch-link');

function openLinkedProject(moveFocus = false) {
  const project = document.getElementById(window.location.hash.slice(1));
  if (!(project instanceof HTMLDetailsElement)) return;

  project.open = true;
  if (moveFocus) project.querySelector('summary').focus({ preventScroll: true });
}

window.addEventListener('hashchange', () => openLinkedProject());
projectLinks.forEach((link) => {
  link.addEventListener('click', (event) => {
    if (event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    requestAnimationFrame(() => openLinkedProject(true));
  });
});
openLinkedProject();

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
