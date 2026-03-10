/**
 * PIXNORA Mobile Controller v2
 * - Auto-detect mobile
 * - Inject virtual D-Pad OR Joystick (user toggleable)
 * - Only inject on games that actually need keyboard input
 * - Touch-Mouse proxy for canvas games
 * - Prevent redundant controls on swipe/click-only games
 */
(function() {
  'use strict';

  // ====== Detect Mobile ======
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent)
    || ('ontouchstart' in window)
    || window.innerWidth < 768;
  if (!isMobile) return;

  // ====== Determine which page we're on ======
  const path = window.location.pathname.toLowerCase();

  // Games that already have native touch/click and do NOT need a gamepad
  const noGamepadGames = [
    'balloon', 'colorflood', 'reaction', 'memory', 'simon', 'whack',
    'tictactoe', 'connect4', 'hangman', 'aim', 'typing', 'minesweeper'
  ];
  // Games where only Up/Down matter (hide Left/Right)
  const upDownOnly = ['pong'];
  // Games where only A (space/jump) matters, no d-pad needed
  const jumpOnly = ['jumper'];

  const needsGamepad = !noGamepadGames.some(g => path.includes(g));

  // ====== Inject global mobile CSS ======
  const css = document.createElement('style');
  css.textContent = `
    body { overflow-x: hidden; -webkit-text-size-adjust: 100%; }
    .game-page { padding: 10px 10px 20px; }
    .game-page.has-gamepad { padding-bottom: 170px; }

    /* ===== Control Selector ===== */
    #ctrl-selector {
      position: fixed; bottom: 148px; right: 10px; z-index: 10000;
      display: flex; gap: 4px;
    }
    #ctrl-selector button {
      background: rgba(255,255,255,0.9); border: 2px solid #111;
      width: 36px; height: 36px; font-size: 14px; font-weight: 900;
      border-radius: 6px; box-shadow: 1px 1px 0 #111;
      display: flex; align-items: center; justify-content: center;
      color: #555; padding: 0;
    }
    #ctrl-selector button.active { background: #ffed66; color: #111; }

    /* ===== Virtual Gamepad (D-Pad mode) ===== */
    #virtual-gamepad {
      position: fixed; bottom: 8px; left: 0; width: 100%;
      height: 140px; display: flex; justify-content: space-between;
      padding: 0 12px; pointer-events: none; z-index: 9999;
      box-sizing: border-box;
    }
    .vg-dpad, .vg-buttons {
      position: relative; width: 130px; height: 130px; pointer-events: auto;
    }
    .vg-btn {
      position: absolute; width: 46px; height: 46px;
      background: rgba(255,255,255,0.9); border: 3px solid #111;
      border-radius: 8px; box-shadow: 2px 2px 0 #111;
      display: flex; align-items: center; justify-content: center;
      font-weight: 900; font-size: 18px;
      user-select: none; -webkit-user-select: none;
      touch-action: none; color: #111;
    }
    .vg-btn:active { background: #ddd; transform: translate(2px,2px); box-shadow: none; }
    .vg-up    { top: 0; left: 42px; }
    .vg-down  { bottom: 0; left: 42px; }
    .vg-left  { top: 42px; left: 0; }
    .vg-right { top: 42px; right: 0; }
    .vg-action {
      width: 56px; height: 56px; border-radius: 28px;
    }
    .vg-a { right: 0; bottom: 10px; background: #ffed66; }

    /* ===== Virtual Joystick ===== */
    #virtual-joystick {
      position: fixed; bottom: 8px; left: 12px;
      width: 130px; height: 130px;
      pointer-events: auto; z-index: 9999; touch-action: none;
    }
    .vj-base {
      width: 130px; height: 130px; border-radius: 65px;
      background: rgba(255,255,255,0.7); border: 3px solid #111;
      box-shadow: 3px 3px 0 #111;
      position: relative;
    }
    .vj-knob {
      width: 50px; height: 50px; border-radius: 25px;
      background: rgba(255,237,102,0.95); border: 3px solid #111;
      box-shadow: 2px 2px 0 #111;
      position: absolute; top: 40px; left: 40px;
    }
    #vj-action-btns {
      position: fixed; bottom: 30px; right: 20px; z-index: 9999;
      pointer-events: auto;
    }
    #vj-action-btns .vg-btn {
      position: relative; display: inline-flex;
    }

    /* Hide modes */
    .ctrl-dpad #virtual-joystick, .ctrl-dpad #vj-action-btns { display: none !important; }
    .ctrl-joystick #virtual-gamepad { display: none !important; }
    .ctrl-none #virtual-gamepad, .ctrl-none #virtual-joystick,
    .ctrl-none #vj-action-btns, .ctrl-none #ctrl-selector { display: none !important; }
  `;
  document.head.appendChild(css);

  if (!needsGamepad) return;

  // Mark body
  document.body.classList.add('has-gamepad');

  // ====== Control Selector ======
  const selector = document.createElement('div');
  selector.id = 'ctrl-selector';
  selector.innerHTML = `
    <button data-mode="dpad" title="D-Pad">✛</button>
    <button data-mode="joystick" title="Joystick">⊙</button>
  `;
  document.body.appendChild(selector);
  selector.querySelectorAll('button').forEach(btn => {
    btn.addEventListener('click', () => {
      controlMode = btn.dataset.mode;
      localStorage.setItem('pixnora_ctrl', controlMode);
      applyMode(controlMode);
    });
    btn.addEventListener('touchstart', (e) => {
      e.preventDefault();
      controlMode = btn.dataset.mode;
      localStorage.setItem('pixnora_ctrl', controlMode);
      applyMode(controlMode);
    }, {passive: false});
  });

  // ====== Read saved preference ======
  let controlMode = localStorage.getItem('pixnora_ctrl') || 'dpad';
  applyMode(controlMode);

  function applyMode(mode) {
    document.body.classList.remove('ctrl-dpad', 'ctrl-joystick', 'ctrl-none');
    document.body.classList.add('ctrl-' + mode);
    selector.querySelectorAll('button').forEach(b => {
      b.classList.toggle('active', b.dataset.mode === mode);
    });
  }

  // ====== Helper: fire keyboard events ======
  const keyMap = {' ':32, ArrowUp:38, ArrowDown:40, ArrowLeft:37, ArrowRight:39, Enter:13};
  function fireKey(type, k, c) {
    document.dispatchEvent(new KeyboardEvent(type, {
      key: k, code: c, keyCode: keyMap[k]||0, which: keyMap[k]||0, bubbles: true
    }));
  }

  // ====== Build D-Pad ======
  const isUpDown = upDownOnly.some(g => path.includes(g));
  const isJump = jumpOnly.some(g => path.includes(g));
  const gamepad = document.createElement('div');
  gamepad.id = 'virtual-gamepad';

  let dpadHTML = '';
  if (!isJump) {
    dpadHTML = `<div class="vg-dpad">
      <div class="vg-btn vg-up" data-k="ArrowUp" data-c="ArrowUp">↑</div>
      <div class="vg-btn vg-down" data-k="ArrowDown" data-c="ArrowDown">↓</div>
      ${isUpDown ? '' : '<div class="vg-btn vg-left" data-k="ArrowLeft" data-c="ArrowLeft">←</div>'}
      ${isUpDown ? '' : '<div class="vg-btn vg-right" data-k="ArrowRight" data-c="ArrowRight">→</div>'}
    </div>`;
  } else {
    dpadHTML = '<div class="vg-dpad"></div>';
  }

  gamepad.innerHTML = `
    ${dpadHTML}
    <div class="vg-buttons">
      <div class="vg-btn vg-action vg-a" data-k=" " data-c="Space">A</div>
    </div>
  `;
  document.body.appendChild(gamepad);

  // Bind D-Pad buttons
  gamepad.querySelectorAll('.vg-btn').forEach(btn => {
    btn.addEventListener('touchstart', e => {
      e.preventDefault();
      btn.style.background = '#ddd';
      fireKey('keydown', btn.dataset.k, btn.dataset.c);
    });
    btn.addEventListener('touchend', e => {
      e.preventDefault();
      btn.style.background = '';
      fireKey('keyup', btn.dataset.k, btn.dataset.c);
    });
  });

  // ====== Build Joystick ======
  const joystickWrap = document.createElement('div');
  joystickWrap.id = 'virtual-joystick';
  joystickWrap.innerHTML = `<div class="vj-base"><div class="vj-knob" id="vj-knob"></div></div>`;
  document.body.appendChild(joystickWrap);

  const joyBtns = document.createElement('div');
  joyBtns.id = 'vj-action-btns';
  joyBtns.innerHTML = `<div class="vg-btn vg-action vg-a" data-k=" " data-c="Space" style="width:60px;height:60px;border-radius:30px;position:relative;">A</div>`;
  document.body.appendChild(joyBtns);

  joyBtns.querySelectorAll('.vg-btn').forEach(btn => {
    btn.addEventListener('touchstart', e => {
      e.preventDefault(); btn.style.background = '#ddd';
      fireKey('keydown', btn.dataset.k, btn.dataset.c);
    });
    btn.addEventListener('touchend', e => {
      e.preventDefault(); btn.style.background = '';
      fireKey('keyup', btn.dataset.k, btn.dataset.c);
    });
  });

  // Joystick logic
  const knob = document.getElementById('vj-knob');
  const base = joystickWrap.querySelector('.vj-base');
  const baseR = 65, knobR = 25, maxDist = baseR - knobR;
  let joyActive = false;
  let joyKeys = { ArrowUp: false, ArrowDown: false, ArrowLeft: false, ArrowRight: false };

  function setJoyKey(dir, pressed) {
    if (joyKeys[dir] === pressed) return;
    joyKeys[dir] = pressed;
    fireKey(pressed ? 'keydown' : 'keyup', dir, dir);
  }

  function updateJoystick(touchX, touchY) {
    const rect = base.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    let dx = touchX - cx;
    let dy = touchY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxDist) { dx = dx / dist * maxDist; dy = dy / dist * maxDist; }
    knob.style.left = (baseR - knobR + dx) + 'px';
    knob.style.top = (baseR - knobR + dy) + 'px';

    const threshold = maxDist * 0.35;
    setJoyKey('ArrowUp', dy < -threshold);
    setJoyKey('ArrowDown', dy > threshold);
    setJoyKey('ArrowLeft', dx < -threshold);
    setJoyKey('ArrowRight', dx > threshold);
  }

  function resetJoystick() {
    knob.style.left = (baseR - knobR) + 'px';
    knob.style.top = (baseR - knobR) + 'px';
    Object.keys(joyKeys).forEach(k => setJoyKey(k, false));
    joyActive = false;
  }

  joystickWrap.addEventListener('touchstart', e => {
    e.preventDefault(); joyActive = true;
    updateJoystick(e.touches[0].clientX, e.touches[0].clientY);
  }, {passive: false});

  joystickWrap.addEventListener('touchmove', e => {
    e.preventDefault();
    if (joyActive && e.touches.length > 0) {
      updateJoystick(e.touches[0].clientX, e.touches[0].clientY);
    }
  }, {passive: false});

  joystickWrap.addEventListener('touchend', e => { e.preventDefault(); resetJoystick(); });
  joystickWrap.addEventListener('touchcancel', () => { resetJoystick(); });

  // ====== Canvas Touch -> Mouse proxy (for breakout etc.) ======
  document.querySelectorAll('canvas').forEach(canvas => {
    canvas.addEventListener('touchstart', (e) => {
      if (e.touches.length > 0) {
        const t = e.touches[0];
        canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: t.clientX, clientY: t.clientY }));
        canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: t.clientX, clientY: t.clientY }));
      }
    }, {passive: false});

    canvas.addEventListener('touchmove', (e) => {
      if (e.cancelable) e.preventDefault();
      if (e.touches.length > 0) {
        const t = e.touches[0];
        canvas.dispatchEvent(new MouseEvent('mousemove', { clientX: t.clientX, clientY: t.clientY }));
      }
    }, {passive: false});

    canvas.addEventListener('touchend', () => {
      canvas.dispatchEvent(new MouseEvent('mouseup', {}));
    });
  });

})();
