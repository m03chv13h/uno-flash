import { useGameStore } from './store/gameStore';
import SetupScreen from './components/SetupScreen';
import GameScreen from './components/GameScreen';
import './styles/global.css';

export default function App() {
  const phase = useGameStore((s) => s.phase);

  if (phase === 'setup') {
    return <SetupScreen />;
  }

  return <GameScreen />;
}
