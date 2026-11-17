import AsyncStorage from '@react-native-async-storage/async-storage';
import type { StoredProgress } from '../engine/attempt';
import { emptyProgress, parseProgress } from './parseProgress';

const storageKey = (campaignId: string) => `progress:v1:${campaignId}`;

export async function loadProgress(campaignId: string): Promise<StoredProgress> {
  try {
    const raw = await AsyncStorage.getItem(storageKey(campaignId));
    if (!raw) return emptyProgress();
    return parseProgress(raw);
  } catch {
    return emptyProgress();
  }
}

/** AsyncStorage на вебе пишет в localStorage, в Expo Go — в локальное хранилище приложения. */
export async function saveProgress(campaignId: string, progress: StoredProgress): Promise<void> {
  await AsyncStorage.setItem(storageKey(campaignId), JSON.stringify(progress));
}

export { emptyProgress };
