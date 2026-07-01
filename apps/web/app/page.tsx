import { GameProvider } from '@/components/GameProvider';
import { Shell } from '@/components/Shell';

export default function Page() {
  return (
    <div className="app">
      <GameProvider>
        <Shell />
      </GameProvider>
    </div>
  );
}
