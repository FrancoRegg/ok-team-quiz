import { useEffect, useRef } from 'react';

// Mantener pantalla encendida mientras el jugador está dentro de la partida.
//
// El navegador libera el wake lock solo cada vez que la pestaña deja de estar
// visible (el jugador bloquea el teléfono, atiende un mensaje, cambia de app).
// Por eso hay que volver a pedirlo al regresar, o se pierde para el resto de
// la partida. El hook recibe si la partida está activa y se encarga del resto,
// así también cubre las reconexiones automáticas, que no pasan por el login.

export const useWakeLock = (isActive) => {
    const wakeLockRef = useRef(null);

    useEffect(() => {
        if (!isActive) return;
        if (!('wakeLock' in navigator)) {
            // Safari en iOS lo soporta desde la 16.4; en equipos viejos no hay alternativa
            console.log('ℹ️ Wake Lock no soportado en este dispositivo');
            return;
        }

        let cancelled = false;

        const requestWakeLock = async () => {
            // Solo se puede pedir con la página visible; si no, esperamos al regreso
            if (document.visibilityState !== 'visible') return;
            if (wakeLockRef.current) return;

            try {
                const lock = await navigator.wakeLock.request('screen');

                if (cancelled) {
                    await lock.release();
                    return;
                }

                wakeLockRef.current = lock;

                // El navegador puede soltarlo por su cuenta: limpiamos la referencia
                // para que el próximo regreso a la pestaña lo vuelva a pedir
                lock.addEventListener('release', () => {
                    wakeLockRef.current = null;
                });

                console.log('🔆 Wake Lock activado');
            } catch (err) {
                console.log('❌ Error activando Wake Lock:', err.message);
            }
        };

        const handleVisibilityChange = () => {
            if (document.visibilityState === 'visible') {
                requestWakeLock();
            }
        };

        requestWakeLock();
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            cancelled = true;
            document.removeEventListener('visibilitychange', handleVisibilityChange);

            if (wakeLockRef.current) {
                wakeLockRef.current.release().catch(() => {});
                wakeLockRef.current = null;
                console.log('🌙 Wake Lock liberado');
            }
        };
    }, [isActive]);
}
