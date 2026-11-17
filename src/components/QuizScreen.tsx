import { Redirect, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { getLesson, lessonIndex } from '../content/lookup';
import { lessonPath, reportPath, resumePath } from '../state/routes';
import { useCampaign } from '../state/ProgressContext';
import { theme } from './theme';
import { Button, Muted, Screen, Title } from './ui';

export function QuizScreen({ campaignId, lessonId }: { campaignId: string; lessonId: string }) {
  const router = useRouter();
  const api = useCampaign(campaignId);
  const { ready, campaign, attempt } = api;

  if (!ready) {
    return (
      <Screen>
        <Muted>Загрузка…</Muted>
      </Screen>
    );
  }
  if (!campaign || !attempt) {
    return (
      <Screen>
        <Title>Квиз ещё не открыт</Title>
        <Button label="На главную" onPress={() => router.replace('/')} />
      </Screen>
    );
  }
  const cursor = attempt.cursor;
  if (
    cursor.lessonId !== lessonId ||
    (cursor.phase !== 'quiz' && cursor.phase !== 'quiz-feedback')
  ) {
    return <Redirect href={resumePath(campaign.id, attempt)} />;
  }

  const lesson = getLesson(campaign, lessonId);
  const index = cursor.questionIndex ?? 0;
  const question = lesson.quiz.questions[index];
  if (!question) {
    return (
      <Screen>
        <Muted>В квизе нет такого вопроса.</Muted>
      </Screen>
    );
  }
  const saved = [...attempt.quizAnswers].reverse().find((item) => item.questionId === question.id);
  const choice = saved ? question.choices.find((item) => item.id === saved.choiceId) : undefined;

  return (
    <Screen>
      <Button label="К списку" variant="ghost" onPress={() => router.push('/')} />
      <Muted>
        Урок {lessonIndex(campaign, lesson.id) + 1} · {lesson.quiz.title}
      </Muted>
      <Title>
        Вопрос {index + 1} из {lesson.quiz.questions.length}
      </Title>
      {index === 0 && cursor.phase === 'quiz' ? <Muted>{lesson.quiz.instruction}</Muted> : null}
      <Text accessibilityRole="header" style={styles.prompt} testID="quiz-prompt">
        {question.prompt}
      </Text>
      {question.sources?.length ? (
        <Muted>
          {question.sources.map((source) => `гл. ${source.chapter} «${source.title}»`).join('; ')}
        </Muted>
      ) : null}
      {cursor.phase === 'quiz'
        ? question.choices.map((item) => (
            <Button
              key={item.id}
              label={item.label}
              variant="secondary"
              testID={`quiz-choice-${item.id}`}
              onPress={() => void api.answerQuiz(campaign, item.id)}
            />
          ))
        : null}
      {cursor.phase === 'quiz-feedback' && choice && saved ? (
        <View
          accessibilityLiveRegion="polite"
          style={[styles.feedback, saved.correct ? styles.ok : styles.miss]}
        >
          <Text style={styles.kicker}>
            {saved.correct ? 'Верно' : 'Неверно. Можно продолжить.'}
          </Text>
          <Text style={styles.answer}>{choice.label}</Text>
          <Text style={styles.feedbackText}>{choice.feedback}</Text>
          <Button
            label={index + 1 < lesson.quiz.questions.length ? 'Дальше' : 'Закончить квиз'}
            testID="quiz-continue"
            onPress={() => {
              const last = index + 1 >= lesson.quiz.questions.length;
              const nextLesson = campaign.lessons[lessonIndex(campaign, lesson.id) + 1];
              void api.nextFromQuiz(campaign).then(() => {
                if (!last) return;
                if (nextLesson) router.replace(lessonPath(campaign.id, nextLesson.id));
                else router.replace(reportPath(campaign.id));
              });
            }}
          />
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  prompt: { fontSize: 20, lineHeight: 28, fontWeight: '700', color: theme.ink },
  feedback: { borderRadius: 14, padding: 16, gap: 10, borderWidth: 1 },
  ok: { backgroundColor: theme.okBg, borderColor: '#bbf7d0' },
  miss: { backgroundColor: theme.warnBg, borderColor: '#fed7aa' },
  kicker: { fontSize: 13, fontWeight: '700', color: theme.muted },
  answer: { fontSize: 16, lineHeight: 22, fontWeight: '600', color: theme.ink },
  feedbackText: { fontSize: 16, lineHeight: 24, color: theme.ink },
});
