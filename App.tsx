import { useState } from 'react';
import { StyleSheet, View } from 'react-native';
import MapView, { MapPressEvent } from 'react-native-maps';
import { BanPanel } from './components/BanPanel';
import { BanPolygons } from './components/BanPolygons';
import { FireZoneOutlines } from './components/FireZoneOutlines';
import { SelectedPin } from './components/SelectedPin';
import { ZoneLabels } from './components/ZoneLabels';
import { EXAMPLE_FIRE_BANS } from './data/fireBans';
import { LatLng, useFireZones } from './hooks/useFireZones';
import { useFireBans } from './hooks/useFireBans';

const BC_REGION = {
  latitude: 54.0,
  longitude: -125.0,
  latitudeDelta: 14.0,
  longitudeDelta: 14.0,
};

/** Root component: owns the selected-location state and composes the map layers and results panel. */
export default function App() {
  const { zones } = useFireZones();
  const [selected, setSelected] = useState<LatLng | null>(null);
  const bans = useFireBans(selected);

  function handleMapPress(e: MapPressEvent) {
    setSelected(e.nativeEvent.coordinate);
  }

  return (
    <View style={styles.container}>
      <MapView style={styles.map} initialRegion={BC_REGION} onPress={handleMapPress}>
        <FireZoneOutlines zones={zones} />
        <ZoneLabels zones={zones} />
        <BanPolygons bans={EXAMPLE_FIRE_BANS} />
        {selected && <SelectedPin coordinate={selected} />}
      </MapView>
      {selected && <BanPanel bans={bans} onClose={() => setSelected(null)} />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  map: { flex: 1 },
});
