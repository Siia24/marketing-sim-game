import type { AchievementId } from '../engine/achievements';

export const CATS = [
  {
    id: 'yantar',
    name: 'Янтарь',
    role: 'Смотрит, кто может прийти, и проверяет блогеров.',
  },
  {
    id: 'mira',
    name: 'Мира',
    role: 'Проводница. Ведёт бриф и кейс «Пауза».',
  },
  {
    id: 'nochka',
    name: 'Ночка',
    role: 'Сводит показы, кассу и отчёт.',
  },
  {
    id: 'lila',
    name: 'Лила',
    role: 'Собирает текст, по которому можно прийти.',
  },
] as const;

export type CatId = (typeof CATS)[number]['id'];

export function catById(id: CatId): (typeof CATS)[number] {
  const cat = CATS.find((item) => item.id === id);
  if (!cat) throw new Error(`Нет котика «${id}».`);
  return cat;
}

export interface TopicHost {
  catId: CatId;
  hello: string;
  bye: string;
}

/** Реплики короткие и не добавляют фактов: учебный текст остаётся в уроках. */
export const TOPIC_HOSTS: Record<string, TopicHost> = {
  brief: {
    catId: 'mira',
    hello: 'Сначала договоримся, чего хотим. Я рядом и не тороплю.',
    bye: 'Бриф пройден. Звёзды — за ясные ответы.',
  },
  audience: {
    catId: 'yantar',
    hello: 'Лупа при мне. Смотрим, кто вообще может зайти.',
    bye: 'Круг людей стал яснее. Идём дальше.',
  },
  content: {
    catId: 'lila',
    hello: 'Перо острое, свиток чистый. Собираем текст, по которому можно прийти.',
    bye: 'Свиток закрыт. Если из текста ясно, куда идти, он сделал своё.',
  },
  bloggers: {
    catId: 'yantar',
    hello: 'Теперь лупа смотрит на авторов. Данные — до оплаты.',
    bye: 'Автор без данных остаётся туманом. Мы его разобрали.',
  },
  media: {
    catId: 'nochka',
    hello: 'Шар зажёгся. Сверим, где показ дешёвый, а где он у двери.',
    bye: 'План на столе. Дальше видно, что из него доходит до кассы.',
  },
  report: {
    catId: 'nochka',
    hello: 'Касса, коды и реклама лежат рядом. Это не одно и то же.',
    bye: 'Отчёт честный, когда в нём сказано, что вышло на самом деле.',
  },
};

export function hostFor(topicId: string): (TopicHost & { cat: (typeof CATS)[number] }) | undefined {
  const host = TOPIC_HOSTS[topicId];
  if (!host) return undefined;
  return { ...host, cat: catById(host.catId) };
}

export const CAMPAIGN_LINE = 'Дальше одна дорога — от разговора с владельцем до отчёта.';

export const FINALE_LINE = 'Дошли до отчёта. Цифры условные, а разбор — настоящая работа.';

export const ACHIEVEMENT_COPY: Record<AchievementId, { title: string; rule: string }> = {
  first_topic: { title: 'Следопыт', rule: 'Пройти любую тему до конца.' },
  brief_stars: { title: 'Свиток брифа', rule: 'Три звезды в теме «Бриф».' },
  report_stars: { title: 'Светлый шар', rule: 'Три звезды в теме «Аналитика и отчёт».' },
  campaign_done: { title: 'Падающая звезда', rule: 'Закончить кейс кофейни «Пауза».' },
  all_topics: { title: 'Золотой ключ', rule: 'Пройти все шесть тем.' },
  all_stars: { title: 'Корона звёзд', rule: 'Три звезды в каждой теме.' },
};
