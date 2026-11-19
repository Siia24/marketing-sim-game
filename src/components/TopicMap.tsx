import { ImageBackground, Pressable, StyleSheet, Text, View } from 'react-native';
import { mapArt, catArt } from '../content/art';
import type { Topic } from '../content/topics';
import { hostFor } from '../content/story';
import type { TopicScore } from '../engine/attempt';
import { CatPortrait } from './CatPortrait';
import { StarMark } from './StarMark';
import { theme } from './theme';

/** Снизу — начало тропы у фонарей, сверху — замок. Круги чередуются, чтобы подписи не слипались. */
const SPOTS: { top: `${number}%`; side: 'left' | 'right' }[] = [
  { top: '84%', side: 'left' },
  { top: '73%', side: 'right' },
  { top: '62%', side: 'left' },
  { top: '51%', side: 'right' },
  { top: '40%', side: 'left' },
  { top: '29%', side: 'right' },
];

export function TopicMap({
  topics,
  scores,
  activeTopicId,
  onOpen,
}: {
  topics: Topic[];
  scores: Record<string, TopicScore | undefined>;
  activeTopicId: string | null;
  onOpen: (topicId: string) => void;
}) {
  return (
    <ImageBackground
      source={mapArt}
      style={styles.map}
      imageStyle={styles.image}
      resizeMode="cover"
    >
      {topics.map((topic, index) => {
        const spot = SPOTS[index] ?? SPOTS[SPOTS.length - 1];
        const host = hostFor(topic.id);
        if (!spot || !host) return null;
        const stars = scores[topic.id]?.stars ?? 0;
        const active = activeTopicId === topic.id;
        return (
          <Pressable
            key={topic.id}
            accessibilityRole="button"
            accessibilityLabel={`${topic.title}, ${stars} из 3${active ? ', сейчас' : ''}`}
            onPress={() => onOpen(topic.id)}
            testID={`map-topic-${topic.id}`}
            style={({ pressed }) => [
              styles.spot,
              { top: spot.top },
              spot.side === 'left' ? styles.left : styles.right,
              pressed && styles.pressed,
            ]}
          >
            {spot.side === 'right' ? (
              <NodeCopy title={topic.title} stars={stars} active={active} align="right" />
            ) : null}
            <View style={[styles.glow, active && styles.glowActive]}>
              <CatPortrait source={catArt[host.catId]} size={58} />
            </View>
            {spot.side === 'left' ? (
              <NodeCopy title={topic.title} stars={stars} active={active} align="left" />
            ) : null}
          </Pressable>
        );
      })}
    </ImageBackground>
  );
}

function NodeCopy({
  title,
  stars,
  active,
  align,
}: {
  title: string;
  stars: number;
  active: boolean;
  align: 'left' | 'right';
}) {
  return (
    <View style={[styles.copy, align === 'right' && styles.copyRight]}>
      <Text style={styles.title} numberOfLines={2}>
        {title}
      </Text>
      <StarMark value={stars} size={14} />
      {active ? <Text style={styles.now}>сейчас</Text> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  map: { width: '100%', aspectRatio: 720 / 1280, borderRadius: 22, overflow: 'hidden' },
  image: { borderRadius: 22 },
  spot: {
    position: 'absolute',
    width: '48%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  left: { left: '3%' },
  right: { right: '3%', justifyContent: 'flex-end' },
  pressed: { opacity: 0.86 },
  glow: {
    borderRadius: 32,
    shadowColor: theme.gold,
    shadowOpacity: 0.9,
    shadowRadius: 10,
    shadowOffset: { width: 0, height: 0 },
    elevation: 6,
  },
  glowActive: { shadowRadius: 16 },
  copy: {
    flex: 1,
    backgroundColor: theme.scrim,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(228, 195, 106, 0.45)',
    paddingHorizontal: 8,
    paddingVertical: 4,
    gap: 1,
  },
  copyRight: { alignItems: 'flex-end' },
  title: { fontSize: 13, lineHeight: 16, fontWeight: '700', color: theme.ink },
  now: { fontSize: 11, color: theme.gold },
});
