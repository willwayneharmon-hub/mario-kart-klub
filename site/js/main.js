// Sound toggle
(function () {
  const btn = document.getElementById('sound-toggle');
  const icon = document.getElementById('sound-icon');
  const key = 'mkk-sound';

  function isMuted() {
    return localStorage.getItem(key) !== 'on';
  }

  function update() {
    const muted = isMuted();
    icon.textContent = muted ? '🔇' : '🔊';
    btn.setAttribute('aria-label', muted ? 'Unmute sound' : 'Mute sound');
    // Dispatch event for game.js to listen to
    window.dispatchEvent(new CustomEvent('soundtoggle', { detail: { muted } }));
  }

  btn.addEventListener('click', function () {
    localStorage.setItem(key, isMuted() ? 'on' : 'off');
    update();
  });

  update();
})();
