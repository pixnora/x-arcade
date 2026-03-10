(function() {
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || window.innerWidth < 768;
  if (!isMobile) return;

  const style = document.createElement('style');
  style.innerHTML = `
    #virtual-gamepad {
      position: fixed;
      bottom: 10px;
      left: 0;
      width: 100%;
      height: 140px;
      display: flex;
      justify-content: space-between;
      padding: 0 15px;
      pointer-events: none;
      z-index: 9999;
      box-sizing: border-box;
    }
    .vg-dpad, .vg-buttons {
      position: relative;
      width: 130px;
      height: 130px;
      pointer-events: auto;
    }
    .vg-btn {
      position: absolute;
      width: 44px;
      height: 44px;
      background: rgba(255, 255, 255, 0.85);
      border: 3px solid #111;
      border-radius: 8px;
      box-shadow: 2px 2px 0 #111;
      display: flex;
      align-items: center;
      justify-content: center;
      font-weight: 900;
      font-size: 18px;
      user-select: none;
      -webkit-user-select: none;
      touch-action: none;
      color: #111;
    }
    .vg-btn:active {
      background: #ccc;
      transform: translate(2px, 2px);
      box-shadow: none;
    }
    .vg-up { top: 0; left: 43px; }
    .vg-down { bottom: 0; left: 43px; }
    .vg-left { top: 43px; left: 0; }
    .vg-right { top: 43px; right: 0; }
    
    .vg-action {
      width: 54px;
      height: 54px;
      border-radius: 27px;
      bottom: 20px;
    }
    .vg-a { right: 0; background: #ffed66; bottom: 10px;}
    .vg-b { right: 65px; bottom: 50px; background: #ff7675; }
    
    body {
        overflow-x: hidden;
    }
    .game-page {
        padding: 10px 10px 160px; /* Space for gamepad */
    }
  `;
  document.head.appendChild(style);

  let scriptText = "";
  document.querySelectorAll("script").forEach(s => scriptText += s.innerText);

  const needsGamepad = scriptText.includes('Arrow') || 
                       scriptText.includes('e.code') || 
                       scriptText.includes('KeyW') ||
                       scriptText.includes('WASD') ||
                       scriptText.includes('keydown');

  if (needsGamepad && !window.location.href.includes('typing') && !window.location.href.includes('hangman') && !window.location.href.includes('colorflood') && !window.location.href.includes('reaction') && !window.location.href.includes('memory') && !window.location.href.includes('simon') && !window.location.href.includes('whack')) {
      const gamepad = document.createElement('div');
      gamepad.id = 'virtual-gamepad';
      gamepad.innerHTML = `
        <div class="vg-dpad">
          <div class="vg-btn vg-up" data-k="ArrowUp" data-c="ArrowUp">↑</div>
          <div class="vg-btn vg-down" data-k="ArrowDown" data-c="ArrowDown">↓</div>
          <div class="vg-btn vg-left" data-k="ArrowLeft" data-c="ArrowLeft">←</div>
          <div class="vg-btn vg-right" data-k="ArrowRight" data-c="ArrowRight">→</div>
        </div>
        <div class="vg-buttons">
          <div class="vg-btn vg-action vg-b" data-k="Enter" data-c="Enter">B</div>
          <div class="vg-btn vg-action vg-a" data-k=" " data-c="Space">A</div>
        </div>
      `;
      document.body.appendChild(gamepad);

      const btns = gamepad.querySelectorAll('.vg-btn');
      btns.forEach(btn => {
        const trigger = (type) => {
          const k = btn.getAttribute('data-k');
          const c = btn.getAttribute('data-c');
          const code = k === ' ' ? 32 : (k === 'ArrowUp' ? 38 : (k === 'ArrowDown' ? 40 : (k === 'ArrowLeft' ? 37 : (k === 'ArrowRight' ? 39 : 13))));
          
          let ev = new KeyboardEvent(type, { key: k, code: c, keyCode: code, which: code, bubbles: true });
          document.dispatchEvent(ev);
        };
        btn.addEventListener('touchstart', (e) => { e.preventDefault(); btn.style.background = '#ddd'; trigger('keydown'); });
        btn.addEventListener('touchend', (e) => { e.preventDefault(); btn.style.background = ''; trigger('keyup'); });
      });
  }

  document.querySelectorAll('canvas').forEach(canvas => {
    canvas.addEventListener('touchstart', (e) => {
      if(e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        let x = (touch.clientX - rect.left) * (canvas.width / rect.width);
        let y = (touch.clientY - rect.top) * (canvas.height / rect.height);
        
        canvas.dispatchEvent(new MouseEvent('mousedown', { clientX: touch.clientX, clientY: touch.clientY }));
        // Some games use mousemove without mousedown, let's also pass offsetX
        let mv = new MouseEvent('mousemove', { clientX: touch.clientX, clientY: touch.clientY });
        mv.offsetX = x; mv.offsetY = y;
        canvas.dispatchEvent(mv);
      }
    }, {passive: false});

    canvas.addEventListener('touchmove', (e) => {
      if(e.cancelable) e.preventDefault();
      if(e.touches.length > 0) {
        const touch = e.touches[0];
        const rect = canvas.getBoundingClientRect();
        let x = (touch.clientX - rect.left) * (canvas.width / rect.width);
        let y = (touch.clientY - rect.top) * (canvas.height / rect.height);
        
        let mv = new MouseEvent('mousemove', { clientX: touch.clientX, clientY: touch.clientY });
        mv.offsetX = x; mv.offsetY = y;
        canvas.dispatchEvent(mv);
      }
    }, {passive: false});
    
    canvas.addEventListener('touchend', (e) => {
      canvas.dispatchEvent(new MouseEvent('mouseup', {}));
    });
  });
})();
