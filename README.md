# Generador de zonas y playoff · NODO

App web **sin base de datos** para armar las zonas y el playoff de cada categoría de un torneo
y generar las imágenes para compartir por WhatsApp.

- Vite + React + TypeScript + Tailwind. Se publica en GitHub Pages.
- Todo lo que se carga queda guardado **en el navegador** del dispositivo que se usa (localStorage).
  Si se borran los datos del navegador o se usa otro dispositivo, las categorías no aparecen.

## Flujo

1. **Torneo:** nombre del torneo y categoría (7ma Damas, Suma 12 Mixto…).
2. **Parejas:** se pegan una por línea o separadas por `;` (`Juan Pérez / Luis Gómez; Juan Galeano / Marcos Francés`).
3. **Zonas:** sorteo aleatorio o por orden de carga, y después ajuste manual (mover de zona, cambiar la posición). Zonas de 3 o de 4.
4. **Horarios de zona:** día, hora y cancha opcional de cada partido. "Completar automático" los reparte en turnos.
5. **Playoff:** "Armar automático" (1° de zona primero, después 2° y 3°, sin cruces de la misma zona) y ajuste manual de cada cruce ("1° Zona A vs 2° Zona D"). El horario es obligatorio en la primera ronda.
6. **Imágenes:** zonas (una o varias imágenes, según la cantidad) y playoff, con logo, torneo y categoría.

El **botón verde flotante** (abajo a la derecha) genera las imágenes desde cualquier paso y las
comparte. En el celular abre el menú de compartir del sistema, donde se elige WhatsApp. En una
compu que no permite compartir archivos, las descarga para adjuntarlas a mano.

## Acceso

Usuario y contraseña fijos. **En el código no está la contraseña**: solo un hash PBKDF2-SHA256
con sal y 310.000 iteraciones (`src/lib/auth.ts`). Para cambiarla:

```bash
npm install
npm run hash-password -- NODO 'NuevaContraseña'
```

y reemplazá la línea `export const CREDENCIAL = …` de `src/lib/auth.ts` por la que imprime.

> Al ser una app sin servidor, el login es una **barrera de acceso**, no una protección de datos:
> alguien con conocimientos podría modificar el código en su navegador y saltearlo. Como la app
> no guarda nada en ningún servidor, no hay datos que queden expuestos.

## Publicar

1. Subí el contenido de esta carpeta (incluida `.github`) al repo `Generar-Torneo-Padel-Nodo`, rama `main`.
2. **Settings → Pages → Source: GitHub Actions**.
3. Listo: cada push publica en `https://<usuario>.github.io/Generar-Torneo-Padel-Nodo/`. No hay variables que configurar.

Con dominio propio, cambiá en `.github/workflows/deploy.yml` la línea `BASE_PATH` por `BASE_PATH: /`.

## Local

```bash
npm install
npm run dev
```
