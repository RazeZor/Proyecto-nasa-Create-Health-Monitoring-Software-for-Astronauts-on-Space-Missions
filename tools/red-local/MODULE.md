# Módulo `tools/red-local`

<!-- CONTEXT:MANUAL:START -->
## Propósito

Red cerrada para las pruebas en local con el reloj: enciende el hotspot «umbra» de Windows al que se conecta el Galaxy Watch4 y deja el PC en una IP fija para smart-monitor y la API.

## Puntos clave

- `hotspot.ps1` usa el Hotspot móvil de Windows 10/11 (API WinRT `NetworkOperatorTetheringManager`), sin administrador. La «red hospedada» de `netsh wlan` no existe en los drivers Wi-Fi modernos (el Intel AX211 responde «Red hospedada admitida: no»).
- Por defecto SSID `umbra`, clave `solem123`, banda 2,4 GHz (el reloj no ve 5 GHz). Windows asigna siempre `192.168.137.1` al PC: esa IP va en `SMART_IP_LAN` del `.env` y en el campo «Servidor» del reloj (`ws://192.168.137.1:8765/watch`).
- Requiere que el PC esté conectado a otra red (WiFi o cable): el hotspot comparte esa conexión. El reloj no necesita internet.
- Windows apaga el hotspot a los 5 min sin clientes («Ahorro de energía», sin API pública para desactivarlo sin administrador). `-Vigilar` lo reenciende cada 15 s; un mutex global evita dos vigilantes; registro en `%TEMP%\vigia-hotspot.log`. `-Apagar` también mata al vigilante.
- Trampa: la app del reloj conserva la URL pública (`wss://smart.smoraleslo.dev/watch`) y, como el hotspot comparte internet, sigue llegando al servidor público. Hay que cambiar el campo «Servidor» en el reloj (abajo del todo, con el monitoreo detenido) o por ADB (`docs/RELOJ.md` de smart-monitor).
- Firewall: python.exe y node.exe ya tienen reglas de entrada «Permitir» en el perfil público (que es como Windows trata al hotspot). Si el reloj no conecta, revisar eso primero.
- Procedimiento completo en `docs/SETUP.md` §8.

tags: herramientas, reloj, galaxy-watch, smart-monitor, red-local, hotspot, windows
<!-- CONTEXT:MANUAL:END -->

<!-- CONTEXT:AUTO:START -->
<!-- CONTEXT:AUTO:END -->
