<script>
(function() {
    /* =========================================================
       ⚙️ CONFIGURACIÓN
       ========================================================= */
    
    // TRUCO: Para probarlo ahora mismo, cogemos la hora actual
    const now = new Date();
    
    const CONFIG = {
        // Pon aquí la hora real de tu clase. 
        // He puesto la hora actual para que veas el efecto al abrir la página.
        startHour: 18,      
        startMinute: 30,   
        
        title: "⚡ SESIÓN EN VIVO",
        
        theme: {
            bg: "#0b0c1a",
            surface: "#13152b",
            accent: "#9b87f5", // Coincide con tu juego
            text: "#e9e8ff",
            warn: "#ffd166",
            ok: "#30d158"
        }
    };

    /* =========================================================
       📅 LA AGENDA (Coincide con tu actividad)
       ========================================================= */
    const SCHEDULE = [
        { name: "👋 Bienvenida",          duration: 2 }, // Minutos
        { name: "🧩 1. Ordénalo (JUEGO)", duration: 15 }, // Aquí juegan con la app
        { name: "🗣️ 2. Debate",           duration: 10 },
        { name: "🏁 Cierre",              duration: 3 }
    ];

    /* =========================================================
       🚀 LÓGICA DEL WIDGET (No tocar)
       ========================================================= */
    let currentPhaseIndex = -1;
    let widgetContainer = null;

    function getSpainTime() {
        const now = new Date();
        // Ajuste simple para asegurar zona horaria local del navegador en pruebas
        return now; 
    }

    function injectStyles() {
        const css = `
            #gi-timer-widget {
                position: fixed; bottom: 20px; right: 20px;
                width: 260px; font-family: system-ui, sans-serif;
                background: ${CONFIG.theme.bg}; color: ${CONFIG.theme.text};
                border: 1px solid ${CONFIG.theme.accent};
                border-radius: 16px; overflow: hidden;
                box-shadow: 0 0 30px rgba(0,0,0,0.5);
                z-index: 99999; display: block;
                animation: slide-up 0.5s ease;
            }
            @keyframes slide-up { from {transform:translateY(100px); opacity:0} to {transform:translateY(0); opacity:1}}
            #gi-timer-header {
                background: ${CONFIG.theme.surface};
                padding: 10px 15px; font-size: 0.75rem;
                display: flex; justify-content: space-between; align-items: center;
                border-bottom: 1px solid rgba(255,255,255,0.1);
                color: ${CONFIG.theme.accent}; font-weight: 700; letter-spacing: 1px;
                text-transform: uppercase;
            }
            #gi-timer-body { padding: 15px; text-align: center; }
            #gi-task-name {
                font-size: 1.1rem; font-weight: 700; margin: 0 0 5px 0;
                white-space: nowrap; overflow: hidden; text-overflow: ellipsis;
            }
            #gi-countdown {
                font-size: 2rem; font-family: "Courier New", monospace; font-weight: 800;
                color: #fff; letter-spacing: 1px; line-height: 1;
            }
            #gi-progress-bar { height: 4px; background: rgba(255,255,255,0.1); width: 100%; }
            #gi-progress-fill {
                height: 100%; background: ${CONFIG.theme.accent}; width: 0%; 
                transition: width 1s linear;
                box-shadow: 0 0 10px ${CONFIG.theme.accent};
            }
            .wiggle-flash { animation: flash-screen 0.5s ease-in-out 3; }
            @keyframes flash-screen {
                50% { background-color: ${CONFIG.theme.surface}; border-color: ${CONFIG.theme.warn}; }
            }
        `;
        const style = document.createElement('style');
        style.appendChild(document.createTextNode(css));
        document.head.appendChild(style);
    }

    function createWidgetDOM() {
        const div = document.createElement('div');
        div.id = 'gi-timer-widget';
        div.innerHTML = `
            <div id="gi-timer-header">
                <span>${CONFIG.title}</span>
                <span id="gi-real-clock">00:00</span>
            </div>
            <div id="gi-timer-body">
                <div id="gi-task-name">Cargando...</div>
                <div id="gi-countdown">--:--</div>
            </div>
            <div id="gi-progress-bar"><div id="gi-progress-fill"></div></div>
        `;
        document.body.appendChild(div);
        widgetContainer = div;
    }

    function triggerAlert() {
        if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
        if(widgetContainer) {
            widgetContainer.classList.add('wiggle-flash');
            setTimeout(() => widgetContainer.classList.remove('wiggle-flash'), 1600);
        }
    }

    function updateTimer() {
        const nowLocal = new Date();
        
        // Reloj pequeño
        const clockStr = nowLocal.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        if(document.getElementById('gi-real-clock')) document.getElementById('gi-real-clock').innerText = clockStr;

        const startTime = new Date(); 
        startTime.setHours(CONFIG.startHour, CONFIG.startMinute, 0, 0);

        let diffSeconds = Math.floor((nowLocal - startTime) / 1000);

        // A. ESPERANDO
        if (diffSeconds < 0) {
            document.getElementById('gi-task-name').innerText = "⏳ Esperando inicio...";
            document.getElementById('gi-countdown').innerText = "-" + Math.abs(diffSeconds) + "s";
            return;
        }

        // B. EN MARCHA
        let accumulatedSeconds = 0;
        let foundPhase = false;

        for (let i = 0; i < SCHEDULE.length; i++) {
            const phaseDurationSec = SCHEDULE[i].duration * 60;
            
            if (diffSeconds >= accumulatedSeconds && diffSeconds < (accumulatedSeconds + phaseDurationSec)) {
                
                if (currentPhaseIndex !== i) {
                    currentPhaseIndex = i;
                    triggerAlert();
                }

                const secondsRemaining = (accumulatedSeconds + phaseDurationSec) - diffSeconds;
                const m = Math.floor(secondsRemaining / 60).toString().padStart(2, '0');
                const s = (secondsRemaining % 60).toString().padStart(2, '0');
                
                document.getElementById('gi-task-name').innerText = SCHEDULE[i].name;
                document.getElementById('gi-countdown').innerText = `${m}:${s}`;
                
                // Barra de progreso inversa (se vacía) o directa (se llena). Aquí la llenamos.
                const percent = ((phaseDurationSec - secondsRemaining) / phaseDurationSec) * 100;
                document.getElementById('gi-progress-fill').style.width = `${percent}%`;

                foundPhase = true;
                break;
            }
            accumulatedSeconds += phaseDurationSec;
        }

        // C. TERMINADO
        if (!foundPhase && diffSeconds > 0) {
            document.getElementById('gi-task-name').innerText = "🎉 Clase Terminada";
            document.getElementById('gi-countdown').innerText = "FIN";
            document.getElementById('gi-progress-fill').style.width = "100%";
        }
    }

    // ARRANQUE
    injectStyles();
    createWidgetDOM();
    setInterval(updateTimer, 1000); 
    updateTimer(); 

})();
</script>





