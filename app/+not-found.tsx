import { useRouter } from 'expo-router';
import { Button, Muted, Screen, Title } from '@/components/ui';

export default function NotFound() {
  const router = useRouter();
  return (
    <Screen>
      <Title>Такой страницы нет</Title>
      <Muted>Вернитесь к кампании — прогресс на месте.</Muted>
      <Button label="На главную" onPress={() => router.replace('/')} />
    </Screen>
  );
}
