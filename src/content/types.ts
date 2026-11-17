/** Типы повторяют форму campaign-coffee.json (schemaVersion 1), а не абстрактную схему «на вырост». */

export interface Speaker {
  speaker: string;
  text: string;
}

export interface ChapterRef {
  chapter: number;
  title: string;
  sections: string[];
  status?: 'read' | 'needs_check';
}

export interface Effects {
  set?: Record<string, string | number | boolean | null>;
  spend?: number;
  reveal?: string[];
  setFromInput?: string;
  calculate?: string;
  completeCampaign?: boolean;
}

export interface Choice {
  id: string;
  label: string;
  feedback: string;
  advance: boolean;
  effects: Effects;
  reply?: Speaker;
}

export interface ChoiceStep {
  id: string;
  type: 'choice';
  prompt: string;
  choices: Choice[];
}

export interface AssembleSlot {
  id: string;
  label: string;
  binding?: string;
}

export interface AssembleStep {
  id: string;
  type: 'assemble';
  prompt: string;
  choices: Choice[];
  slots: AssembleSlot[];
  assemblyMode: string;
  instruction: string;
}

export interface AllocateStep {
  id: string;
  type: 'allocate';
  prompt: string;
  input: {
    unitCost: number;
    channels: string[];
    integer: boolean;
    minUnits: number;
    maxUnitsByChannel: Record<string, number>;
    allowReserve: boolean;
    validate: string[];
  };
  feedbackRules: { when: string; text: string }[];
  effects: Effects;
  validationError: string;
}

export interface DebriefStep {
  id: string;
  type: 'debrief';
  prompt: string;
  binding: string;
  text: string;
  effects: Effects;
}

export type Step = ChoiceStep | AssembleStep | AllocateStep | DebriefStep;

export interface DataCard {
  id: string;
  title: string;
  text: string;
  requestLabel?: string;
  binding?: string;
}

export interface QuizChoice {
  id: string;
  label: string;
  correct: boolean;
  feedback: string;
}

export interface QuizQuestion {
  id: string;
  type: 'choice';
  prompt: string;
  sources?: ChapterRef[];
  choices: QuizChoice[];
}

export interface Quiz {
  id: string;
  title: string;
  instruction: string;
  questions: QuizQuestion[];
}

export interface Lesson {
  id: string;
  title: string;
  estimatedMinutes: number;
  objective: string;
  sources: ChapterRef[];
  situation: Speaker[];
  data: DataCard[];
  steps: Step[];
  quiz: Quiz;
  carryForward: string;
  numberNotice: string;
  segmentHooks?: Record<string, string>;
}

export interface ChannelParams {
  label: string;
  impressionsPerUnit: number;
  localShare: number;
  maxUnits: number;
}

export interface CreativeParams {
  ctr: number;
  paidConversion: number;
  contribution: number;
  price: number;
}

export interface SimulationParams {
  trueBaseline: number;
  capacityIncrement: number;
  unitCost: number;
  maxUnitsTotal: number;
  channels: Record<string, ChannelParams>;
  match: Record<string, Record<string, number>>;
  creative: Record<string, CreativeParams>;
  trackingCoverage: number;
  baselineCost: number;
  trackingCost: number;
  rounding: string;
  assumptions: string[];
}

export interface InitialState {
  budgetLimit: number;
  prepCost: number;
  spent: number;
  baselineEnabled: boolean;
  trackingEnabled: boolean;
  segment: string | null;
  creative: string | null;
  allocation: Record<string, number> | null;
  baselinePaidVisits: number | null;
  targetPaidVisits: number;
}

export interface CampaignSource {
  url: string;
  title: string;
  readScope: string;
  checkedOn: string;
}

export interface Campaign {
  schemaVersion: 1;
  contentVersion: string;
  simulationVersion: string;
  id: string;
  title: string;
  locale: string;
  numberNotice: string;
  source: CampaignSource;
  initialState: InitialState;
  simulation: SimulationParams;
  lessons: Lesson[];
}
