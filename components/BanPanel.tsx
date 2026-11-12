import {
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  useWindowDimensions,
  View,
} from "react-native";
import { FireBan } from "../data/fireBans";
import { BanCard } from "./BanCard";

const DESKTOP_MIN_WIDTH = 768;

interface Props {
  bans: FireBan[];
  onClose: () => void;
}

/** Bottom sheet listing the fire bans in effect at the selected location. */
export function BanPanel({ bans, onClose }: Props) {
  const { width } = useWindowDimensions();
  const isDesktop = width >= DESKTOP_MIN_WIDTH;

  return (
    <View style={[styles.wrapper, isDesktop && styles.wrapperDesktop]}>
      <View style={[styles.panel, isDesktop && styles.panelDesktop]}>
        <View style={styles.panelHeader}>
          <Text style={styles.panelTitle}>
            {bans.length === 0
              ? "No fire bans at this location"
              : `${bans.length} fire ban${bans.length !== 1 ? "s" : ""} in effect`}
          </Text>
          <TouchableOpacity
            onPress={onClose}
            hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
          >
            <Text style={styles.closeBtn}>✕</Text>
          </TouchableOpacity>
        </View>
        <ScrollView showsVerticalScrollIndicator={false}>
          {bans.map((ban) => (
            <BanCard key={ban.id} ban={ban} />
          ))}
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  wrapper: {
    ...StyleSheet.absoluteFill,
    justifyContent: "flex-end",
    pointerEvents: "box-none",
  },
  wrapperDesktop: {
    alignItems: "center",
  },
  panel: {
    backgroundColor: "#fff",
    borderTopLeftRadius: 18,
    borderTopRightRadius: 18,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 36,
    maxHeight: "55%",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.12,
    shadowRadius: 10,
    elevation: 12,
  },
  panelDesktop: {
    maxWidth: "33.33%",
  },
  panelHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 14,
  },
  panelTitle: {
    fontSize: 16,
    fontWeight: "600",
    color: "#111",
    flex: 1,
  },
  closeBtn: {
    fontSize: 18,
    color: "#888",
    paddingLeft: 8,
  },
});
