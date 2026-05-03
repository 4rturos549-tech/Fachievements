# Prompt para generar manifests de guía

Copia este prompt entero y pégaselo a **Claude** (mejor) o ChatGPT. Sustituye `{{NOMBRE_DEL_JUEGO}}` y `{{IGDB_ID}}`. El modelo te devolverá un JSON listo para validar y subir.

> Tip: para juegos con muchos coleccionables, divide la generación por partida (Partida 1, luego 2, luego 3) y mergea al final. Un solo prompt para 200 pasos suele perder calidad.

---

## El prompt

```
Eres un experto en guías de trofeos/logros con conocimiento profundo de "{{NOMBRE_DEL_JUEGO}}" (IGDB id: {{IGDB_ID}}). Vas a generar un manifest JSON para una web de guías paso a paso.

OBJETIVO
Producir UN ÚNICO bloque JSON válido que cubra la ruta óptima al 100% (platino), con todos los logros, todas las partidas necesarias, todas las zonas en orden de juego, y los pasos perdibles claramente marcados.

ESTRUCTURA EXACTA (cualquier desviación rompe la web)

{
  "igdb_id": "{{IGDB_ID}}",
  "title": "{{NOMBRE_DEL_JUEGO}}",
  "info": {
    "difficulty": "X/10",
    "estimated_time": "Xh–Yh",
    "min_playthroughs": <int>,
    "total_trophies": <int>,
    "breakdown": "X Bronce · Y Plata · Z Oro · 1 Platino",
    "missable_warning": "1 párrafo. Cuántos perdibles, cuándo se pierden, qué hacer.",
    "tip": "1 párrafo con el consejo más útil para el platino."
  },
  "achievements": [
    {
      "id": "ach_<tipo>_<n>",
      "type": "platinum|gold|silver|bronze",
      "title": "Nombre OFICIAL del trofeo",
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
2. "unlocks" vincula un paso con los logros que desbloquea (array de IDs de achievements). Si el paso es genérico (ej. un coleccionable que solo cuenta hacia un trofeo grupal), pon ese ID. Si es un tip, omite "unlocks".
3. "type" del step:
   - "missable": acción perdible. Si la saltas necesitas otra partida.
   - "collectible": coleccionable opcional (moneda, figura, doc).
   - "main": paso obligatorio de historia digno de marcar.
   - "tip": consejo NO checkable (soluciones de puzzle, estrategias de jefe, datos previos).
4. Una acción por paso. "Coge X y luego Y" → dos pasos.
5. Descripciones cortas: 1–2 frases. Estrategias largas van en pasos "tip" separados, no metidas dentro de un "missable".
6. NADA de emojis decorativos en las descripciones (sin ⚠️, sin 🏆). La UI ya marca visualmente los missables. Los emojis solo añaden ruido.
7. Orden real de juego, no alfabético. Las zonas y pasos siguen el flujo en el que un jugador los hace.
8. Datos exactos: ubicaciones específicas ("dentro del cenicero de la mesa central"), códigos literales ("Sierra–Cuervo–Bebé"), inputs reales ("L2+R2"). Nada de "por ahí" o "el ataque fuerte".
9. No spoilers de trama. Cíñete a mecánica.
10. NO inventes trofeos. Si no estás 100% seguro de un trofeo, pregunta antes en lugar de inventar.

PRESUPUESTO DE TAMAÑO

- achievements: la cantidad real del juego (ni más ni menos).
- playthroughs: la mínima cantidad necesaria para el platino.
- pasos por partida: lo que haga falta, pero sin redundancia. Si dos coleccionables están al lado, son dos pasos, no uno con texto largo.
- Apunta a entre 80 y 250 pasos totales para un juego de duración media. Más allá de 400 hay que partir.

ANTES DE RESPONDER

Verifica mentalmente:
- ¿Todos los IDs son únicos?
- ¿Suma de logros = "total_trophies"?
- ¿Cada achievement con "missable: true" tiene al menos un step "missable" que lo desbloquea con "unlocks"?
- ¿Las zonas están en orden de juego?
- ¿El JSON es parseable (comas, comillas, sin trailing commas)?

Devuelve SOLO el JSON dentro de un bloque ```json. Sin texto antes ni después.
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

1. **Paso 1** — Pide al modelo SOLO `info` + `achievements` completos.
2. **Paso 2** — Pide la Partida 1 entera (con sus zones+steps), pegándole los achievement IDs ya generados para que pueda referenciarlos en `unlocks`.
3. **Paso 3** — Pide la Partida 2, luego la 3, etc.
4. **Mergear** los trozos manualmente o con `jq`.

Esto evita que el modelo abrevie por límite de tokens y mejora muchísimo la calidad por partida.
