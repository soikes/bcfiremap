import { StyleSheet, Text } from 'react-native';
import { Marker } from 'react-native-maps';
import { FireZone } from '../hooks/useFireZones';

interface Props {
  zones: FireZone[];
}

/** Renders each zone's name as a text marker at its centroid. */
export function ZoneLabels({ zones }: Props) {
  return (
    <>
      {zones.map(zone => (
        <Marker
          key={`${zone.id}-label`}
          coordinate={zone.centroid}
          anchor={{ x: 0.5, y: 0.5 }}
          flat
          tracksViewChanges={false}
        >
          <Text style={styles.zoneLabel}>{zone.name}</Text>
        </Marker>
      ))}
    </>
  );
}

const styles = StyleSheet.create({
  zoneLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: '#000',
    textShadowColor: '#fff',
    textShadowOffset: { width: 0, height: 0 },
    textShadowRadius: 3,
  },
});
