import { Linking, StyleSheet, Text, View } from 'react-native';
import { BAN_COLORS, LEVEL_LABEL, TYPE_LABEL } from '../constants/banStyle';
import { FireBan } from '../types/ban';

interface Props {
  ban: FireBan;
}

/** Summary card for a single fire ban: level badge, region, type, description, date and bulletin link. */
export function BanCard({ ban }: Props) {
  const c = BAN_COLORS[ban.level];
  const url = ban.url;
  return (
    <View style={[styles.banCard, { borderLeftColor: c.stroke }]}>
      <View style={[styles.levelBadge, { backgroundColor: c.stroke }]}>
        <Text style={styles.levelText}>{LEVEL_LABEL[ban.level]}</Text>
      </View>
      <Text style={styles.banRegion}>{ban.region}</Text>
      <Text style={styles.banType}>{ban.title ?? TYPE_LABEL[ban.type]}</Text>
      {ban.description ? <Text style={styles.banDesc}>{ban.description}</Text> : null}
      {ban.effectiveDate ? <Text style={styles.banDate}>Effective {ban.effectiveDate}</Text> : null}
      {url ? (
        <Text style={styles.banLink} onPress={() => Linking.openURL(url)}>
          Official bulletin
        </Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  banCard: {
    borderLeftWidth: 3,
    paddingLeft: 10,
    marginBottom: 14,
  },
  levelBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 7,
    paddingVertical: 2,
    borderRadius: 4,
    marginBottom: 5,
  },
  levelText: {
    color: '#fff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.4,
  },
  banRegion: {
    fontSize: 15,
    fontWeight: '600',
    color: '#111',
    marginBottom: 2,
  },
  banType: {
    fontSize: 13,
    fontWeight: '500',
    color: '#444',
    marginBottom: 4,
  },
  banDesc: {
    fontSize: 12,
    color: '#666',
    lineHeight: 18,
    marginBottom: 4,
  },
  banDate: {
    fontSize: 11,
    color: '#999',
  },
  banLink: {
    fontSize: 12,
    color: '#1a5fb4',
    textDecorationLine: 'underline',
    marginTop: 4,
  },
});
