# Prompt para generar manifests de guía

Copia este prompt entero y pégaselo a **Claude** (mejor) o ChatGPT. Ambos modelos deben tener **búsqueda web activada** — en Claude usa el modo con web search, en ChatGPT activa "Search". Si no, el modelo **inventa** títulos y descripciones desactualizadas.

Sustituye `{{NOMBRE_DEL_JUEGO}}`, `{{IGDB_ID}}` y `{{PLATAFORMA_REF}}` por los reales.

> Tip: para juegos con muchos coleccionables, divide la generación por partida (Partida 1, luego 2, luego 3) y mergea al final. Un solo prompt para 200 pasos suele perder calidad.

---

## El prompt

```
Eres un experto en guías de trofeos/logros. Vas a generar un manifest JSON para una web de guías paso a paso del juego "{{NOMBRE_DEL_JUEGO}}" (IGDB id: {{IGDB_ID}}).

CRÍTICO — VERIFICACIÓN OBLIGATORIA ANTES DE GENERAR

Antes de escribir UNA SOLA LÍNEA del JSON, BUSCA EN INTERNET:

1. La lista REAL y COMPLETA de logros/trofeos. Fuentes fiables (en este orden):
   - PSNProfiles.com (referencia para PlayStation, incluye platino)
   - Steam Community → Stats → Achievements (lista exacta de Steam)
   - TrueAchievements.com (Xbox)
   - Exophase.com (cross-platform)
2. Confirma EL NÚMERO TOTAL de logros y el desglose (X bronce, Y plata, Z oro, 1 platino si es PS).
3. Para cada logro: nombre OFICIAL EXACTO (cuidado con tildes/mayúsculas) y descripción oficial.
4. Si el juego tiene varias versiones (original vs remaster vs DLC), usa la lista de la versión EXACTA según el IGDB id que te di. Una "Remastered" puede tener trofeos completamente distintos al juego original.
5. Si no encuentras la lista o tienes dudas, RESPONDE PIDIENDO ACLARACIÓN en lugar de inventar.

Plataforma de referencia para los nombres y total: {{PLATAFORMA_REF}}  (ej: "PS5", "Steam"). Si me das los números de Steam pero la web es para PlayStation, indica claramente en info.breakdown la diferencia.

ESTRUCTURA EXACTA (cualquier desviación rompe la web)

{
  "igdb_id": "{{IGDB_ID}}",
  "title": "{{NOMBRE_DEL_JUEGO}}",
  "info": {
    "difficulty": "X/10",
    "estimated_time": "Xh–Yh",
    "min_playthroughs": <int>,
    "total_trophies": <int>,
    "breakdown": "X Bronce · Y Plata · Z Oro · 1 Platino  (Steam: N achievements, sin platino)",
    "missable_warning": "1 párrafo. Cuántos perdibles, cuándo se pierden, qué hacer.",
    "tip": "1 párrafo con el consejo más útil para el platino."
  },
  "achievements": [
    {
      "id": "ach_<tipo>_<n>",
      "type": "platinum|gold|silver|bronze",
      "title": "Nombre OFICIAL EXACTO del trofeo",
      "description": "1–3 frases. Qué pide y consejo concreto.",
      "missable": true|false
    }
  ],
  "playthroughs": [
    {
      "title": "Partida N — <objetivo>",
      "summary": "1 frase de qué se hace en esta partida.",
      "zones": [
        {
          "name": "<Zona en orden de juego>",
          "steps": [
            {
              "id": "p<N>_<zona>_<n>",
              "type": "missable|collectible|main|tip",
              "description": "1–2 frases. Acción concreta y verificable.",
              "unlocks": ["ach_xxx"]
            }
          ]
        }
      ]
    }
  ]
}

REGLAS DURAS

1. IDs únicos en TODO el manifest. Patrón: pasos = "p<partida>_<zona>_<num>" (ej. "p1_cv7"), achievements = "ach_<tipo>_<num>" (ej. "ach_b14"). Nunca repitas IDs.
2. "unlocks" vincula un paso con los logros que desbloquea (array de IDs de achievements). Si el paso es genérico (un coleccionable de muchos), pon SOLO el achievement grupal que desbloquea. Si es un tip, omite "unlocks".
3. "type" del step:
   - "missable": acción perdible. Si la saltas necesitas otra partida o selección de capítulo.
   - "collectible": coleccionable opcional (moneda, figura, doc, foto).
   - "main": paso obligatorio de historia digno de marcar (ej. "termina el Capítulo X").
   - "tip": consejo NO checkable (soluciones de puzzle, estrategias de jefe, datos previos).
4. Una acción por paso. "Coge X y luego Y" → dos pasos.
5. Descripciones cortas: 1–2 frases. Estrategias largas van en pasos "tip" separados, no metidas dentro de un "missable".
6. NADA de emojis decorativos en las descripciones (sin ⚠️, sin 🏆). La UI ya marca visualmente los missables. Los emojis solo añaden ruido.
7. Orden real de juego, no alfabético. Las zonas y pasos siguen el flujo en el que un jugador los hace.
8. Datos exactos: ubicaciones específicas, códigos literales, inputs reales ("L2+R2", no "el ataque fuerte"). Si no estás seguro, escribe "(verifica ubicación exacta en guía)" en lugar de inventar.
9. No spoilers de trama. Cíñete a mecánica.
10. Suma de logros = total_trophies. Si no cuadra, has olvidado o duplicado algo.

PRESUPUESTO DE TAMAÑO

- achievements: la cantidad REAL del juego (ni más ni menos), verificada en fuente externa.
- playthroughs: la mínima cantidad necesaria para el platino.
- Apunta a entre 80 y 250 pasos totales para un juego de duración media. Más allá de 400 hay que partir.

AUTOVERIFICACIÓN ANTES DE RESPONDER

- ¿Verificaste la lista en al menos UNA fuente externa? (Si no, vuelve atrás)
- ¿Todos los IDs son únicos?
- ¿Suma de logros = "total_trophies"?
- ¿Los nombres COINCIDEN exactos con la fuente (acentos, mayúsculas, puntuación)?
- ¿Cada achievement con "missable: true" tiene al menos un step "missable" o "collectible" que lo desbloquea con "unlocks"?
- ¿Las zonas están en orden de juego?
- ¿El JSON es parseable (comas correctas, comillas dobles, sin trailing commas)?

Devuelve SOLO el JSON dentro de un bloque ```json. Sin texto antes ni después. Si no pudiste verificar la lista en internet, NO devuelvas el JSON: pide ayuda.
```

---

## Después de generar

1. Copia el JSON.
2. Pégalo en `src/data/<id>.json` o directamente en el formulario de `/admin`.
3. Pulsa "Validar JSON" en el panel — y/o ejecuta el validador local:
   ```bash
   pnpm validate src/data/mi-juego.json
   ```
4. Si pasa, sube a Supabase desde `/admin`.

## Estrategia para juegos enormes

Si el juego tiene 80+ trofeos y 300+ pasos:

1. **Paso 1** — Pide al modelo SOLO `info` + `achievements` completos (con verificación web).
2. **Paso 2** — Pide la Partida 1 entera (con sus zones+steps), pegándole los achievement IDs ya generados para que pueda referenciarlos en `unlocks`.
3. **Paso 3** — Pide la Partida 2, luego la 3, etc.
4. **Mergear** los trozos manualmente o con `jq`.

Esto evita que el modelo abrevie por límite de tokens y mejora muchísimo la calidad por partida.
