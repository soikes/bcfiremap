import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from 'react-native';
import { SourceStatus } from '../collectors/types';
import { FireBan } from '../types/ban';
import { BanCard } from './BanCard';

const DESKTOP_MIN_WIDTH = 768;

interface Props {
  bans: FireBan[];
  sources: SourceStatus[];
  onClose: () => void;
}

/** Headline for the panel, based on the bans found and whether every source loaded. */
function panelTitle(bans: FireBan[], sources: SourceStatus[]): string {
  if (bans.length > 0) return `${bans.length} fire ban${bans.length !== 1 ? 's' : ''} in effect`;
  if (sources.some(s => s.status === 'pending' && !s.hasData)) return 'Loading ban data…';
  if (sources.some(s => s.status === 'error' && !s.hasData)) return "Couldn't check every source";
  return 'No fire bans found at this location';
}

/** One-line status for a data source. */
function sourceLine(source: SourceStatus): string {
  const time = new Date(source.updatedAt).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (source.status === 'error') {
    return source.hasData
      ? `${source.name}: update failed, showing data from ${time}`
      : `${source.name}: unavailable`;
  }
  if (!source.hasData) return `${source.name}: loading…`;
  return `${source.name}: updated ${time}`;
}

/** Bottom sheet listing the fire bans in effect at the selected location, and which sources were checked. */
export function BanPanel({ bans, sources, onClose }: Props) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_MIN_WIDTH;
  const attributions = [...new Set(sources.map(s => s.attribution).filter(Boolean))];

  return (
    <View style={[styles.wrapper, isDesktop && styles.wrapperDesktop]}>
      <View style={[styles.panel, isDesktop && styles.panelDesktop]}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>{panelTitle(bans, sources)}</Text>
          <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {bans.map(ban => (
            <BanCard key={ban.id} ban={ban} />
          ))}
          <View style={styles.sources}>
            {sources.map(source => (
              <View key={source.id} style={styles.source}>
                <Text style={styles.sourceLine}>{sourceLine(source)}</Text>
                <Text style={styles.sourceCoverage}>{source.coverage}</Text>
              </View>
            ))}
            {attributions.map(attribution => (
              <Text key={attribution} style={styles.sourceCoverage}>
                {attribution}
              </Text>
            ))}
          </View>
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFill,
    justifyContent: 'flex-end',
    pointerEvents: 'box-none',
  },
  wrapperDesktop: {
    alignItems: 'center',
  },
  panel: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 36,
    maxHeight: '55%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 12,
  },
  panelDesktop: {
    maxWidth: '33.33%',
  },
  panelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111',
    flex: 1,
  },
  closeBtn: {
    fontSize: 18,
    color: '#888',
    paddingLeft: 8,
  },
  sources: {
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: '#ddd',
    paddingTop: 10,
    gap: 6,
  },
  source: {
    gap: 1,
  },
  sourceLine: {
    fontSize: 11,
    fontWeight: '600',
    color: '#555',
  },
  sourceCoverage: {
    fontSize: 11,
    color: '#888',
    lineHeight: 15,
  },
});
