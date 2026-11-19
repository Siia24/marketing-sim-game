# Откуда эти навыки

Папки рядом поставил `npx skills@latest add` с агентом `cursor`. Cursor читает их из `.agents/skills/`.

Репозиторий, коммит и хеш каждого навыка записаны в [`skills-lock.json`](../../skills-lock.json) в корне (поля `source`, `commit`, `computedHash`).

Лицензия репозитория Expo — MIT, текст в [`../licenses/expo-skills-LICENSE`](../licenses/expo-skills-LICENSE). У `expo-animation` в папке навыка лежит свой `LICENSE`.

У `vercel-labs/agent-skills` на записанном коммите нет файла `LICENSE`. README этого репозитория указывает MIT. В `vercel-react-native-skills/SKILL.md` стоит `license: MIT`.

Обновление из корня проекта:

```bash
npx skills@latest update -y
```
