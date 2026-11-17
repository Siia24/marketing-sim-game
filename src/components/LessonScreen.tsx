import { Redirect, useRouter } from 'expo-router';
import { StyleSheet, Text, View } from 'react-native';
import { getLesson, getStep, lessonIndex } from '../content/lookup';
import type { Lesson, Speaker } from '../content/types';
import { allocationFeedback } from '../engine/allocate';
import type { Answer } from '../engine/attempt';
import { quizPath, reportPath, resumePath } from '../state/routes';
import { useCampaign } from '../state/ProgressContext';
import { AllocateEditor } from './AllocateEditor';
import { AssembleEditor } from './AssembleEditor';
import { BudgetBar } from './BudgetBar';
import { DataPanel } from './DataPanel';
import { FeedbackCard } from './FeedbackCard';
import { ModelNumbers } from './Numbers';
import { theme } from './theme';
import { Button, Muted, Screen, Title } from './ui';

export function LessonScreen({ campaignId, lessonId }: { campaignId: string; lessonId: string }) {
  const router = useRouter();
  const campaignApi = useCampaign(campaignId);
  const { ready, error, campaign, attempt, facts, result } = campaignApi;

  if (!ready) {
    return (
      <Screen>
        <Muted>Загрузка…</Muted>
      </Screen>
    );
  }
  if (!campaign || !facts || !attempt) {
    return (
      <Screen>
        <Title>Кампания не начата</Title>
        <Button label="На главную" onPress={() => router.replace('/')} />
      </Screen>
    );
  }
  if (attempt.cursor.lessonId !== lessonId) {
    return (
      <Screen>
        <Title>Сейчас другой шаг</Title>
        <Muted>Прогресс сохранён. Продолжение откроет то место, где вы остановились.</Muted>
        <Button
          label="Продолжить"
          onPress={() => router.replace(resumePath(campaign.id, attempt))}
        />
      </Screen>
    );
  }
  if (attempt.cursor.phase === 'quiz' || attempt.cursor.phase === 'quiz-feedback') {
    return <Redirect href={quizPath(campaign.id, lessonId)} />;
  }
  if (attempt.cursor.phase === 'report') {
    return <Redirect href={reportPath(campaign.id)} />;
  }

  const lesson = getLesson(campaign, lessonId);
  const phase = attempt.cursor.phase;
  const dataFirst = phase === 'step';

  return (
    <Screen>
      <Button label="К списку" variant="ghost" onPress={() => router.push('/')} />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Muted>
        Урок {lessonIndex(campaign, lesson.id) + 1} из {campaign.lessons.length} ·{' '}
        {lesson.estimatedMinutes} мин
      </Muted>
      <Title>{lesson.title}</Title>
      <Text style={styles.objective}>{lesson.objective}</Text>
      <Muted>
        По учебнику:{' '}
        {lesson.sources.map((source) => `гл. ${source.chapter} «${source.title}»`).join('; ')}
      </Muted>
      <BudgetBar facts={facts} />
      <Text style={styles.notice}>{lesson.numberNotice}</Text>
      {dataFirst ? (
        <DataPanel
          cards={lesson.data}
          facts={facts}
          result={result}
          onRequest={(cardId) => void campaignApi.revealCard(campaign, cardId)}
        />
      ) : null}
      {phase === 'situation' ? (
        <Situation
          lesson={lesson}
          onContinue={() => void campaignApi.nextFromSituation(campaign)}
        />
      ) : null}
      {phase === 'step' && attempt.cursor.stepId ? (
        <StepBody
          lesson={lesson}
          stepId={attempt.cursor.stepId}
          campaignApi={campaignApi}
          campaign={campaign}
          facts={facts}
          result={result}
        />
      ) : null}
      {phase === 'feedback' && attempt.cursor.stepId ? (
        <StepFeedback
          lesson={lesson}
          stepId={attempt.cursor.stepId}
          attemptAnswers={attempt.answers}
          segment={facts.segment}
          onContinue={() => void campaignApi.nextFromFeedback(campaign)}
        />
      ) : null}
      {phase === 'bridge' ? (
        <View style={styles.block}>
          <Text accessibilityRole="header" style={styles.section}>
            Урок пройден
          </Text>
          <Text style={styles.body}>{lesson.carryForward}</Text>
          <Button
            label="К квизу"
            testID="bridge-continue"
            onPress={() => {
              void campaignApi.nextFromBridge(campaign).then(() => {
                router.replace(quizPath(campaign.id, lesson.id));
              });
            }}
          />
        </View>
      ) : null}
      {!dataFirst && phase !== 'bridge' ? (
        <DataPanel
          cards={lesson.data}
          facts={facts}
          result={result}
          onRequest={(cardId) => void campaignApi.revealCard(campaign, cardId)}
        />
      ) : null}
    </Screen>
  );
}

