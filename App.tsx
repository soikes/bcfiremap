import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BanPanel } from './components/BanPanel';
import { BanPolygons } from './components/BanPolygons';
import { BaseMap } from './components/BaseMap';
import { FireZoneOutlines } from './components/FireZoneOutlines';
import { SelectedPin } from './components/SelectedPin';
import { ZoneLabels } from './components/ZoneLabels';
import { EXAMPLE_FIRE_BANS } from './data/fireBans';
import { LatLng, useFireZones } from './hooks/useFireZones';
import { useFireBans } from './hooks/useFireBans';

/** Root component: owns the selected-location state and composes the map layers and results panel. */
export default function App() {
  const { zones } = useFireZones();
  const [selected, setSelected] = useState<LatLng | null>(null);
  const bans = useFireBans(selected);

  return (
    <View style={styles.container}>
      <BaseMap onPress={setSelected}>
        <FireZoneOutlines zones={zones} />
        <ZoneLabels zones={zones} />
        <BanPolygons bans={EXAMPLE_FIRE_BANS} />
        {selected && <SelectedPin coordinate={selected} />}
      </BaseMap>
      {selected && <BanPanel bans={bans} onClose={() => setSelected(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
});
