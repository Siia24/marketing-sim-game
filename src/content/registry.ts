import campaignCoffee from './campaigns/campaign-coffee.json';
import { loadCampaign } from './loadCampaign';
import type { Campaign } from './types';

/**
 * Кампании, которые попадают в сборку.
 * Новый JSON кладётся в эту папку и добавляется одной строкой ниже.
 */
const bundled = [loadCampaign(campaignCoffee)];

export function listCampaigns(): Campaign[] {
  return bundled;
}

export function findCampaign(id: string): Campaign | undefined {
  return bundled.find((campaign) => campaign.id === id);
}
