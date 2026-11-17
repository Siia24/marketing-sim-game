import { useLocalSearchParams } from 'expo-router';
import { LessonScreen } from '@/components/LessonScreen';

export default function LessonRoute() {
  const params = useLocalSearchParams<{ campaignId: string; lessonId: string }>();
  return <LessonScreen campaignId={one(params.campaignId)} lessonId={one(params.lessonId)} />;
}

function one(value: string | string[] | undefined): string {
  if (Array.isArray(value)) return value[0] ?? '';
  return value ?? '';
}
