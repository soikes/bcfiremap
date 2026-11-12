import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { BanPanel } from './components/BanPanel';
import { BanPolygons } from './components/BanPolygons';
import { BaseMap } from './components/BaseMap';
import { FireZones } from './components/FireZones';
import { SelectedPin } from './components/SelectedPin';
import { SHOW_FIRE_ZONES } from './constants/map';
import { EXAMPLE_FIRE_BANS } from './data/fireBans';
import { useFireBans } from './hooks/useFireBans';
import { LatLng } from './types/geo';

/** Root component: owns the selected-location state and composes the map layers and results panel. */
export default function App() {
  const [selected, setSelected] = useState<LatLng | null>(null);
  const bans = useFireBans(selected);

  return (
    <View style={styles.container}>
      <BaseMap onPress={setSelected}>
        {SHOW_FIRE_ZONES && <FireZones />}
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
