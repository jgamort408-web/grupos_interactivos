(function() {
    /* =========================================================
       ⚙️ CONFIGURACIÓN (EDITAR AQUÍ)
       ========================================================= */
    const CONFIG = {
        // ¿A qué hora empieza la sesión hoy? (Formato 24h)
        startHour: 17,    
        startMinute: 20,   
        
        // Título del widget
        title: "⚡ SESIÓN EN VIVO",
        
        // Tema visual (Colores oscuros Fantasy)
        theme: {
            bg: "#0b0c1a",
            surface: "#13152b",
            accent: "#9b87f5", // Morado neón
            text: "#e9e8ff",
            warn: "#ffd166",   // Amarillo para cambios
            ok: "#30d158"      // Verde para inicio/fin
        }
    };

    /* =========================================================
       📅 LA AGENDA (SECUENCIA DE TAREAS)
       ========================================================= */
    // Duración en MINUTOS
    const SCHEDULE = [
        { name: "👋 Inicio: Preparación", duration: 5 },
        { name: "🧩 1. Ordénalo",         duration: 10 },
        { name: "🔥 2. Desafíos",         duration: 10 },
        { name: "🧠 3. Memory",           duration: 10 },
        { name: "🎭 4. Rol",              duration: 10 },
        { name: "❓ 5. Quiz",             duration: 10 },
        { name: "🏁 Cierre: Reflexión",   duration: 5 }
    ];

    /* =========================================================
       🚀 LÓGICA INTERNA (NO TOCAR A PARTIR DE AQUÍ)
       ========================================================= */
    
    let currentPhaseIndex = -1;
    let widgetContainer = null;

    // 1. INYECTAR ESTILOS CSS
    function injectStyles() {
        const css = `
            #gi-timer-widget {
                position: fixed; bottom: 20px; right: 20px;
                width: 280px; font-family: system-ui, sans-serif;
                background: ${CONFIG.theme.bg}; color: ${CONFIG.theme.text};
                border: 2px solid ${CONFIG.theme.surface};
                border-radius: 16px; overflow: hidden;
                box-shadow: 0 0 20px rgba(155, 135, 245, 0.3);
                z-index: 99999; display: none; /* Oculto por defecto */
                transition: transform 0.3s ease;
            }
            #gi-timer-header {
                background: ${CONFIG.theme.surface};
                padding: 10px 15px; font-size: 0.85rem;
                display: flex; justify-content: space-between; align-items: center;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                color: ${CONFIG.theme.accent}; font-weight: bold;
            }
            #gi-timer-body {
                padding: 20px; text-align: center;
            }
            #gi-task-name {
                font-size: 1.4rem; font-weight: 800; margin: 0 0 10px 0;
                line-height: 1.2; text-shadow: 0 0 10px rgba(255,255,255,0.1);
            }
            #gi-countdown {
                font-size: 2.5rem; font-family: monospace; font-weight: bold;
                color: #fff; letter-spacing: 2px;
            }
            #gi-progress-bar {
                height: 4px; background: rgba(255,255,255,0.1); width: 100%;
            }
            #gi-progress-fill {
                height: 100%; background: ${CONFIG.theme.accent}; width: 0%; transition: width 1s linear;
            }
            
            /* Animación de alerta */
            @keyframes flash-screen {
                0% { background-color: ${CONFIG.theme.bg}; transform: scale(1); }
                50% { background-color: ${CONFIG.theme.surface}; transform: scale(1.05); border-color: ${CONFIG.theme.warn}; }
                100% { background-color: ${CONFIG.theme.bg}; transform: scale(1); }
            }
            .wiggle-flash {
                animation: flash-screen 0.5s ease-in-out 3;
            }
            
            /* Relojito pequeño arriba */
            #gi-real-clock { color: rgba(255,255,255,0.6); font-weight: normal; }
        `;
        const style = document.createElement('style');
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
    }

    // 2. CREAR HTML DEL WIDGET
    function createWidgetDOM() {
        const div = document.createElement('div');
        div.id = 'gi-timer-widget';
        div.innerHTML = `
            <div id="gi-timer-header">
                <span>${CONFIG.title}</span>
                <span id="gi-real-clock">00:00</span>
            </div>
            <div id="gi-timer-body">
                <div id="gi-task-name">Esperando inicio...</div>
                <div id="gi-countdown">--:--</div>
            </div>
            <div id="gi-progress-bar"><div id="gi-progress-fill"></div></div>
        `;
        document.body.appendChild(div);
        widgetContainer = div;
        
        // Añadir evento click para habilitar audio/vibración si el navegador lo bloquea
        document.addEventListener('click', () => { /* User interaction unlocks audio/vibrate context */ }, {once:true});
    }

    // 3. FUNCIÓN DE VIBRACIÓN
    function triggerAlert() {
        // Vibración (Android/Mobile)
        if (navigator.vibrate) {
            navigator.vibrate([500, 200, 500]); // Vuuun-pausa-Vuuun
        }
        
        // Efecto visual (Desktop)
        if(widgetContainer) {
            widgetContainer.classList.add('wiggle-flash');
            setTimeout(() => {
                widgetContainer.classList.remove('wiggle-flash');
            }, 1600);
        }
    }

    // 4. CEREBRO DEL TIMER (Sincronización)
    function updateTimer() {
        const now = new Date();
        
        // Actualizar reloj pequeñito
        const clockStr = now.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        const clockEl = document.getElementById('gi-real-clock');
        if(clockEl) clockEl.innerText = clockStr;

        // Calcular hora de inicio hoy
        const startTime = new Date();
        startTime.setHours(CONFIG.startHour, CONFIG.startMinute, 0, 0);

        // Diferencia en segundos desde el inicio
        let diffSeconds = Math.floor((now - startTime) / 1000);

        // A. SI AÚN NO HA EMPEZADO
        if (diffSeconds < 0) {
            // Ocultar widget si falta más de 1 hora, mostrar si falta poco (opcional, aquí lo ocultamos hasta la hora)
            // Si quieres que aparezca ANTES con cuenta atrás global, cambia este if.
            // Por ahora: Oculto hasta la hora.
            if(widgetContainer) widgetContainer.style.display = 'none';
            return;
        }

        // B. SI YA EMPEZÓ: Mostrar widget
        if(widgetContainer) widgetContainer.style.display = 'block';

        // Buscar en qué tarea estamos
        let accumulatedSeconds = 0;
        let foundPhase = false;

        for (let i = 0; i < SCHEDULE.length; i++) {
            const phaseDurationSec = SCHEDULE[i].duration * 60;
            
            // Si el tiempo transcurrido cae dentro de esta fase
            if (diffSeconds >= accumulatedSeconds && diffSeconds < (accumulatedSeconds + phaseDurationSec)) {
                
                // DETECTAR CAMBIO DE FASE
                if (currentPhaseIndex !== i) {
                    currentPhaseIndex = i;
                    triggerAlert();
                }

                // Calcular tiempo restante de ESTA fase
                const secondsIntoPhase = diffSeconds - accumulatedSeconds;
                const secondsRemaining = phaseDurationSec - secondsIntoPhase;

                // Renderizar
                const m = Math.floor(secondsRemaining / 60).toString().padStart(2, '0');
                const s = (secondsRemaining % 60).toString().padStart(2, '0');
                
                document.getElementById('gi-task-name').innerText = SCHEDULE[i].name;
                document.getElementById('gi-countdown').innerText = `${m}:${s}`;
                
                // Barra de progreso
                const percent = (secondsIntoPhase / phaseDurationSec) * 100;
                document.getElementById('gi-progress-fill').style.width = `${percent}%`;

                // Color especial para descansos o cierre (opcional)
                const titleEl = document.getElementById('gi-timer-header');
                if(i === 0 || i === SCHEDULE.length - 1) titleEl.style.color = CONFIG.theme.ok;
                else titleEl.style.color = CONFIG.theme.accent;

                foundPhase = true;
                break;
            }
            accumulatedSeconds += phaseDurationSec;
        }

        // C. SI YA TERMINÓ TODO
        if (!foundPhase && diffSeconds > 0) {
            document.getElementById('gi-task-name').innerText = "🎉 Sesión Finalizada";
            document.getElementById('gi-countdown').innerText = "00:00";
            document.getElementById('gi-progress-fill').style.width = "100%";
        }
    }

    // 5. INICIALIZAR
    if (!document.getElementById('gi-timer-widget')) {
        injectStyles();
        createWidgetDOM();
        setInterval(updateTimer, 1000); // Revisar cada segundo
        updateTimer(); // Ejecutar primera vez inmediatamente
    }


})();
