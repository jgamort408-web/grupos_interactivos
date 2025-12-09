(function() {
    /* =========================================================
       ⚙️ CONFIGURACIÓN (EDITAR AQUÍ)
       ========================================================= */
    const CONFIG = {
        // HORA DE INICIO (Hora peninsular española)
        startHour: 18,    
        startMinute: 00,   
        
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
       🚀 LÓGICA INTERNA (ZONA HORARIA ESPAÑA)
       ========================================================= */
    
    let currentPhaseIndex = -1;
    let widgetContainer = null;

    // Función auxiliar: Obtener hora actual en Madrid
    function getSpainTime() {
        // Crea una fecha con la hora actual del navegador
        const now = new Date();
        // La convierte a string en zona horaria de Madrid
        const spainString = now.toLocaleString("en-US", {timeZone: "Europe/Madrid"});
        // Devuelve el objeto Date correcto
        return new Date(spainString);
    }

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
                z-index: 99999; display: block; /* Visible siempre para debug */
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
                <div id="gi-task-name">Cargando...</div>
                <div id="gi-countdown">--:--</div>
            </div>
            <div id="gi-progress-bar"><div id="gi-progress-fill"></div></div>
        `;
        document.body.appendChild(div);
        widgetContainer = div;
        
        // Habilitar audio/vibración tras primera interacción
        document.addEventListener('click', () => { /* User interaction unlocks audio/vibrate context */ }, {once:true});
    }

    // 3. FUNCIÓN DE VIBRACIÓN
    function triggerAlert() {
        if (navigator.vibrate) navigator.vibrate([500, 200, 500]);
        if(widgetContainer) {
            widgetContainer.classList.add('wiggle-flash');
            setTimeout(() => { widgetContainer.classList.remove('wiggle-flash'); }, 1600);
        }
    }

    // 4. CEREBRO DEL TIMER (Sincronizado con ESPAÑA)
    function updateTimer() {
        // USAMOS HORA DE MADRID
        const nowSpain = getSpainTime();
        
        // Actualizar reloj pequeñito (formato HH:MM)
        const clockStr = nowSpain.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
        if(document.getElementById('gi-real-clock')) document.getElementById('gi-real-clock').innerText = clockStr;

        // Calcular hora de inicio hoy (en hora española)
        const startTime = getSpainTime(); 
        startTime.setHours(CONFIG.startHour, CONFIG.startMinute, 0, 0);

        // Diferencia en segundos
        let diffSeconds = Math.floor((nowSpain - startTime) / 1000);

        // A. CUENTA REGRESIVA (Aún no ha empezado)
        if (diffSeconds < 0) {
            const waitSeconds = Math.abs(diffSeconds);
            let displayTime = "";
            
            if (waitSeconds > 3600) {
                 const h = Math.floor(waitSeconds / 3600);
                 const m = Math.floor((waitSeconds % 3600) / 60).toString().padStart(2, '0');
                 displayTime = `-${h}h ${m}m`;
            } else {
                 const m = Math.floor(waitSeconds / 60).toString().padStart(2, '0');
                 const s = (waitSeconds % 60).toString().padStart(2, '0');
                 displayTime = `-${m}:${s}`;
            }

            document.getElementById('gi-task-name').innerText = "⏳ Esperando inicio...";
            document.getElementById('gi-countdown').innerText = displayTime;
            document.getElementById('gi-progress-fill').style.width = "0%";
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

                const secondsIntoPhase = diffSeconds - accumulatedSeconds;
                const secondsRemaining = phaseDurationSec - secondsIntoPhase;

                const m = Math.floor(secondsRemaining / 60).toString().padStart(2, '0');
                const s = (secondsRemaining % 60).toString().padStart(2, '0');
                
                document.getElementById('gi-task-name').innerText = SCHEDULE[i].name;
                document.getElementById('gi-countdown').innerText = `${m}:${s}`;
                
                const percent = (secondsIntoPhase / phaseDurationSec) * 100;
                document.getElementById('gi-progress-fill').style.width = `${percent}%`;

                const titleEl = document.getElementById('gi-timer-header');
                if(i === 0 || i === SCHEDULE.length - 1) titleEl.style.color = CONFIG.theme.ok;
                else titleEl.style.color = CONFIG.theme.accent;

                foundPhase = true;
                break;
            }
            accumulatedSeconds += phaseDurationSec;
        }

        // C. FINALIZADO
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
        setInterval(updateTimer, 1000); 
        updateTimer(); 
    }

})();


