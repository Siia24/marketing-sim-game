# marketing-sim-game

## Навыки для агентов

Навыки лежат в `.agents/skills/`. Эту папку Cursor подхватывает для проекта сам. Их поставил `npx skills@latest add` с агентом `cursor`. Репозиторий, коммит и хеш каждого навыка записаны в `skills-lock.json`.

### Expo

Все 25 навыков, которые CLI нашёл в [expo/skills](https://github.com/expo/skills) на коммите `88d9bd79f3fa8452a778fbac65bae162c0b32ce4`:

`eas-app-stores`, `eas-hosting`, `eas-observe`, `eas-simulator`, `eas-update`, `eas-update-insights`, `eas-workflows`, `expo-animation`, `expo-app-clip`, `expo-brownfield`, `expo-data-fetching`, `expo-design-system`, `expo-dev-client`, `expo-dom`, `expo-examples`, `expo-migrate-module`, `expo-module`, `expo-native-ui`, `expo-overview`, `expo-project-structure`, `expo-router`, `expo-skill-eval`, `expo-ui`, `expo-upgrade`, `expo-web-to-native`.

Лицензия MIT, текст в `.agents/licenses/expo-skills-LICENSE`. У `expo-animation` в папке навыка есть свой `LICENSE`.

### Vercel

Из [vercel-labs/agent-skills](https://github.com/vercel-labs/agent-skills) на коммите `1a2c79d4e6c4a2283dc2c614b6538cbe1ed5ca62` взяты три навыка: `deploy-to-vercel`, `web-design-guidelines` и `vercel-react-native-skills`. Папка `vercel-react-native-skills` в исходном репозитории называется `skills/react-native-skills`. README источника описывает этот набор как react-native-guidelines.

На этом коммите файла `LICENSE` в репозитории нет. README источника указывает MIT. В `SKILL.md` навыка `vercel-react-native-skills` стоит `license: MIT`.

### Как обновить

Из корня репозитория:

```bash
npx skills@latest update -y
```

Команда обновляет уже установленные навыки и `skills-lock.json`. В `.prettierignore` должна остаться строка `.agents`, чтобы Prettier не переписывал эти файлы.
