import { Image, StyleSheet, Text, View } from 'react-native';
import { catArt, fellowshipArt } from '../content/art';
import { CATS } from '../content/story';
import { CatPortrait } from './CatPortrait';
import { theme } from './theme';
import { Button, Muted, Screen, Title } from './ui';

export function IntroScreen({
  onContinue,
  continueLabel = 'В путь',
}: {
  onContinue: () => void;
  continueLabel?: string;
}) {
  return (
    <Screen>
      <Text style={styles.kicker}>Сумеречный луг</Text>
      <Title>Котики-маги</Title>
      <View style={styles.frame}>
        <Image
          source={fellowshipArt}
          style={styles.photo}
          resizeMode="cover"
          accessibilityLabel="Четыре котика в мантиях на лугу"
        />
      </View>
      <Muted>
        Четверо котят в мантиях ищут правду о маркетинге и учатся вместе с вами. На карте шесть
        троп. Звёзды остаются за лучший результат.
      </Muted>
      <View style={styles.list}>
        {CATS.map((cat) => (
          <View key={cat.id} style={styles.row}>
            <CatPortrait source={catArt[cat.id]} size={64} />
            <View style={styles.text}>
              <Text style={styles.name}>{cat.name}</Text>
              <Muted>{cat.role}</Muted>
            </View>
          </View>
        ))}
      </View>
      <Button label={continueLabel} onPress={onContinue} testID="intro-continue" />
    </Screen>
  );
}

const styles = StyleSheet.create({
  kicker: {
    fontSize: 13,
    fontWeight: '700',
    color: theme.gold,
    letterSpacing: 0.4,
    fontFamily: theme.fontTitle,
  },
  frame: {
    width: '100%',
    aspectRatio: 16 / 9,
    borderRadius: theme.radius,
    overflow: 'hidden',
    backgroundColor: theme.blue,
  },
  photo: { width: '100%', height: '100%' },
  list: { gap: 12 },
  row: { flexDirection: 'row', gap: 12, alignItems: 'center' },
  text: { flex: 1, gap: 2 },
  name: { fontSize: 18, fontWeight: '700', color: theme.ink, fontFamily: theme.fontTitle },
});
