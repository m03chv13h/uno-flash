import { useGameStore } from '../store/gameStore';
import { t } from '../i18n';
import { getAvailableLanguages } from '../i18n';
import { audioManager } from '../audio/audioManager';
import type { Difficulty } from '../types/game';
import '../styles/SetupScreen.css';

export default function SetupScreen() {
  const config = useGameStore((s) => s.config);
  const setConfig = useGameStore((s) => s.setConfig);
  const startGame = useGameStore((s) => s.startGame);
  const lang = config.language;

  const diffDescriptions: Record<number, string> = {
    1: t('diff_1', lang),
    2: t('diff_2', lang),
    3: t('diff_3', lang),
    4: t('diff_4', lang),
  };

  return (
    <div className="setup-screen">
      {/* Title */}
      <div className="setup-title">
        <h1>UNO FLASH</h1>
        <div className="subtitle">{t('setup_subtitle', lang)}</div>
      </div>

      {/* Difficulty */}
      <div className="setup-panel">
        <h3>{t('difficulty', lang)}</h3>
        <div className="difficulty-options">
          {([1, 2, 3, 4] as Difficulty[]).map((d) => (
            <button
              key={d}
              className={`diff-btn ${config.difficulty === d ? 'active' : ''}`}
              onClick={() => {
                audioManager.resume();
                audioManager.buttonPress();
                setConfig({ difficulty: d });
              }}
            >
              {t('level', lang)} {d}
              <span className="diff-label">{diffDescriptions[d]}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Player Count */}
      <div className="setup-panel">
        <h3>{t('player_count', lang)}</h3>
        <div className="player-count-options">
          {[1, 2, 3, 4].map((n) => (
            <button
              key={n}
              className={`count-btn ${config.playerCount === n ? 'active' : ''}`}
              onClick={() => {
                audioManager.resume();
                audioManager.buttonPress();
                setConfig({ playerCount: n });
              }}
            >
              {n}
            </button>
          ))}
        </div>
        {config.playerCount < 4 && (
          <div className="checkbox-row" style={{ marginTop: 10 }}>
            <input
              type="checkbox"
              id="fill-ai"
              checked={config.fillWithAI}
              onChange={(e) => setConfig({ fillWithAI: e.target.checked })}
            />
            <label htmlFor="fill-ai">{t('fill_ai', lang)}</label>
          </div>
        )}
      </div>

      {/* Language */}
      <div className="setup-panel">
        <h3>{t('language', lang)}</h3>
        <select
          className="language-select"
          value={config.language}
          onChange={(e) => setConfig({ language: e.target.value })}
        >
          {getAvailableLanguages().map((l) => (
            <option key={l.code} value={l.code}>
              {l.label}
            </option>
          ))}
        </select>
      </div>

      {/* Sound */}
      <div className="setup-panel">
        <div className="sound-toggle">
          <h3 style={{ margin: 0 }}>{t('sound', lang)}</h3>
          <button
            className={`toggle-btn ${config.soundEnabled ? 'on' : 'off'}`}
            onClick={() => {
              const next = !config.soundEnabled;
              setConfig({ soundEnabled: next });
              audioManager.setEnabled(next);
              if (next) {
                audioManager.resume();
                audioManager.buttonPress();
              }
            }}
          >
            {config.soundEnabled ? t('sound_on', lang) : t('sound_off', lang)}
          </button>
        </div>
      </div>

      {/* Rules */}
      <div className="setup-panel">
        <h3>{t('rules_title', lang)}</h3>
        <p className="rules-summary">{t('rules_summary', lang)}</p>
      </div>

      {/* Start */}
      <button
        className="start-btn"
        onClick={() => {
          audioManager.resume();
          startGame();
        }}
      >
        {t('start_game', lang)}
      </button>
    </div>
  );
}
