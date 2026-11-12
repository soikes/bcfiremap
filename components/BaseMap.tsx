import { Camera, Map as MapLibreMap, MapProps, PressEvent } from '@maplibre/maplibre-react-native';
import { NativeSyntheticEvent, StyleSheet } from 'react-native';
import { BASEMAP_STYLE, INITIAL_VIEW } from '../constants/map';
import { BaseMapProps } from './BaseMap.types';

/** Full-size native MapLibre map centred on BC that reports presses as a LatLng. */
export function BaseMap({ onPress, children }: BaseMapProps) {
  function handlePress(e: NativeSyntheticEvent<PressEvent>) {
    const [longitude, latitude] = e.nativeEvent.lngLat;
    onPress({ latitude, longitude });
  }

  return (
    <MapLibreMap style={styles.map} mapStyle={BASEMAP_STYLE as MapProps['mapStyle']} onPress={handlePress}>
      <Camera
        initialViewState={{
          center: [INITIAL_VIEW.longitude, INITIAL_VIEW.latitude],
          zoom: INITIAL_VIEW.zoom,
        }}
      />
      {children}
    </MapLibreMap>
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
