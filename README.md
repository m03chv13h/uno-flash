# UNO Flash

A frontend-only web app inspired by the electronic game "UNO Blitzo / UNO Flash". Designed as a shared-device local multiplayer game for up to 4 players on one mobile phone screen.

## Features

- **Mobile-first shared-device gameplay** — phone sits in the middle like a tabletop electronic toy
- **4 player stations** arranged around the center, each rotated to face its player
- **Electronic toy replica styling** — dark plastic body, glowing colored buttons, retro console feel
- **AI players** fill empty seats with configurable behavior
- **4 difficulty levels** with varying pace and penalties
- **Sound effects** using Web Audio API (no external files needed)
- **Multi-language ready** — English included, easy to add more

## Quick Start

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## How to Play

1. **Setup** — Choose difficulty, number of human players, and whether to fill empty seats with AI
2. **Gameplay** — Follow the command displayed in the center console. On your turn:
   - Press the matching colored button if it's lit
   - Pass left/right when required by the command
   - Press the UNO button during Instant UNO events (difficulty 4)
3. **Win Condition** — First player to clear all 4 buttons wins the round. First to win 4 rounds wins the game!

### Button Mapping (fixed)

| Number | Color  |
|--------|--------|
| 1      | Red    |
| 2      | Blue   |
| 3      | Green  |
| 4      | Yellow |

### Command Types

- **Color/Number** — Press the matching button if lit, otherwise pass
- **Skip** — Pass; next player is skipped
- **Reverse** — Pass; direction of play flips
- **Draw** — Pass left or right; targeted player gets a penalty
- **Wild** — Eliminate any lit button OR pass
- **Instant UNO** (Level 4 only) — Press UNO button to reduce to 1 button

## GitHub Pages Deployment

The project includes a GitHub Actions workflow for automatic deployment.

### Setup

1. Go to your repository **Settings → Pages**
2. Under **Build and deployment**, select **Source: GitHub Actions**
3. Push to `main` — the workflow will build and deploy automatically

### Manual Deployment

The workflow also supports `workflow_dispatch` for manual triggers from the Actions tab.

### Base Path

The Vite config uses `base: '/uno-flash/'` for GitHub Pages. If your repository has a different name, update the `base` property in `vite.config.ts`.

## Customization

### Replacing Sounds

The audio system uses the Web Audio API to synthesize placeholder sounds. To use custom audio files:

1. Place `.mp3` or `.wav` files in `public/audio/`
2. Edit `src/audio/audioManager.ts`
3. Replace the `playTone()` calls with `new Audio('/uno-flash/audio/yourfile.mp3').play()`

Each sound method is independently replaceable:
- `buttonPress()` — button tap feedback
- `validMove()` — successful action
- `invalidMove()` — error feedback
- `roundWin()` — round victory fanfare
- `gameWin()` — game victory fanfare
- `instantUno()` — Instant UNO trigger
- `commandFeedback()` — new command tone
- `pass()` — pass action sound

### Adding Languages

1. Create a new file in `src/i18n/` (e.g., `de.ts`) copying the structure from `en.ts`
2. Translate all string values
3. Import and register it in `src/i18n/index.ts`:

```ts
import de from './de';
const translations: Translations = { en, de };
```

4. Add to the language list:

```ts
export function getAvailableLanguages() {
  return [
    { code: 'en', label: 'English' },
    { code: 'de', label: 'Deutsch' },
  ];
}
```

## Tech Stack

- **React** with TypeScript
- **Vite** for build tooling
- **Zustand** for state management
- **Web Audio API** for sound effects
- **Plain CSS** for styling

## Project Structure

```
src/
├── audio/           # Audio manager (Web Audio API)
├── components/      # React components
│   ├── SetupScreen.tsx
│   ├── GameScreen.tsx
│   ├── CenterConsole.tsx
│   └── PlayerStation.tsx
├── engine/          # Game logic (pure functions)
├── i18n/            # Translations
├── store/           # Zustand state store
├── styles/          # CSS files
└── types/           # TypeScript type definitions
```

## License

MIT
