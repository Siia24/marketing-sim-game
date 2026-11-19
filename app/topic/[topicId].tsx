import { useLocalSearchParams } from 'expo-router';
import { TopicScreen } from '@/components/TopicScreen';

export default function TopicRoute() {
  const params = useLocalSearchParams<{ topicId: string }>();
  return <TopicScreen topicId={one(params.topicId)} />;
}

function one(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}