function Situation({ lesson, onContinue }: { lesson: Lesson; onContinue: () => void }) {
  return (
    <View style={styles.block}>
      {lesson.situation.map((line) => (
        <Dialogue key={`${line.speaker}-${line.text}`} line={line} />
      ))}
      <Button label="К решению" onPress={onContinue} testID="situation-continue" />
    </View>
  );
}

function Dialogue({ line }: { line: Speaker }) {
  const narrator = line.speaker === 'Рассказчик';
  return (
    <View style={[styles.line, narrator ? styles.narrator : styles.speech]}>
      <Text style={styles.speaker}>{line.speaker}</Text>
      <Text style={styles.body}>{line.text}</Text>
    </View>
  );
}

function StepBody({
  lesson,
  stepId,
  campaign,
  facts,
  result,
  campaignApi,
}: {
  lesson: Lesson;
  stepId: string;
  campaign: NonNullable<ReturnType<typeof useCampaign>['campaign']>;
  facts: NonNullable<ReturnType<typeof useCampaign>['facts']>;
  result: ReturnType<typeof useCampaign>['result'];
  campaignApi: ReturnType<typeof useCampaign>;
}) {
  const step = getStep(lesson, stepId);
  if (step.type === 'choice') {
    return (
      <View style={styles.block}>
        <Text accessibilityRole="header" style={styles.section} testID="step-prompt">
          {step.prompt}
        </Text>
        {step.choices.map((choice) => (
          <Button
            key={choice.id}
            label={choice.label}
            variant="secondary"
            testID={`choice-${choice.id}`}
            onPress={() => void campaignApi.choose(campaign, choice.id)}
          />
        ))}
      </View>
    );
  }
  if (step.type === 'assemble') {
    const hook = facts.segment ? lesson.segmentHooks?.[facts.segment] : undefined;
    return (
      <AssembleEditor
        step={step}
        segmentHook={hook}
        onConfirm={(choiceId) => void campaignApi.choose(campaign, choiceId)}
      />
    );
  }
  if (step.type === 'allocate') {
    return (
      <AllocateEditor
        campaign={campaign}
        step={step}
        facts={facts}
        onConfirm={(input) => campaignApi.allocate(campaign, input)}
      />
    );
  }
  return (
    <View style={styles.block}>
      <Text accessibilityRole="header" style={styles.section} testID="step-prompt">
        {step.prompt}
      </Text>
      <Text style={styles.body}>{step.text}</Text>
      {result ? (
        <ModelNumbers result={result} assumptions={campaign.simulation.assumptions} />
      ) : null}
      <Button
        label="К итогу урока"
        testID="debrief-continue"
        onPress={() => void campaignApi.finishDebrief(campaign)}
      />
    </View>
  );
}

function StepFeedback({
  lesson,
  stepId,
  attemptAnswers,
  segment,
  onContinue,
}: {
  lesson: Lesson;
  stepId: string;
  attemptAnswers: Answer[];
  segment: string | null;
  onContinue: () => void;
}) {
  const step = getStep(lesson, stepId);
  const answer = [...attemptAnswers].reverse().find((item) => item.stepId === stepId);
  if (!answer) return null;
  const hasNext = lesson.steps.some((item, index, list) => list[index - 1]?.id === stepId);
  if (step.type === 'choice' || step.type === 'assemble') {
    const choice = step.choices.find((item) => item.id === answer.choiceId);
    if (!choice) return null;
    return (
      <FeedbackCard
        reply={choice.reply}
        paragraphs={[choice.feedback]}
        advance={choice.advance}
        continueLabel={continueLabel(choice.advance, hasNext)}
        onContinue={onContinue}
      />
    );
  }
  if (step.type === 'allocate' && answer.input) {
    return (
      <FeedbackCard
        paragraphs={allocationFeedback(step, answer.input, segment)}
        advance
        continueLabel={continueLabel(true, hasNext)}
        onContinue={onContinue}
      />
    );
  }
  return null;
}

function continueLabel(advance: boolean, hasNext: boolean): string {
  if (!advance) return 'Вернуться к вопросу';
  return hasNext ? 'Дальше' : 'К итогу урока';
}

const styles = StyleSheet.create({
  objective: { fontSize: 16, lineHeight: 24, color: theme.ink },
  notice: { fontSize: 13, lineHeight: 18, color: theme.muted },
  block: { gap: 10 },
  section: { fontSize: 20, lineHeight: 28, fontWeight: '700', color: theme.ink },
  body: { fontSize: 16, lineHeight: 24, color: theme.ink },
  line: { borderRadius: 12, padding: 12, gap: 4 },
  narrator: { backgroundColor: 'transparent' },
  speech: { backgroundColor: theme.card, borderWidth: 1, borderColor: theme.line },
  speaker: { fontSize: 13, fontWeight: '700', color: theme.muted },
  error: { color: theme.badInk },
});
