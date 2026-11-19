import { Image, StyleSheet, View, type ImageSourcePropType } from 'react-native';
import { theme } from './theme';

/** Круг обрезает белые и тёмные углы исходника, чтобы они не торчали из рамки. */
export function CatPortrait({
  source,
  size,
  dimmed = false,
}: {
  source: ImageSourcePropType;
  size: number;
  dimmed?: boolean;
}) {
  return (
    <View
      style={[
        styles.ring,
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderColor: dimmed ? theme.line : theme.gold,
        },
      ]}
    >
      <Image
        source={source}
        style={{ width: size, height: size }}
        accessibilityIgnoresInvertColors
      />
      {dimmed ? <View style={styles.shade} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  ring: {
    overflow: 'hidden',
    borderWidth: 2,
    backgroundColor: theme.blue,
  },
  shade: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(8, 6, 20, 0.78)',
  },
});
