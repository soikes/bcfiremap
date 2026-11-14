import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { SHOW_FIRE_ZONES } from '../constants/map';
import { useBans } from '../hooks/useBans';
import { useFireBans } from '../hooks/useFireBans';
import { LatLng } from '../types/geo';
import './App.css';
import { BanPanel, BanPanelFallback } from './BanPanel';
import { BanPolygons } from './BanPolygons';
import { BaseMap } from './BaseMap';
import { ErrorBoundary } from './ErrorBoundary';
import { FireZones } from './FireZones';
import { SelectedPin } from './SelectedPin';
import { SourceBanner } from './SourceBanner';

interface Props {
  client?: QueryClient;
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 3,
      // Exponential backoff: wait 1 s before the first retry and double it each time (2 s, 4 s, ...), never more than 30 s.
      retryDelay: attempt => Math.min(1000 * 2 ** attempt, 30000),
    },
  },
});

/** Map screen: owns the selected location and composes the map layers, the source banner and the results panel. */
function MapScreen() {
  const { bans, sources } = useBans();
  const [selected, setSelected] = useState<LatLng | null>(null);
  const bansHere = useFireBans(bans, selected);

  return (
    <div className="app">
      <BaseMap onClick={setSelected}>
        {SHOW_FIRE_ZONES && <FireZones />}
        <ErrorBoundary name="BanPolygons" fallback={null} resetKey={bans}>
          <BanPolygons bans={bans} />
        </ErrorBoundary>
        {selected && <SelectedPin coordinate={selected} />}
      </BaseMap>
      <SourceBanner sources={sources} />
      {selected && (
        <ErrorBoundary name="BanPanel" fallback={<BanPanelFallback />} resetKey={selected}>
          <BanPanel bans={bansHere} sources={sources} onClose={() => setSelected(null)} />
        </ErrorBoundary>
      )}
    </div>
  );
}

/** Root component: provides the data-fetching client to the map screen. */
export default function App({ client = queryClient }: Props) {
  return (
    <QueryClientProvider client={client}>
      <MapScreen />
    </QueryClientProvider>
  );
}
