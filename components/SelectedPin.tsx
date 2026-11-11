import { StyleSheet, View } from 'react-native';
import { Marker } from 'react-native-maps';
import { LatLng } from '../hooks/useFireZones';

interface Props {
  coordinate: LatLng;
}

/** Dot marker showing the user's tapped location. */
export function SelectedPin({ coordinate }: Props) {
  return (
    <Marker coordinate={coordinate} anchor={{ x: 0.5, y: 0.5 }} tracksViewChanges={false}>
      <View style={styles.pin} />
    </Marker>
  );
}

const styles = StyleSheet.create({
  pin: {
    width: 14,
    height: 14,
    borderRadius: 7,
    backgroundColor: '#111',
    borderWidth: 2.5,
    borderColor: '#fff',
  },
});
