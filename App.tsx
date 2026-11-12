import { QueryClientProvider } from '@tanstack/react-query';
import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BanPanel } from './components/BanPanel';
import { BanPolygons } from './components/BanPolygons';
import { BaseMap } from './components/BaseMap';
import { FireZones } from './components/FireZones';
import { SelectedPin } from './components/SelectedPin';
import { SHOW_FIRE_ZONES } from './constants/map';
import { useBans } from './hooks/useBans';
import { useFireBans } from './hooks/useFireBans';
import { queryClient } from './lib/queryClient';
import { LatLng } from './types/geo';

/** Map screen: owns the selected location and composes the map layers and results panel. */
function MapScreen() {
  const { bans, sources } = useBans();
  const [selected, setSelected] = useState<LatLng | null>(null);
  const bansHere = useFireBans(bans, selected);

  return (
    <View style={styles.container}>
      <BaseMap onPress={setSelected}>
        {SHOW_FIRE_ZONES && <FireZones />}
        <BanPolygons bans={bans} />
        {selected && <SelectedPin coordinate={selected} />}
      </BaseMap>
      {selected && <BanPanel bans={bansHere} sources={sources} onClose={() => setSelected(null)} />}
    </View>
  );
}

/** Root component: provides the data-fetching client to the map screen. */
export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <MapScreen />
    </QueryClientProvider>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
