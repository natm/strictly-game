# Analytics (optional, cookieless)

Analytics are off by default. To turn on a cookieless tracker (Plausible, Umami, Simple Analytics, GoatCounter…), set `ANALYTICS` near the top of the script in `index.html`:

```js
const ANALYTICS={src:'https://plausible.io/js/script.js',attrs:{'data-domain':'natm.github.io/strictly-game'}};
```

`kdTrack(name, props)` sends custom events to whichever tracker is loaded:

| Event | Props |
|---|---|
| `week_started` | `week`, `players` (count) |
| `couple_revealed` | `week` |
| `week_finished` | `week` |

Events never include names or scores, and the game sets no cookies. A test checks `document.cookie` stays empty.
