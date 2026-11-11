import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { FireBan } from '../data/fireBans';
import { BanCard } from './BanCard';

interface Props {
  bans: FireBan[];
  onClose: () => void;
}

/** Bottom sheet listing the fire bans in effect at the selected location. */
export function BanPanel({ bans, onClose }: Props) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Text style={styles.panelTitle}>
          {bans.length === 0
            ? 'No fire bans at this location'
            : `${bans.length} fire ban${bans.length !== 1 ? 's' : ''} in effect`}
        </Text>
        <TouchableOpacity onPress={onClose} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
          <Text style={styles.closeBtn}>✕</Text>
        </TouchableOpacity>
      </View>
      <ScrollView showsVerticalScrollIndicator={false}>
        {bans.map(ban => (
          <BanCard key={ban.id} ban={ban} />
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  panel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
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
});
