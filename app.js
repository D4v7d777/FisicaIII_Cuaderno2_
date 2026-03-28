// ═══════════════════════════════════════════════════════════════
//  PhysicsLab app.js
//  Routing, LaTeX rendering, and Simulation Engine
// ═══════════════════════════════════════════════════════════════

(function () {
  'use strict';

  // ── THEME TOGGLE ──
  window.toggleTheme = function() {
    const html = document.documentElement;
    const current = html.getAttribute('data-theme') || 'dark';
    const next = current === 'dark' ? 'light' : 'dark';
    html.setAttribute('data-theme', next);
    localStorage.setItem('physics_theme', next);
    updateThemeUI(next);
  };

  function updateThemeUI(theme) {
    const icon = document.getElementById('themeIcon');
    const label = document.getElementById('themeLabel');
    if (icon) {
      icon.className = theme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    if (label) {
      label.textContent = theme === 'dark' ? 'Modo Claro' : 'Modo Oscuro';
    }
  }

  // Load saved theme on startup
  function initTheme() {
    const saved = localStorage.getItem('physics_theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
    updateThemeUI(saved);
  }
  // Run immediately
  initTheme();
  // ── APP ROUTER STATE ──
  window.appState = {
    currentView: 'home',
    goHome: function() {
      // Clean up iframe when leaving
      var iframe = document.getElementById('fullscreen-iframe');
      if (iframe) iframe.src = '';
      // If in fullscreen, exit first
      if (document.fullscreenElement) {
        document.exitFullscreen().then(function() {
          showView('home');
        }).catch(function() {
          showView('home');
        });
      } else {
        showView('home');
      }
    },
    openNotebook: function(id) { showView('nb' + id); renderMath(); },
    openIframe: function(src, title) {
      console.log("[DEBUG] openIframe called with src:", src, "and title:", title);
      var titleEl = document.getElementById('iframe-title');
      var iframe = document.getElementById('fullscreen-iframe');
      if (titleEl) titleEl.textContent = title || 'Laboratorio';
      if (iframe) iframe.src = src;
      showView('iframe');
      console.log("[DEBUG] showView('iframe') executed.");
    },
    openVideo: function() {
      // Abre el video en una nueva pestaña
      window.open('https://youtu.be/3b4Vv8zIwt4?si=y4RfqwaY0XDqKJTE', '_blank');
    }
  };

  function showView(viewId) {
    var panels = document.querySelectorAll('.view-panel');
    for (var i = 0; i < panels.length; i++) {
      panels[i].classList.remove('active');
    }
    var target = document.getElementById('view-' + viewId);
    if (target) {
      target.classList.add('active');
    }
    appState.currentView = viewId;
    var mainContent = document.querySelector('.main-content');
    if (mainContent) mainContent.scrollTop = 0;
    window.scrollTo(0, 0);
  }

  // ── LaTeX Render ──
  function renderMath() {
    if (window.renderMathInElement) {
      document.querySelectorAll('.tex-content').forEach(el => {
        renderMathInElement(el, {
          delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '\\[', right: '\\]', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\(', right: '\\)', display: false}
          ],
          throwOnError: false
        });
      });
    }
  }

  // ══════════════════════════════════════════════════
  //  BOOK CONTROLLER (3D Page-Turning)
  // ══════════════════════════════════════════════════
  const books = {};

  window.BookCtrl = {
    init(bookId) {
      const bookEl = document.getElementById('book-' + bookId);
      if (!bookEl) return;
      const pages = bookEl.querySelectorAll('.page');
      books[bookId] = { pages, current: 0, total: pages.length };
      this.updateIndicator(bookId);
    },
    next(bookId) {
      const b = books[bookId]; if (!b || b.current >= b.total || b.isAnimating) return;
      b.isAnimating = true;
      const page = b.pages[b.current];
      const targetZ = b.current;
      page.style.zIndex = 100; // Mantener arriba durante la animación
      page.classList.add('flipped');
      setTimeout(() => {
          page.style.zIndex = targetZ;
          b.isAnimating = false;
      }, 900); // 900ms es la duración de la transición CSS
      b.current++;
      this.updateIndicator(bookId);
      renderMath();
    },
    prev(bookId) {
      const b = books[bookId]; if (!b || b.current <= 0 || b.isAnimating) return;
      b.isAnimating = true;
      b.current--;
      const page = b.pages[b.current];
      const targetZ = b.total - b.current;
      page.style.zIndex = 100; // Mantener arriba durante la animación
      page.classList.remove('flipped');
      setTimeout(() => {
          page.style.zIndex = targetZ;
          b.isAnimating = false;
      }, 900);
      this.updateIndicator(bookId);
      renderMath();
    },
    goToStart(bookId) {
      const b = books[bookId]; if (!b) return;
      // Instant reset without animation to avoid blocking
      b.isAnimating = false;
      b.pages.forEach((p, i) => {
        p.style.transition = 'none';
        p.classList.remove('flipped');
        p.style.zIndex = b.total - i;
      });
      b.current = 0;
      this.updateIndicator(bookId);
      // Restore transitions after a frame
      requestAnimationFrame(() => {
        b.pages.forEach(p => {
          p.style.transition = '';
        });
      });
    },
    fullscreen(bookId) {
      const nbId = bookId.startsWith('nb') ? bookId.replace('nb','') : bookId;
      const viewEl = document.getElementById('view-nb' + nbId);
      if (!viewEl) return;
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      } else {
        viewEl.requestFullscreen().catch(() => {});
      }
    },
    updateIndicator(bookId) {
      const b = books[bookId]; if (!b) return;
      const ind = document.getElementById('page-ind-' + bookId);
      if (!ind) return;
      const totalPages = b.total * 2;
      const showingStart = b.current * 2 + 1;
      const showingEnd = Math.min(showingStart + 1, totalPages);
      ind.textContent = `Pág ${showingStart}-${showingEnd} / ${totalPages}`;
    },
    reset(bookId) {
      const b = books[bookId]; if (!b) return;
      b.isAnimating = false;
      b.pages.forEach((p, i) => {
        p.style.transition = 'none';
        p.classList.remove('flipped');
        p.style.zIndex = b.total - i;
      });
      b.current = 0;
      this.updateIndicator(bookId);
      // Restore transitions after layout
      requestAnimationFrame(() => {
        b.pages.forEach(p => {
          p.style.transition = '';
        });
      });
    }
  };

  // Generate spiral rings
  function generateSpirals() {
    document.querySelectorAll('.spiral-spine').forEach(spine => {
      spine.innerHTML = '';
      const ringCount = 14;
      for (let i = 0; i < ringCount; i++) {
        const ring = document.createElement('div');
        ring.className = 'spiral-ring';
        spine.appendChild(ring);
      }
    });
  }

  // Override openNotebook to also init book
  const origOpenNb = appState.openNotebook;
  appState.openNotebook = function(id) {
    // Clean up iframe if previously open
    var iframe = document.getElementById('fullscreen-iframe');
    if (iframe) iframe.src = '';
    origOpenNb(id);
    const bookId = 'nb' + id;
    if (!books[bookId]) BookCtrl.init(bookId);
    else BookCtrl.reset(bookId);
    generateSpirals();
    setTimeout(renderMath, 200);
  };

  // Init spirals
  function initApp() {
    generateSpirals();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initApp);
  } else {
    initApp();
  }

  // ══════════════════════════════════════════════════
  //  AI CHATBOT MODULE
  // ══════════════════════════════════════════════════
  const SCIENTISTS = {
    newton: {
      name: 'Isaac Newton',
      image: 'imagenes/isaac newton.png',
      color: '#00f3ff',
      quote: '"Si he visto más lejos, es poniéndome sobre hombros de gigantes."',
      system: 'Eres Isaac Newton, el gran físico y matemático inglés. Hablas en primera persona, como si fueras el verdadero Newton. Cuentas anécdotas sobre la manzana, la gravitación universal, las leyes del movimiento, y el cálculo. Eres serio pero apasionado por la ciencia. Respondes preguntas de física con rigor pero de forma accesible. Siempre en español.'
    },
    hertz: {
      name: 'Heinrich Hertz',
      image: 'imagenes/Heinrich Hertz.png',
      color: '#39ff14',
      quote: '"Las ondas eléctricas que he descubierto transformarán la comunicación humana."',
      system: 'Eres Heinrich Hertz, el físico alemán que demostró la existencia de las ondas electromagnéticas. Hablas en primera persona sobre tus experimentos con ondas, frecuencias y electromagnetismo. Eres metódico y preciso. Respondes preguntas de física con entusiasmo por las ondas y el electromagnetismo. Siempre en español.'
    },
    einstein: {
      name: 'Albert Einstein',
      image: 'imagenes/Albert Einstein.png',
      color: '#ab80ff',
      quote: '"La imaginación es más importante que el conocimiento."',
      system: 'Eres Albert Einstein, el genio de la relatividad. Hablas en primera persona con humor y profundidad. Cuentas sobre la relatividad especial, general, el efecto fotoeléctrico y tu famosa ecuación E=mc². Eres filosófico y curioso. Respondes preguntas de física con analogías brillantes. Siempre en español.'
    },
    curie: {
      name: 'Marie Curie',
      image: 'imagenes/Marie Curie.png',
      color: '#ff6b9d',
      quote: '"Nada en la vida debe ser temido, solo comprendido."',
      system: 'Eres Marie Curie, la primera mujer en ganar un Premio Nobel y la única en ganarlo en dos campos distintos. Hablas en primera persona sobre radioactividad, el polonio, el radio, y la importancia de la perseverancia en la ciencia. Eres determinada e inspiradora. Respondes preguntas de física con pasión. Siempre en español.'
    }
  };

  window.ChatBot = {
    isOpen: false,
    selectedScientist: null,

    toggle() {
      this.isOpen = !this.isOpen;
      const win = document.getElementById('chatWindow');
      win.classList.toggle('open', this.isOpen);
    },

    showSelector() {
      document.getElementById('scientistOverlay').classList.add('open');
    },
    hideSelector() {
      document.getElementById('scientistOverlay').classList.remove('open');
    },

    showSettings() {
      const overlay = document.getElementById('settingsOverlay');
      overlay.classList.add('open');
      // Load saved values
      const saved = localStorage.getItem('physics_api_key') || '';
      const provider = localStorage.getItem('physics_api_provider') || 'openai';
      const model = localStorage.getItem('physics_api_model') || 'gemini-2.5-flash';
      document.getElementById('apiKeyInput').value = saved;
      document.getElementById('apiProvider').value = provider;
      if (document.getElementById('apiModel')) {
          document.getElementById('apiModel').value = model;
      }
    },
    hideSettings() {
      document.getElementById('settingsOverlay').classList.remove('open');
    },
    saveApiKey() {
      const key = document.getElementById('apiKeyInput').value.trim();
      const provider = document.getElementById('apiProvider').value;
      const model = document.getElementById('apiModel') ? document.getElementById('apiModel').value : 'gemini-2.5-flash';
      localStorage.setItem('physics_api_key', key);
      localStorage.setItem('physics_api_provider', provider);
      localStorage.setItem('physics_api_model', model);
      this.hideSettings();
      this.addBotMessage('✅ Configuración guardada correctamente.');
    },

    selectScientist(id) {
      const sci = SCIENTISTS[id];
      if (!sci) return;
      this.selectedScientist = id;
      this.hideSelector();

      // Cinematic intro
      const overlay = document.getElementById('cinematicOverlay');
      const iconEl = document.getElementById('cinematicIcon');
      const nameEl = document.getElementById('cinematicName');
      const quoteEl = document.getElementById('cinematicQuote');

      iconEl.innerHTML = `<img src="${sci.image}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
      iconEl.style.borderColor = sci.color;
      iconEl.style.overflow = 'hidden';
      nameEl.textContent = sci.name;
      quoteEl.textContent = sci.quote;

      overlay.classList.add('active');

      // After animation, update chat and hide overlay
      setTimeout(() => {
        overlay.classList.remove('active');
        // Update chat header
        document.getElementById('chatName').textContent = sci.name;
        document.getElementById('chatAvatar').innerHTML = `<img src="${sci.image}" style="width:100%;height:100%;object-fit:cover;border-radius:50%">`;
        document.getElementById('chatAvatar').style.borderColor = sci.color;

        // Clear and add welcome message
        const msgs = document.getElementById('chatMessages');
        msgs.innerHTML = '';
        this.addBotMessage(`¡Saludos! Soy ${sci.name}. ${sci.quote} ¿En qué puedo ayudarte hoy con tus estudios de física?`);

        if (!this.isOpen) this.toggle();
      }, 2600);
    },

    addBotMessage(text) {
      const msgs = document.getElementById('chatMessages');
      const div = document.createElement('div');
      div.className = 'chat-msg bot tex-content';
      
      // Basic markdown replacement for common formatting
      let formattedText = text;
      formattedText = formattedText.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
      formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
      formattedText = formattedText.replace(/```(.*?)\n([\s\S]*?)```/g, '<pre><code class="$1">$2</code></pre>');
      formattedText = formattedText.replace(/`(.*?)`/g, '<code style="background:rgba(255,255,255,0.1);padding:2px 4px;border-radius:4px">$1</code>');
      formattedText = formattedText.replace(/\n/g, '<br>');

      div.innerHTML = `<div class="msg-bubble">${formattedText}</div>`;
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;

      if (window.renderMathInElement) {
        renderMathInElement(div, {
          delimiters: [
            {left: '$$', right: '$$', display: true},
            {left: '\\[', right: '\\]', display: true},
            {left: '$', right: '$', display: false},
            {left: '\\(', right: '\\)', display: false}
          ],
          throwOnError: false
        });
      }
      if (window.hljs) {
        div.querySelectorAll('pre code').forEach(el => hljs.highlightElement(el));
      }
    },

    addUserMessage(text) {
      const msgs = document.getElementById('chatMessages');
      const div = document.createElement('div');
      div.className = 'chat-msg user';
      div.innerHTML = `<div class="msg-bubble">${text}</div>`;
      msgs.appendChild(div);
      msgs.scrollTop = msgs.scrollHeight;
    },

    async send() {
      const input = document.getElementById('chatInput');
      const text = input.value.trim();
      if (!text) return;
      input.value = '';
      this.addUserMessage(text);

      const apiKey = localStorage.getItem('physics_api_key') || 'gen-lang-client-0334339450';
      let provider = localStorage.getItem('physics_api_provider') || 'gemini';
      
      // Force gemini provider if the key is a gen-lang-* key or AIza (Google AI Studio / Gemini)
      if (apiKey.startsWith('gen-lang-') || apiKey.startsWith('AIza')) {
        provider = 'gemini';
      }

      if (!this.selectedScientist) {
        this.addBotMessage('Por favor selecciona un científico primero haciendo clic en <i class="fas fa-users"></i>.');
        return;
      }

      const sci = SCIENTISTS[this.selectedScientist];
      const systemPrompt = sci.system;
      const attachedImage = this.attachedImageBase64;
      this.removeAttachedImage(); // clear after sending
      
      const uiInstructions = `\n\nIMPORTANTE: Puedes controlar la interfaz de la página. Si el usuario te pide abrir un cuaderno, una animación, ir al inicio, ver el video guía o ver una imagen, DEBES incluir al final de tu respuesta uno de los siguientes comandos exactos entre corchetes:
- [CMD:openNotebook(1)] (para Cuaderno 1: Movimiento Ondulatorio)
- [CMD:openIframe('animaciones/ondas-armonicas.html', 'Ondas Armónicas')]
- [CMD:openIframe('animaciones/ondas-em-mecanicas.html', 'Ondas Electromagnéticas y Mecánicas')]
- [CMD:openIframe('animaciones/ondas-superposicion.html', 'Superposición de Ondas')]
- [CMD:openIframe('animaciones/ondas-temas.html', 'Tipos de Ondas')]
- [CMD:openVideo()] (Para abrir y ver el Video de Movimiento Ondulatorio)
- [CMD:goHome()] (para volver al inicio de la página)
Si necesitas mostrar imágenes (como un código QR, foto de laboratorio, etc.), hazlo escribiendo la etiqueta HTML: <img src='imagenes/nombre_imagen.png' style='width:100%; border-radius:8px'>. Recuerda, siempre incluye los comandos CMD si la solicitud del usuario implica navegar en la app.`;
      const payloadParts = [{ text: systemPrompt + uiInstructions + '\n\nUsuario: ' + text }];
      if (attachedImage && provider === 'gemini') {
        const base64Data = attachedImage.split(',')[1];
        const mimeType = attachedImage.split(';')[0].split(':')[1];
        payloadParts.push({ inline_data: { mime_type: mimeType, data: base64Data } });
      }

      this.addBotMessage('<i class="fas fa-spinner fa-spin"></i> Pensando...');

      // Function to handle Gemini API with retries and fallbacks
      const callGemini = async (modelName, retryCount = 0) => {
        try {
          const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${apiKey}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ contents: [{ parts: payloadParts }] })
          });

          const data = await response.json();

          if (response.status === 429) {
            if (retryCount < 2) {
              const waitTime = (retryCount + 1) * 2000;
              console.warn(`Rate limit hit. Retrying in ${waitTime}ms...`);
              await new Promise(resolve => setTimeout(resolve, waitTime));
              return callGemini(modelName, retryCount + 1);
            } else if (modelName !== 'gemini-1.5-flash') {
              console.warn("Switching to fallback model gemini-1.5-flash...");
              return callGemini('gemini-1.5-flash', 0);
            }
          }

          if (data.error) {
            throw new Error(data.error.message || 'Error desconocido');
          }

          if (data.candidates && data.candidates[0]) {
            return data.candidates[0].content.parts[0].text;
          } else {
            throw new Error('Sin respuesta del modelo');
          }
        } catch (err) {
          if (retryCount < 1 && err.message.includes('Quota exceeded')) {
              // Try one fallback immediately on quota error
              if (modelName !== 'gemini-1.5-flash') {
                  return callGemini('gemini-1.5-flash', 0);
              }
          }
          throw err;
        }
      };

      try {
        let responseText;
        if (provider === 'openai') {
          const response = await fetch('https://api.openai.com/v1/chat/completions', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
            body: JSON.stringify({
              model: 'gpt-3.5-turbo',
              messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: text }
              ],
              max_tokens: 500
            })
          });
          const data = await response.json();
          if (data.choices && data.choices[0]) {
            responseText = data.choices[0].message.content;
          } else {
            throw new Error(data.error?.message || 'Respuesta inesperada');
          }
        } else {
          // Try user requested model first, then fallback
          // Note: Using gemini-2.0-flash as primary for stability, 
          // but prioritizing gemini-2.5-flash if that's what user prefers.
          const preferredModel = localStorage.getItem('physics_api_model') || 'gemini-2.5-flash';
          responseText = await callGemini(preferredModel);
        }

        // --- COMMAND PARSING ---
        // Aseguramos que atrape los argumentos sean números o strings con comillas simples/dobles
        const cmdRegex = /\[CMD:([a-zA-Z0-9_]+\([^)]*\))\]/g;
        const commandsToRun = [];
        responseText = responseText.replace(cmdRegex, (match, cmd) => {
          commandsToRun.push(cmd);
          return '';
        });

        // Remove thinking indicator
        const msgs = document.getElementById('chatMessages');
        msgs.removeChild(msgs.lastChild);
        this.addBotMessage(responseText.trim());

        // Execute parsed commands with visual feedback
        commandsToRun.forEach(cmd => {
          try {
            const fnName = cmd.split('(')[0];
            const argStr = cmd.split('(')[1].replace(')', '');
            if (typeof appState[fnName] === 'function') {
               if (argStr) {
                 const rawArgs = argStr.split(',').map(s => {
                     let val = s.trim().replace(/^['"]|['"]$/g, '');
                     return isNaN(val) ? val : Number(val);
                 });
                 appState[fnName](...rawArgs);
               } else {
                 appState[fnName]();
               }
               // Show visual badge for the action
               const actionNames = {
                 'openNotebook': '📖 Cuaderno ' + argStr,
                 'openIframe': '🔬 Animación',
                 'openVideo': '▶️ Video',
                 'goHome': '🏠 Inicio'
               };
               const label = actionNames[fnName] || fnName;
               const badge = document.createElement('div');
               badge.className = 'chat-cmd-badge';
               badge.innerHTML = '<i class="fas fa-external-link-alt"></i> Abriendo: ' + label;
               msgs.appendChild(badge);
               msgs.scrollTop = msgs.scrollHeight;
            }
          } catch (e) { console.error('Error executing AI command:', cmd, e); }
        });

      } catch (err) {
        const msgs = document.getElementById('chatMessages');
        msgs.removeChild(msgs.lastChild);
        
        let errorMsg = err.message;
        if (errorMsg.includes('Quota exceeded')) {
          errorMsg = '⚠️ Se ha agotado la cuota gratuita temporalmente. Por favor, intenta de nuevo en un momento o usa una API Key diferente.';
        }
        this.addBotMessage('❌ Error: ' + errorMsg);
      }
    },

    quickAction(fnName, arg) {
      if (typeof appState[fnName] === 'function') {
        if (arg !== undefined) {
          appState[fnName](arg);
          this.addBotMessage('✅ ¡Listo! He abierto el recurso para ti.');
        } else {
          appState[fnName]();
          this.addBotMessage('✅ ¡Navegación completada!');
        }
      }
    },

    // ── MEDIA (CAMERA / MIC) ──
    attachedImageBase64: null,
    isListening: false,
    recognition: null,

    openCameraModal() { document.getElementById('cameraModal').style.display = 'flex'; },
    closeCameraModal() {
      document.getElementById('cameraModal').style.display = 'none';
      const stream = document.getElementById('cameraStream').srcObject;
      if (stream) stream.getTracks().forEach(track => track.stop());
      document.getElementById('cameraStream').style.display = 'none';
      document.getElementById('cameraPreview').style.display = 'none';
      document.getElementById('btnStartCam').style.display = 'inline-block';
      document.getElementById('btnCapture').style.display = 'none';
      document.getElementById('btnUseImage').style.display = 'none';
    },
    async startCamera() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        const video = document.getElementById('cameraStream');
        video.srcObject = stream;
        video.style.display = 'block';
        document.getElementById('cameraPreview').style.display = 'none';
        document.getElementById('btnStartCam').style.display = 'none';
        document.getElementById('btnCapture').style.display = 'inline-block';
        document.getElementById('btnUseImage').style.display = 'none';
      } catch (err) { alert('No se pudo acceder a la cámara. Revisa los permisos.'); }
    },
    capturePhoto() {
      const video = document.getElementById('cameraStream');
      const canvas = document.getElementById('cameraCanvas');
      canvas.width = video.videoWidth; canvas.height = video.videoHeight;
      canvas.getContext('2d').drawImage(video, 0, 0);
      const dataUrl = canvas.toDataURL('image/jpeg');
      const stream = video.srcObject;
      if (stream) stream.getTracks().forEach(track => track.stop());
      video.style.display = 'none';
      const preview = document.getElementById('cameraPreview');
      preview.src = dataUrl; preview.style.display = 'block';
      document.getElementById('btnCapture').style.display = 'none';
      document.getElementById('btnUseImage').style.display = 'inline-block';
    },
    handleImageUpload(e) {
      const file = e.target.files[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = (event) => {
        const preview = document.getElementById('cameraPreview');
        preview.src = event.target.result;
        preview.style.display = 'block';
        document.getElementById('cameraStream').style.display = 'none';
        document.getElementById('btnStartCam').style.display = 'none';
        document.getElementById('btnCapture').style.display = 'none';
        document.getElementById('btnUseImage').style.display = 'inline-block';
        if (document.getElementById('cameraStream').srcObject) document.getElementById('cameraStream').srcObject.getTracks().forEach(t => t.stop());
      };
      reader.readAsDataURL(file);
    },
    useImage() {
      this.attachedImageBase64 = document.getElementById('cameraPreview').src;
      document.getElementById('attachedImagePreview').src = this.attachedImageBase64;
      document.getElementById('imagePreviewArea').style.display = 'block';
      this.closeCameraModal();
    },
    removeAttachedImage() {
      this.attachedImageBase64 = null;
      document.getElementById('imagePreviewArea').style.display = 'none';
      document.getElementById('attachedImagePreview').src = '';
    },
    toggleMic() {
      if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
        alert('El reconocimiento de voz no es soportado en este navegador.');
        return;
      }
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      const micBtn = document.getElementById('micBtn');
      const chatInput = document.getElementById('chatInput');

      if (this.isListening) {
        this.recognition.stop();
        return;
      }

      // Always create a fresh recognition instance for reliability
      if (this.recognition) {
        try { this.recognition.abort(); } catch(e) {}
        this.recognition = null;
      }

      this.recognition = new SpeechRecognition();
      this.recognition.lang = 'es-ES';
      this.recognition.continuous = true;
      this.recognition.interimResults = true;
      this.recognition.maxAlternatives = 1;

      // Track the text that existed before we started recording
      const baseText = chatInput.value;
      let finalTranscript = '';

      this.recognition.onstart = () => {
        this.isListening = true;
        micBtn.classList.add('recording');
        micBtn.title = 'Haz clic para detener';
      };

      this.recognition.onresult = (e) => {
        let interimTranscript = '';
        // Process all results from the start
        for (let i = 0; i < e.results.length; i++) {
          const result = e.results[i];
          if (result.isFinal) {
            finalTranscript += result[0].transcript;
          } else {
            interimTranscript += result[0].transcript;
          }
        }
        // Compose: base text + space + final + interim
        const separator = baseText.length > 0 ? ' ' : '';
        const combined = finalTranscript + interimTranscript;
        chatInput.value = baseText + (combined.length > 0 ? separator : '') + combined;
      };

      this.recognition.onerror = (err) => {
        if (err.error === 'no-speech') {
          // Silently ignore no-speech and let it keep listening
          return;
        }
        if (err.error === 'aborted') return;
        console.error('Error de micrófono:', err.error);
        this.isListening = false;
        micBtn.classList.remove('recording');
        micBtn.title = 'Micrófono';
      };

      this.recognition.onend = () => {
        this.isListening = false;
        micBtn.classList.remove('recording');
        micBtn.title = 'Micrófono';
        this.recognition = null;
      };

      try {
        this.recognition.start();
      } catch(e) {
        console.error('No se pudo iniciar el micrófono:', e);
        this.isListening = false;
        micBtn.classList.remove('recording');
      }
    }
  };

  // ── DRAGGABLE CHAT WINDOW ──
  (function initDrag() {
    const win = document.getElementById('chatWindow');
    const handle = document.getElementById('chatDragHandle');
    if (!win || !handle) return;

    let isDragging = false, startX, startY, origX, origY;

    handle.addEventListener('mousedown', e => {
      if (e.target.closest('.chat-btn')) return; // don't drag on buttons
      isDragging = true;
      const rect = win.getBoundingClientRect();
      startX = e.clientX; startY = e.clientY;
      origX = rect.left; origY = rect.top;
      win.style.transition = 'none';
      e.preventDefault();
    });

    document.addEventListener('mousemove', e => {
      if (!isDragging) return;
      const dx = e.clientX - startX;
      const dy = e.clientY - startY;
      win.style.left = (origX + dx) + 'px';
      win.style.top = (origY + dy) + 'px';
      win.style.right = 'auto';
      win.style.bottom = 'auto';
    });

    document.addEventListener('mouseup', () => {
      isDragging = false;
      win.style.transition = '';
    });
  })();

  // Simulation code removed.

})();


