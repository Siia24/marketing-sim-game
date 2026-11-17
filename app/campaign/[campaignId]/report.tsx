import { useLocalSearchParams } from 'expo-router';
import { ReportScreen } from '@/components/ReportScreen';

export default function ReportRoute() {
  const params = useLocalSearchParams<{ campaignId: string }>();
  const campaignId = Array.isArray(params.campaignId)
    ? (params.campaignId[0] ?? '')
    : (params.campaignId ?? '');
  return <ReportScreen campaignId={campaignId} />;
}
