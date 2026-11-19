import type { ImageSourcePropType } from 'react-native';
import type { AchievementId } from '../engine/achievements';
import type { CatId } from './story';

export const catArt: Record<CatId, ImageSourcePropType> = {
  mira: require('../../assets/cats/mira.webp'),
  yantar: require('../../assets/cats/yantar.webp'),
  lila: require('../../assets/cats/lila.webp'),
  nochka: require('../../assets/cats/nochka.webp'),
};

export const badgeArt: Record<AchievementId, ImageSourcePropType> = {
  first_topic: require('../../assets/badges/explorer.webp'),
  brief_stars: require('../../assets/badges/brief.webp'),
  report_stars: require('../../assets/badges/analyst.webp'),
  campaign_done: require('../../assets/badges/shooting-star.webp'),
  all_topics: require('../../assets/badges/key.webp'),
  all_stars: require('../../assets/badges/crown.webp'),
};

export const mapArt: ImageSourcePropType = require('../../assets/map.webp');
export const fellowshipArt: ImageSourcePropType = require('../../assets/fellowship.webp');
