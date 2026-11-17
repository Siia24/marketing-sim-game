import { useLocalSearchParams } from 'expo-router';
import { QuizScreen } from '@/components/QuizScreen';

export default function QuizRoute() {
  const params = useLocalSearchParams<{ campaignId: string; lessonId: string }>();
  return <QuizScreen campaignId={one(params.campaignId)} lessonId={one(params.lessonId)} />;
}

function one(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}
