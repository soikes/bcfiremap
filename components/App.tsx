import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { SHOW_FIRE_ZONES } from '../constants/map';
import { BROWSER_COLLECTORS } from '../collectors/constants/browser';
import { useBans } from '../hooks/useBans';
import { useLoadStatus } from '../hooks/useLoadStatus';
import { useFireBans } from '../hooks/useFireBans';
import { Collector } from '../types/collector';
import { LatLng } from '../types/geo';
import './App.css';
import { BanPanel, BanPanelFallback } from './BanPanel';
import { BanPolygons } from './BanPolygons';
import { BaseMap } from './BaseMap';
import { Disclaimer } from './Disclaimer';
import { ErrorBoundary } from './ErrorBoundary';
import { FireZones } from './FireZones';
import { LocationSearch } from './LocationSearch';
import { MapFocus } from './MapFocus';
import { SelectedPin } from './SelectedPin';
import { LoadSpinner } from './LoadSpinner';
import { Toast } from './Toast';

interface Props {
  client?: QueryClient;
  collectors?: Collector[];
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
function MapScreen({ collectors }: { collectors: Collector[] }) {
  const { bans, sources } = useBans(collectors);
  const { loading, message } = useLoadStatus(sources);
  const [selected, setSelected] = useState<LatLng | null>(null);
  const [focus, setFocus] = useState<LatLng | null>(null);
  const bansHere = useFireBans(bans, selected);

  /** Selects a searched or detected location and asks the map to move to it; the copy makes searching the same place twice move the map twice. */
  function locate(location: LatLng) {
    setSelected(location);
    setFocus({ ...location });
  }

  return (
    <div className="app">
      <BaseMap onClick={setSelected}>
        {SHOW_FIRE_ZONES && <FireZones />}
        <ErrorBoundary name="BanPolygons" fallback={null} resetKey={bans}>
          <BanPolygons bans={bans} />
        </ErrorBoundary>
        {selected && <SelectedPin coordinate={selected} />}
        <ErrorBoundary name="MapFocus" fallback={null} resetKey={focus}>
          <MapFocus target={focus} bans={bansHere} />
        </ErrorBoundary>
      </BaseMap>
      <Disclaimer />
      <div className="app-controls">
        <div className="app-controls-main">
          <LocationSearch onLocate={locate} />
          {message ? <Toast message={message} /> : null}
        </div>
        <LoadSpinner active={loading} />
      </div>
      {selected && (
        <ErrorBoundary name="BanPanel" fallback={<BanPanelFallback />} resetKey={selected}>
          <BanPanel bans={bansHere} sources={sources} onClose={() => setSelected(null)} />
        </ErrorBoundary>
      )}
    </div>
  );
}

/** Root component: provides the data-fetching client to the map screen. */
export default function App({ client = queryClient, collectors = BROWSER_COLLECTORS }: Props) {
  return (
    <QueryClientProvider client={client}>
      <MapScreen collectors={collectors} />
    </QueryClientProvider>
  );
}
