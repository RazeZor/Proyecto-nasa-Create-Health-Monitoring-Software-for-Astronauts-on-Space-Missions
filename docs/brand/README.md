# VIGÍA · recursos de marca

Logo "Centinela". El texto VIGÍA está convertido a trazados (Space Grotesk Bold, licencia SIL OFL), así que los SVG no necesitan ninguna fuente instalada.

## Qué archivo usar

| Uso | Archivo |
|---|---|
| README o web con fondo oscuro | `svg/vigia-logo-horizontal-oscuro.svg` |
| README o web con fondo claro | `svg/vigia-logo-horizontal-claro.svg` |
| Portada, splash, formato cuadrado | `svg/vigia-logo-vertical-*.svg` |
| Dentro de la interfaz (hereda el color del texto) | `svg/vigia-*-mono.svg` (usa `currentColor`) |
| Estados de la app | `svg/vigia-simbolo-atencion-*.svg`, `svg/vigia-simbolo-alerta-*.svg` |
| 48 px o menos | `svg/vigia-simbolo-micro-*.svg` |
| Favicon | `svg/favicon.svg`, `png/favicon-32.png` |
| Ícono de app (iOS, Android, PWA) | `png/icono-app-*.png` (cuadrado; el sistema redondea las esquinas) |

"oscuro" y "claro" se refieren al fondo sobre el que va el logo.

## README de GitHub (cambia solo con el tema)

```html
<picture>
  <source media="(prefers-color-scheme: dark)" srcset="docs/brand/svg/vigia-logo-horizontal-oscuro.svg">
  <img src="docs/brand/svg/vigia-logo-horizontal-claro.svg" alt="VIGÍA" width="320">
</picture>
```

## Web / PWA

```html
<link rel="icon" href="/favicon.svg" type="image/svg+xml">
<link rel="icon" href="/favicon-32.png" sizes="32x32">
<link rel="apple-touch-icon" href="/icono-app-180.png">
```

## Color

| Nombre | Fondo oscuro | Fondo claro |
|---|---|---|
| Noche (fondo) | `#0B1020` | |
| Casco (símbolo y texto) | `#F2F5FA` | |
| Normal | `#3DDC97` | `#12A86B` |
| Atención | `#F5A623` | `#D98A00` |
| Alerta | `#E5484D` | `#D93A40` |
