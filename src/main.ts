import * as Sentry from '@sentry/browser';
import { inject } from '@vercel/analytics';
import '@fontsource/dm-serif-display/400.css';
import '@fontsource/dm-serif-display/400-italic.css';
import '@fontsource/dm-sans/300.css';
import '@fontsource/dm-sans/400.css';
import '@fontsource/dm-sans/500.css';
import './styles.css';
import { api, getToken, type WallPost as ApiWallPost, type CallRecord } from './api';
import { connectSocket, disconnectSocket, send, on } from './socket';
import { startCall as startRtcCall, endCall as rtcEndCall, toggleMute } from './rtc';

Sentry.init({
  dsn: import.meta.env.VITE_SENTRY_DSN,
  environment: import.meta.env.MODE,
  enabled: import.meta.env.PROD,
  tracesSampleRate: 0.1,
});

inject();

type ScreenId =
  | 'splash'
  | 'onboarding-welcome'
  | 'onboarding-setup'
  | 'onboarding-confirm'
  | 'onboard-notif'
  | 'home-closed'
  | 'home-open'
  | 'confess-before-call'
  | 'calling'
  | 'connecting'
  | 'incall'
  | 'postcall'
  | 'postcall-options'
  | 'confession-reveal'
  | 'no-match'
  | 'no-internet'
  | 'wall'
  | 'history'
  | 'me'
  | 'privacy';

type NavTarget = 'tonight' | 'wall' | 'history' | 'me';
type ConfirmationKey = 'age' | 'privacy' | 'terms';
type IconName =
  | 'wifi'
  | 'battery'
  | 'phone'
  | 'phoneOff'
  | 'check'
  | 'moon'
  | 'message'
  | 'history'
  | 'user'
  | 'arrowRight'
  | 'star'
  | 'cloud'
  | 'flame'
  | 'droplet'
  | 'leaf'
  | 'eye'
  | 'wind'
  | 'snowflake'
  | 'sun'
  | 'chevronDown'
  | 'chevronRight'
  | 'clock'
  | 'userCheck'
  | 'shieldOff'
  | 'fileText'
  | 'trash'
  | 'bell'
  | 'lock'
  | 'edit';

type StaticWallPost = { quote: string; region: string; age: string };

type SavedCall = {
  id: string;
  startedAt: number;
  durationSecs: number;
  word: string | null;
};

type OnboardingState = {
  completed: boolean;
  avatar: IconName;
  alias: string;
  timezone: string;
  confirmations: Record<ConfirmationKey, boolean>;
};

type AppState = {
  activeScreen: ScreenId;
  onboarding: OnboardingState;
  savedWords: string[];
  savedCalls: SavedCall[];
  calls: number;
  passesLeft: number;
  wallCount: number;
  tier: 'free' | 'premium';
  notificationsEnabled: boolean;
};

const ICON_PATHS: Record<IconName, string> = {
  wifi: '<path d="M12 18l.01 0"/><path d="M9.172 15.172a4 4 0 0 1 5.656 0"/><path d="M6.343 12.343a8 8 0 0 1 11.314 0"/><path d="M3.515 9.515c4.686 -4.687 12.284 -4.687 16.97 0"/>',
  battery: '<path d="M6 7h11a2 2 0 0 1 2 2v1h1a1 1 0 0 1 1 1v2a1 1 0 0 1 -1 1h-1v1a2 2 0 0 1 -2 2h-11a2 2 0 0 1 -2 -2v-6a2 2 0 0 1 2 -2"/><path d="M8 10v4"/><path d="M11 10v4"/>',
  phone: '<path d="M5 4h4l2 5l-2.5 1.5a11 11 0 0 0 5 5l1.5 -2.5l5 2v4a2 2 0 0 1 -2 2a16 16 0 0 1 -15 -15a2 2 0 0 1 2 -2"/>',
  phoneOff: '<path d="M3 21l18 -18"/><path d="M5.831 14.161a15 15 0 0 1 -2.831 -8.161a2 2 0 0 1 2 -2h4l2 5l-2.5 1.5c.252 .503 .554 .977 .9 1.417"/><path d="M14.11 14.104a11 11 0 0 0 1.39 1.396l1.5 -2.5l5 2v4a2 2 0 0 1 -2 2a15 15 0 0 1 -8.157 -2.828"/>',
  check: '<path d="M5 12l5 5l10 -10"/>',
  moon: '<path d="M12 3c.132 0 .263 .003 .393 .009a7.5 7.5 0 0 0 7.598 10.598a9 9 0 1 1 -7.991 -10.607z"/>',
  message: '<path d="M8 9h8"/><path d="M8 13h6"/><path d="M12 20l-3 -3h-3a3 3 0 0 1 -3 -3v-6a3 3 0 0 1 3 -3h12a3 3 0 0 1 3 3v6a3 3 0 0 1 -3 3h-3l-3 3"/>',
  history: '<path d="M12 8v4l3 3"/><path d="M3.05 11a9 9 0 1 1 .5 4m-.5 4v-4h4"/>',
  user: '<path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0"/><path d="M6 21v-2a4 4 0 0 1 4 -4h4a4 4 0 0 1 4 4v2"/>',
  arrowRight: '<path d="M5 12h14"/><path d="M13 6l6 6l-6 6"/>',
  star: '<path d="M12 3l2.6 5.27l5.82 .85l-4.21 4.1l.99 5.78l-5.2 -2.73l-5.2 2.73l.99 -5.78l-4.21 -4.1l5.82 -.85z"/>',
  cloud: '<path d="M6 18h11a4 4 0 0 0 0 -8a5 5 0 0 0 -9.7 -1.7a4 4 0 0 0 -1.3 7.7"/>',
  flame: '<path d="M12 21c-3 0 -5 -2 -5 -5c0 -4 5 -7 5 -13c4 3 6 6 6 10a8 8 0 0 1 -6 8z"/>',
  droplet: '<path d="M12 3c3 4 6 7 6 11a6 6 0 0 1 -12 0c0 -4 3 -7 6 -11z"/>',
  leaf: '<path d="M5 21c8 -2 13 -7 14 -18c-8 1 -14 6 -16 14c2 -1 4 -1 6 0"/><path d="M9 17c1.5 -3 4 -5 8 -7"/>',
  eye: '<path d="M2 12s4 -7 10 -7s10 7 10 7s-4 7 -10 7s-10 -7 -10 -7"/><path d="M12 15a3 3 0 1 0 0 -6a3 3 0 0 0 0 6"/>',
  wind: '<path d="M4 8h10a3 3 0 1 0 -3 -3"/><path d="M4 12h15"/><path d="M4 16h10a3 3 0 1 1 -3 3"/>',
  snowflake: '<path d="M10 4l2 2l2 -2"/><path d="M10 20l2 -2l2 2"/><path d="M4 10l2 2l-2 2"/><path d="M20 10l-2 2l2 2"/><path d="M12 6v12"/><path d="M6 12h12"/><path d="M7.8 7.8l8.4 8.4"/><path d="M16.2 7.8l-8.4 8.4"/>',
  sun: '<path d="M12 12m-4 0a4 4 0 1 0 8 0a4 4 0 1 0 -8 0"/><path d="M3 12h1"/><path d="M20 12h1"/><path d="M12 3v1"/><path d="M12 20v1"/><path d="M5.6 5.6l.7 .7"/><path d="M17.7 17.7l.7 .7"/><path d="M18.4 5.6l-.7 .7"/><path d="M6.3 17.7l-.7 .7"/>',
  chevronDown: '<path d="M6 9l6 6l6 -6"/>',
  chevronRight: '<path d="M9 6l6 6l-6 6"/>',
  clock: '<path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/><path d="M12 7v5l3 3"/>',
  userCheck: '<path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0"/><path d="M6 21v-2a4 4 0 0 1 4 -4h3"/><path d="M15 19l2 2l4 -4"/>',
  shieldOff: '<path d="M12 3l7 4v5c0 2 -1 4 -2.7 5.7"/><path d="M14 20a11 11 0 0 1 -9 -10v-3l3.8 -2.2"/><path d="M3 3l18 18"/>',
  fileText: '<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"/><path d="M9 9h1"/><path d="M9 13h6"/><path d="M9 17h6"/>',
  trash: '<path d="M4 7h16"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2 -2l1 -12"/><path d="M9 7v-3h6v3"/>',
  bell: '<path d="M10 5a2 2 0 1 1 4 0a7 7 0 0 1 4 6v3a4 4 0 0 0 2 3h-16a4 4 0 0 0 2 -3v-3a7 7 0 0 1 4 -6"/><path d="M9 17v1a3 3 0 0 0 6 0v-1"/>',
  lock: '<path d="M12 13a1 1 0 1 0 2 0a1 1 0 0 0 -2 0"/><path d="M8 11v-4a4 4 0 0 1 8 0v4"/><rect x="5" y="11" width="14" height="10" rx="2"/>',
  edit: '<path d="M7 7h-1a2 2 0 0 0 -2 2v9a2 2 0 0 0 2 2h9a2 2 0 0 0 2 -2v-1"/><path d="M20.385 6.585a2.1 2.1 0 0 0 -2.97 -2.97l-8.415 8.385v3h3l8.385 -8.415z"/><path d="M16 5l3 3"/>',
};

const AVATARS: IconName[] = ['moon', 'star', 'cloud', 'flame', 'droplet', 'leaf', 'eye', 'wind', 'snowflake', 'sun'];
const LOCAL_STORAGE_KEY = 'nightcall:v2';
const CALL_DURATION_SECONDS = 600;
const INITIAL_REMAINING_SECONDS = 374;
const LINE_OPEN_HOUR = 2;
const LINE_OPEN_MINUTE = 0;
const LINE_CLOSE_HOUR = 2;
const LINE_CLOSE_MINUTE = 50;

const WALL_POSTS: StaticWallPost[] = [
  { quote: "I told a stranger I loved someone I've never admitted loving. Saying it out loud to nobody made it more real than anything.", region: 'Brazil', age: '2h ago' },
  { quote: "My word was 'lighter'. I didn't expect to mean it.", region: 'the UK', age: '4h ago' },
  { quote: "They said 'you're the first person I've told.' I'll carry that forever even though I'll never know their name.", region: 'Canada', age: '6h ago' },
  { quote: "I hung up after 3 minutes because I started crying. I don't know why I'm posting this. I guess I just want someone to know it happened.", region: 'India', age: '9h ago' },
  { quote: "Asked them what they'd do if they weren't afraid. They went silent for 45 seconds. Then said 'go home.'", region: 'Germany', age: '11h ago' },
];

const TIMEZONES = [
  { group: 'India', zones: [{ value: 'Asia/Kolkata', label: 'India — IST (UTC +5:30)' }] },
  { group: 'US & Canada', zones: [{ value: 'America/New_York', label: 'US Eastern — ET (UTC -5)' }, { value: 'America/Chicago', label: 'US Central — CT (UTC -6)' }, { value: 'America/Denver', label: 'US Mountain — MT (UTC -7)' }, { value: 'America/Los_Angeles', label: 'US Pacific — PT (UTC -8)' }] },
  { group: 'Europe', zones: [{ value: 'Europe/London', label: 'UK — GMT (UTC 0)' }, { value: 'Europe/Paris', label: 'Central Europe — CET (UTC +1)' }, { value: 'Europe/Moscow', label: 'Russia — MSK (UTC +3)' }] },
  { group: 'Asia', zones: [{ value: 'Asia/Dubai', label: 'UAE — GST (UTC +4)' }, { value: 'Asia/Singapore', label: 'Singapore — SGT (UTC +8)' }, { value: 'Asia/Tokyo', label: 'Japan — JST (UTC +9)' }, { value: 'Asia/Seoul', label: 'Korea — KST (UTC +9)' }] },
  { group: 'Australia & Pacific', zones: [{ value: 'Australia/Sydney', label: 'Sydney — AEST (UTC +10)' }, { value: 'Pacific/Auckland', label: 'New Zealand — NZST (UTC +12)' }] },
  { group: 'Latin America', zones: [{ value: 'America/Sao_Paulo', label: 'Brazil — BRT (UTC -3)' }, { value: 'America/Mexico_City', label: 'Mexico — CST (UTC -6)' }] },
];

const STREAK_TIERS = [
  { min: 0, label: 'New voice', color: '#4a4a60' },
  { min: 3, label: 'Night owl', color: '#6b6b80' },
  { min: 7, label: 'Midnight regular', color: '#7c6cfa' },
  { min: 14, label: 'Insomniac', color: '#a89de0' },
  { min: 30, label: 'Night wanderer', color: '#c4b8f0' },
  { min: 60, label: 'Phantom caller', color: '#f0c0e0' },
  { min: 100, label: 'NightCall legend', color: '#ffd700' },
];

const CONFESSION_QUESTIONS = [
  "What's something you've been carrying alone that you wish someone knew?",
  "What would you do if you weren't afraid?",
  "What's the last thing you almost said but didn't?",
  "What's something about yourself you've never told anyone?",
  "What's the one thing keeping you awake tonight?",
];

const WAIT_QUOTES = [
  '"Loneliness is not about being alone — it\'s about not being understood."',
  '"Some conversations only happen at 2am, and that\'s why they matter."',
  '"The best thing about a stranger is they don\'t know your story yet."',
  '"There is courage in calling at 2am. You recognized it."',
  '"Silence between two strangers is never empty."',
];

const WAIT_MESSAGES: Array<{ secs: number; msg: string; sub: string }> = [
  { secs: 0,   msg: 'Finding your stranger…',     sub: 'Somewhere in the world, someone is waiting too.' },
  { secs: 30,  msg: 'Still looking…',              sub: 'Good conversations are worth the wait.' },
  { secs: 60,  msg: 'Searching a little longer…', sub: 'The night is full of people who can\'t sleep.' },
  { secs: 90,  msg: 'Almost there…',               sub: 'They could be anywhere on Earth.' },
  { secs: 120, msg: 'Still here…',                 sub: 'Sometimes the right stranger takes time to find.' },
  { secs: 150, msg: 'Waiting with you…',           sub: 'You\'re not alone in this moment.' },
];

const CALL_HINTS = [
  '"The best NightCalls happen when you say the thing you\'ve never said out loud."',
  '"Your stranger won\'t remember your name. That\'s the point."',
  '"You have 10 minutes. Use them for something true."',
  '"Ask them what they\'d do if they weren\'t afraid."',
  '"Silence is okay. It means something too."',
];

function getStreakTier(streak: number): typeof STREAK_TIERS[number] {
  return [...STREAK_TIERS].reverse().find((t) => streak >= t.min) ?? STREAK_TIERS[0];
}

function icon(name: IconName, className = ''): string {
  const classes = ['icon', className].filter(Boolean).join(' ');
  return `<svg class="${classes}" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICON_PATHS[name]}</svg>`;
}

function defaultOnboarding(): OnboardingState {
  return {
    completed: false,
    avatar: 'moon',
    alias: '',
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'Asia/Kolkata',
    confirmations: { age: false, privacy: false, terms: false },
  };
}

function getTimePartsInZone(timezone: string): { h: number; m: number; s: number } {
  try {
    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: 'numeric',
      second: 'numeric',
      hour12: false,
    }).formatToParts(new Date());
    let h = parseInt(parts.find((p) => p.type === 'hour')!.value);
    if (h === 24) h = 0;
    const m = parseInt(parts.find((p) => p.type === 'minute')!.value);
    const s = parseInt(parts.find((p) => p.type === 'second')!.value);
    return { h, m, s };
  } catch {
    const now = new Date();
    return { h: now.getHours(), m: now.getMinutes(), s: now.getSeconds() };
  }
}

function isLineOpen(timezone: string): boolean {
  const { h, m } = getTimePartsInZone(timezone || 'Asia/Kolkata');
  return h === LINE_OPEN_HOUR && m < LINE_CLOSE_MINUTE;
}

function getSecondsUntilOpen(timezone: string): number {
  const { h, m, s } = getTimePartsInZone(timezone || 'Asia/Kolkata');
  const totalSecsNow = h * 3600 + m * 60 + s;
  const target = LINE_OPEN_HOUR * 3600 + LINE_OPEN_MINUTE * 60;
  return totalSecsNow < target ? target - totalSecsNow : 86400 - totalSecsNow + target;
}

function getSecondsUntilClose(timezone: string): number {
  const { h, m, s } = getTimePartsInZone(timezone || 'Asia/Kolkata');
  const totalSecsNow = h * 3600 + m * 60 + s;
  const closeAt = LINE_CLOSE_HOUR * 3600 + LINE_CLOSE_MINUTE * 60;
  return Math.max(0, closeAt - totalSecsNow);
}

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1_000));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function haptic(pattern: number | number[]): void {
  if ('vibrate' in navigator) navigator.vibrate(pattern);
}

class NightCallApp {
  private readonly root: HTMLElement;
  private state: AppState;
  private callRemainingSeconds = INITIAL_REMAINING_SECONDS;
  private callStartedAt = 0;
  private timerId: number | undefined;
  private clockTimerId: number | undefined;
  private toastTimerId: number | undefined;
  private splashTimerId: number | undefined;

  // Sprint 4 state
  private currentRoomId: string | undefined;
  private currentCallId: string | undefined;
  private isMuted = false;
  private socketBound = false;
  private currentPrompt = "What's something you've been carrying alone that you wish someone knew?";
  private apiWallPosts: ApiWallPost[] = [];
  private wallNextCursor: string | null = null;
  private pendingConfession: { question: string; answer: string } | null = null;
  private pendingConfessionQuestion = CONFESSION_QUESTIONS[0];
  private connectingTimerId: number | undefined;
  private userStreak = 0;
  private reportedUserId: string | undefined;

  // Sprint 4.6 state
  private waitTimerId: number | undefined;
  private waitElapsedSeconds = 0;
  private waitQuoteTimerId: number | undefined;
  private ambientCtx: AudioContext | undefined;
  private ambientGain: GainNode | undefined;
  private ambientOn = false;
  private hintTimerId: number | undefined;
  private wallFilter: 'all' | 'confessions' | 'words' = 'all';
  private likedPosts = new Set<string>();
  private stopParticlesFn: (() => void) | undefined;

  constructor(root: HTMLElement) {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js').catch(console.error);
    }
    this.root = root;
    this.state = this.loadState();
    this.render();
    this.bindEvents();
    this.updateClockAndWindow();
    this.updateTimerDisplay();
    this.clockTimerId = window.setInterval(() => this.updateClockAndWindow(), 1_000);
    document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
    window.addEventListener('offline', () => this.setScreen('no-internet'));
    window.addEventListener('online', () => {
      if (this.state.activeScreen === 'no-internet') this.setScreen(this.resolveHomeScreen());
    });
    void this.scheduleSplashTransition();
  }

  private loadState(): AppState {
    const defaultState: AppState = {
      activeScreen: 'splash',
      onboarding: defaultOnboarding(),
      savedWords: [],
      savedCalls: [],
      calls: 0,
      passesLeft: 2,
      wallCount: 0,
      tier: 'free',
      notificationsEnabled: false,
    };

    try {
      const saved = window.localStorage.getItem(LOCAL_STORAGE_KEY);
      if (!saved) return defaultState;
      const parsed = JSON.parse(saved) as Partial<AppState>;
      return {
        ...defaultState,
        ...parsed,
        activeScreen: 'splash',
        onboarding: {
          ...defaultOnboarding(),
          ...parsed.onboarding,
          confirmations: {
            ...defaultOnboarding().confirmations,
            ...parsed.onboarding?.confirmations,
          },
        },
        savedWords: Array.isArray(parsed.savedWords) ? parsed.savedWords.slice(0, 25) : defaultState.savedWords,
        savedCalls: Array.isArray(parsed.savedCalls) ? parsed.savedCalls.slice(0, 50) : defaultState.savedCalls,
        tier: parsed.tier ?? 'free',
        notificationsEnabled: parsed.notificationsEnabled ?? false,
      };
    } catch {
      return defaultState;
    }
  }

  private saveState(): void {
    window.localStorage.setItem(
      LOCAL_STORAGE_KEY,
      JSON.stringify({
        onboarding: this.state.onboarding,
        savedWords: this.state.savedWords,
        savedCalls: this.state.savedCalls,
        calls: this.state.calls,
        passesLeft: this.state.passesLeft,
        wallCount: this.state.wallCount,
        tier: this.state.tier,
        notificationsEnabled: this.state.notificationsEnabled,
      }),
    );
  }

  private render(): void {
    this.root.innerHTML = `
      <section class="wrap">
        <div class="phone" data-phone>
          <div class="toast" data-toast role="status" aria-live="polite">Connecting...</div>
          <div data-countdown-announce aria-live="polite" aria-atomic="true" style="position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)"></div>
          ${this.splashTemplate()}
          ${this.onboardingWelcomeTemplate()}
          ${this.onboardingSetupTemplate()}
          ${this.onboardingConfirmTemplate()}
          ${this.homeClosedTemplate()}
          ${this.homeOpenTemplate()}
          ${this.confessBeforeCallTemplate()}
          ${this.callingTemplate()}
          ${this.connectingTemplate()}
          ${this.inCallTemplate()}
          ${this.postCallTemplate()}
          ${this.confessionRevealTemplate()}
          ${this.postCallOptionsTemplate()}
          ${this.noMatchTemplate()}
          ${this.noInternetTemplate()}
          ${this.onboardNotifTemplate()}
          ${this.wallTemplate()}
          ${this.historyTemplate()}
          ${this.meTemplate()}
          ${this.privacyTemplate()}
          <div class="bottom-sheet" data-report-sheet role="dialog" aria-labelledby="report-sheet-title" aria-modal="true">
            <div class="sheet-handle"></div>
            <h3 class="sheet-title" id="report-sheet-title">Report this caller</h3>
            <div class="reason-list">
              <label class="reason-row"><input type="radio" name="reason" value="inappropriate" /> Inappropriate behavior</label>
              <label class="reason-row"><input type="radio" name="reason" value="harassment" /> Harassment</label>
              <label class="reason-row"><input type="radio" name="reason" value="hate_speech" /> Hate speech</label>
              <label class="reason-row"><input type="radio" name="reason" value="underage" /> Possibly underage</label>
              <label class="reason-row"><input type="radio" name="reason" value="other" /> Other</label>
            </div>
            <textarea class="confession-textarea" data-other-text placeholder="Describe what happened…" rows="3" maxlength="300" style="display:none"></textarea>
            <button class="post-btn" data-action="submit-report" type="button">Submit &amp; end call</button>
            <button class="wall-btn wall-btn--muted" data-action="close-report" type="button">Cancel</button>
          </div>
        </div>
      </section>
    `;
    this.setScreen(this.state.activeScreen, { skipPersistence: true });
    this.syncOnboardingControls();
  }

  private statusBarTemplate(): string {
    return `
      <div class="sbar">
        <span class="sbar-time" data-live-clock></span>
        <div class="sbar-icons" aria-hidden="true">${icon('wifi')}${icon('battery')}</div>
      </div>
    `;
  }

  private stepsTemplate(step: 1 | 2 | 3): string {
    return `
      <div class="steps" aria-label="Onboarding step ${step} of 3">
        ${[1, 2, 3].map((i) => `<div class="step ${i === step ? 'active' : ''}" aria-hidden="true"></div>`).join('')}
      </div>
    `;
  }

  private splashTemplate(): string {
    return `
      <section class="screen active" data-screen="splash" aria-labelledby="splash-title">
        <div class="splash-bg">
          <div class="splash-ring" style="animation:fade-in-up 0.6s ease 0s both">${icon('moon', 'splash-icon')}</div>
          <h1 class="splash-logo" id="splash-title" data-autofocus tabindex="-1" style="animation:fade-in-up 0.6s ease 0.15s both">Night<em>Call</em></h1>
          <p class="tagline" style="animation:fade-in-up 0.6s ease 0.3s both">10 minutes. One stranger. Then it's over.</p>
          <p class="splash-loading" style="animation:fade-in-up 0.6s ease 0.45s both">Loading…</p>
        </div>
      </section>
    `;
  }

  private onboardingWelcomeTemplate(): string {
    return `
      <section class="screen" data-screen="onboarding-welcome" aria-labelledby="welcome-title">
        ${this.statusBarTemplate()}
        ${this.stepsTemplate(1)}
        <div class="ob-scroll">
          <div class="ob-welcome-top" aria-hidden="true">
            <div class="moon-float">${icon('moon')}</div>
          </div>
          <h2 class="ob-title ob-title--large" id="welcome-title" data-autofocus tabindex="-1">The line opens<br />at 2 AM.</h2>
          <p class="ob-sub">Every night, for exactly 50 minutes. You get 10 minutes with a stranger. Then it's gone. So are they.</p>
          <div class="feature-cards-wrap">
            <div class="feature-cards" role="list">
              <div class="feature-card" role="listitem">
                <div class="fc-icon" aria-hidden="true">📞</div>
                <div class="fc-title">10 minutes</div>
                <div class="fc-body">One call. One stranger. No usernames to remember, no profiles to build.</div>
              </div>
              <div class="feature-card" role="listitem">
                <div class="fc-icon" aria-hidden="true">🎭</div>
                <div class="fc-title">Anonymous</div>
                <div class="fc-body">No real name. No photo. Just a voice in the dark. Be whoever you are tonight.</div>
              </div>
              <div class="feature-card" role="listitem">
                <div class="fc-icon" aria-hidden="true">🌙</div>
                <div class="fc-title">2 AM only</div>
                <div class="fc-body">The line opens for 50 minutes every night. When it closes, it's gone.</div>
              </div>
              <div class="feature-card" role="listitem">
                <div class="fc-icon" aria-hidden="true">🔒</div>
                <div class="fc-title">No recordings</div>
                <div class="fc-body">Your call is never recorded. We don't know who you are. That's intentional.</div>
              </div>
            </div>
            <div class="card-dots" aria-hidden="true">
              <div class="cdot active"></div>
              <div class="cdot"></div>
              <div class="cdot"></div>
              <div class="cdot"></div>
            </div>
          </div>
          <button class="ob-btn" data-action="welcome-next" type="button">Get started ${icon('arrowRight')}</button>
          <p class="fineprint">Free · Anonymous · No account required</p>
        </div>
      </section>
    `;
  }

  private onboardingSetupTemplate(): string {
    return `
      <section class="screen" data-screen="onboarding-setup" aria-labelledby="setup-title">
        ${this.statusBarTemplate()}
        ${this.stepsTemplate(2)}
        <div class="ob-scroll">
          <h2 class="ob-title" id="setup-title" data-autofocus tabindex="-1">Who are you tonight?</h2>
          <p class="ob-kicker">Pick an avatar and a name. No real info needed.</p>
          <div class="section-label">Your avatar</div>
          <div class="avatar-grid" role="radiogroup" aria-label="Choose avatar">
            ${AVATARS.map((avatar) => `
              <button class="ava ${avatar === this.state.onboarding.avatar ? 'sel' : ''}" data-avatar="${avatar}" role="radio" aria-checked="${avatar === this.state.onboarding.avatar}" type="button">
                ${icon(avatar)}
              </button>
            `).join('')}
          </div>
          <label class="section-label" for="alias-input">Your alias</label>
          <input class="nc-input" id="alias-input" data-alias-input placeholder="e.g. TwilightFox, SilentNorth…" maxlength="32" autocomplete="nickname" value="${this.escapeHtml(this.state.onboarding.alias)}" />
          <label class="section-label" for="tz-select">Your timezone</label>
          <div class="select-wrap">
            <select class="nc-select" id="tz-select" data-timezone-select>
              ${this.timezoneOptionsTemplate()}
            </select>
            ${icon('chevronDown')}
          </div>
          <div class="tz-note">${icon('clock')} Your 2:00 AM window is calculated from your local time. The line opens at the same moment for everyone in your zone.</div>
          <button class="ob-btn" data-action="setup-next" type="button">Next ${icon('arrowRight')}</button>
        </div>
      </section>
    `;
  }

  private timezoneOptionsTemplate(): string {
    const sel = this.state.onboarding.timezone;
    return `
      <option value="">Select your timezone…</option>
      ${TIMEZONES.map(({ group, zones }) => `
        <optgroup label="${group}">
          ${zones.map(({ value, label }) => `<option value="${value}" ${value === sel ? 'selected' : ''}>${label}</option>`).join('')}
        </optgroup>
      `).join('')}
    `;
  }

  private onboardingConfirmTemplate(): string {
    return `
      <section class="screen" data-screen="onboarding-confirm" aria-labelledby="confirm-title">
        ${this.statusBarTemplate()}
        ${this.stepsTemplate(3)}
        <div class="ob-scroll">
          <h2 class="ob-title" id="confirm-title" data-autofocus tabindex="-1">Before you enter.</h2>
          <p class="ob-kicker">Three things to confirm so everyone stays safe.</p>
          ${this.confirmationItemTemplate('age', 'userCheck', 'You are 18 or older', 'NightCall is for adults only. Anonymous late-night voice calls with strangers are not appropriate for minors.', 'I confirm I am 18 years of age or older')}
          ${this.confirmationItemTemplate('privacy', 'shieldOff', 'We are not responsible for what you share', 'NightCall is anonymous by design. We do not store your identity. Any personal information you choose to share verbally during a call is entirely your own responsibility. Do not share sensitive data like your address, passwords, or financial information.', 'I understand NightCall is not responsible for personal information I voluntarily share')}
          ${this.confirmationItemTemplate('terms', 'fileText', 'Terms & community rules', 'No harassment. No hate speech. No sharing private information of others. Violations result in a permanent ban. The community reporting system keeps this safe.', 'I accept the Terms of Service and Community Guidelines')}
          <button class="ob-btn" data-action="enter-nightcall" type="button" ${this.canEnterNightCall() ? '' : 'disabled'}>Enter NightCall ${icon('moon')}</button>
          <p class="fineprint">Your alias and avatar are the only things we store.</p>
        </div>
      </section>
    `;
  }

  private confirmationItemTemplate(key: ConfirmationKey, iconName: IconName, title: string, description: string, label: string): string {
    return `
      <article class="confirm-item">
        <div class="ci-header">
          <div class="ci-icon">${icon(iconName)}</div>
          <h3 class="ci-title">${title}</h3>
        </div>
        <div class="ci-body">
          <p class="ci-desc">${description}</p>
          <label class="ci-check">
            <input type="checkbox" data-confirmation="${key}" ${this.state.onboarding.confirmations[key] ? 'checked' : ''} />
            <span>${label}</span>
          </label>
        </div>
      </article>
    `;
  }

  private homeClosedTemplate(): string {
    return `
      <section class="screen" data-screen="home-closed" aria-labelledby="closed-title">
        ${this.statusBarTemplate()}
        <div class="scroll">
          <div class="nc-hero nc-hero--compact">
            <h1 class="nc-logo" id="closed-title" data-autofocus tabindex="-1">Night<span>Call</span></h1>
            <p class="nc-tagline">10 minutes. One stranger. Then it's over.</p>
          </div>
          <div class="nc-time-card">
            <div class="nc-time-label">Right now</div>
            <div class="nc-clock" data-main-clock>11:48</div>
            <div class="nc-clock-sub nc-clock-sub--muted">The line is closed</div>
            <div class="countdown-panel">
              <div class="countdown-label">Line opens in</div>
              <div class="countdown-time" data-open-countdown>2:12:07</div>
              <div class="countdown-sub">at 2:00 AM your local time</div>
            </div>
          </div>
          <button class="nc-call-btn nc-call-btn--closed" data-call-btn disabled type="button">
            <span class="btn-countdown-label">Line opens in</span>
            <span class="btn-countdown-time" data-call-btn-countdown>—</span>
          </button>
          ${this.statsTemplate('closed')}
          ${this.streakCardTemplate()}
          <article class="wall-item">
            <div class="quote-label">From The Wall · last night</div>
            <p class="wall-quote">"My word was 'lighter'. I didn't expect to mean it."</p>
            <div class="wall-meta"><span class="wall-dot" aria-hidden="true"></span>From somewhere in the UK <span class="wall-dot" aria-hidden="true"></span> 4h ago</div>
          </article>
        </div>
        ${this.bottomNavTemplate('tonight')}
      </section>
    `;
  }

  private homeOpenTemplate(): string {
    return `
      <section class="screen" data-screen="home-open" aria-labelledby="open-title">
        ${this.statusBarTemplate()}
        <div class="scroll">
          <div class="nc-hero nc-hero--compact">
            <h1 class="nc-logo" id="open-title" data-autofocus tabindex="-1">Night<span>Call</span></h1>
            <p class="nc-tagline">10 minutes. One stranger. Then it's over.</p>
          </div>
          <div class="nc-time-card">
            <div class="nc-time-label">Right now</div>
            <div class="nc-clock" data-main-clock>2:17</div>
            <div class="nc-clock-sub">The line is open</div>
            <div class="nc-window">
              <div class="nc-window-dot" aria-hidden="true"></div>
              <div class="nc-window-text"><strong>2,847 people</strong> are awake right now. One of them is about to talk to you.</div>
            </div>
            <div class="window-close-row">
              <div>Window closes</div>
              <strong data-close-countdown>33:00</strong>
            </div>
          </div>
          <button class="nc-call-btn" data-action="start-call" type="button">${icon('phone')} Call a Stranger</button>
          ${this.statsTemplate('open')}
          ${this.streakCardTemplate()}
          <article class="wall-item">
            <p class="wall-quote">"I told a stranger I loved someone I've never admitted loving. Saying it out loud made it more real than anything."</p>
            <div class="wall-meta"><span class="wall-dot" aria-hidden="true"></span>From somewhere in Brazil <span class="wall-dot" aria-hidden="true"></span> 2h ago</div>
          </article>
        </div>
        ${this.bottomNavTemplate('tonight')}
      </section>
    `;
  }

  private statsTemplate(mode: 'open' | 'closed'): string {
    const items = mode === 'open'
      ? [{ value: this.state.calls, label: 'My calls', stat: 'calls' }, { value: this.state.passesLeft, label: 'Passes left', stat: 'passes' }, { value: this.state.wallCount, label: 'On The Wall', stat: 'wall' }]
      : [{ value: 289, label: 'Awake now', stat: 'awake' }, { value: this.state.passesLeft + 1, label: 'My passes', stat: 'passes' }, { value: this.state.wallCount, label: 'Wall posts', stat: 'wall' }];
    return `
      <div class="nc-stats" aria-label="Tonight stats">
        ${items.map(({ value, label, stat }) => `<article class="nc-stat"><div class="nc-stat-num" data-stat="${stat}">${value}</div><div class="nc-stat-label">${label}</div></article>`).join('')}
      </div>
    `;
  }

  private callingTemplate(): string {
    return `
      <section class="screen" data-screen="calling" aria-labelledby="calling-title">
        ${this.statusBarTemplate()}
        <div class="waiting-room">
          <canvas data-particles style="position:absolute;inset:0;width:100%;height:100%;pointer-events:none;opacity:0.4" aria-hidden="true"></canvas>
          <div class="candle-wrap" aria-hidden="true">
            <svg class="candle-svg" viewBox="0 0 40 80">
              <line x1="20" y1="38" x2="20" y2="30" stroke="#888" stroke-width="1.5"/>
              <ellipse class="candle-glow" cx="20" cy="26" rx="14" ry="14"/>
              <path class="candle-flame" d="M20 14 C17 20 15 25 20 29 C25 25 23 20 20 14Z"/>
              <rect x="15" y="38" width="10" height="34" rx="2" fill="#c8a06e"/>
              <rect x="16" y="37" width="8" height="5" rx="1" fill="#b8905e"/>
            </svg>
          </div>
          <h2 class="wait-message" id="calling-title" data-wait-message data-autofocus tabindex="-1">Finding your stranger…</h2>
          <p class="wait-sub" data-wait-sub>Somewhere in the world, someone is waiting too.</p>
          <div class="wait-progress-wrap" aria-label="Search progress" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0">
            <div class="wait-progress-bar" data-wait-progress style="width:0%"></div>
          </div>
          <p class="wait-quote" data-wait-quote aria-live="polite"></p>
          <div class="wait-actions">
            <button class="icon-btn" data-action="toggle-ambient" type="button" aria-label="Toggle ambient sound" title="Ambient sound">
              <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
            </button>
            <button class="call-action-btn call-end" data-action="cancel-call" type="button" aria-label="Cancel call">${icon('phoneOff')}</button>
          </div>
          ${this.state.passesLeft > 0 ? `<button class="pass-link" data-action="use-pass" type="button">Skip this match — ${this.state.passesLeft} ${this.state.passesLeft === 1 ? 'pass' : 'passes'} left</button>` : ''}
        </div>
      </section>
    `;
  }

  private inCallTemplate(): string {
    const firstHint = CALL_HINTS[Math.floor(Math.random() * CALL_HINTS.length)];
    return `
      <section class="screen" data-screen="incall" aria-labelledby="incall-question">
        ${this.statusBarTemplate()}
        <div class="mute-banner ${this.isMuted ? 'visible' : ''}" data-mute-banner aria-live="assertive" aria-atomic="true">
          ${icon('phoneOff')} Microphone muted
        </div>
        <div class="incall-top">
          <h2 class="incall-qs" id="incall-question" data-autofocus tabindex="-1">"${this.escapeHtml(this.currentPrompt)}"</h2>
          <div class="timer-bar" aria-hidden="true"><div class="timer-fill" data-timer-fill></div></div>
          <div class="timer-text" data-timer-text aria-live="polite">6:14 remaining</div>
        </div>
        <div class="incall-scroll">
          <div class="incall-wave">
            <div class="wave-bars" aria-hidden="true">
              <div class="wave-bar"></div><div class="wave-bar"></div><div class="wave-bar"></div><div class="wave-bar"></div><div class="wave-bar"></div>
            </div>
            <div class="wave-label">Your stranger is speaking...</div>
          </div>
          <aside class="incall-hint" data-call-hint>${firstHint}</aside>
        </div>
        <button class="wall-btn wall-btn--muted" data-action="toggle-mute" type="button" aria-pressed="${this.isMuted}">${this.isMuted ? 'Unmute' : 'Mute'}</button>
        <button class="wall-btn wall-btn--muted" data-action="report-call" type="button">Report caller</button>
        <button class="incall-end" data-action="end-call" type="button">${icon('phoneOff')} End call</button>
      </section>
    `;
  }

  private postCallTemplate(): string {
    return `
      <section class="screen" data-screen="postcall" aria-labelledby="post-title">
        ${this.statusBarTemplate()}
        <div class="post-scroll">
          <div class="post-emoji" aria-hidden="true">🌌</div>
          <h2 class="post-title" id="post-title" data-autofocus tabindex="-1">It's over.</h2>
          <p class="post-sub">That conversation existed for exactly 10 minutes. You'll never speak to them again. That made it real.</p>
          <label class="word-card">
            <span class="word-label">One word. That's all you keep.</span>
            <input class="word-input" data-word-input placeholder="free..." maxlength="20" autocomplete="off" />
          </label>
          <button class="post-btn" data-action="save-word" type="button">Save my word</button>
          <button class="wall-btn" data-action="open-wall" type="button">Post something to The Wall</button>
          <button class="wall-btn wall-btn--muted" data-action="go-home" type="button">Go back to tonight</button>
        </div>
      </section>
    `;
  }

  private canPostConfession(): boolean {
    const last = localStorage.getItem('nc:lastConfession');
    if (!last) return true;
    return new Date(last).toDateString() !== new Date().toDateString();
  }

  private wallTemplate(): string {
    const filter = this.wallFilter;

    const apiPosts = this.apiWallPosts.filter((p) => {
      if (filter === 'words') return p.body.length <= 25;
      if (filter === 'confessions') return p.body.length > 25;
      return true;
    });

    const posts = apiPosts.length > 0
      ? apiPosts.map(({ id, body, country_vague, created_at }) => {
          const isWord = body.length <= 25;
          const typeLabel = isWord ? 'one word' : 'confession';
          const liked = this.likedPosts.has(id);
          return `
            <article class="wall-item">
              <p class="wall-quote">"${this.escapeHtml(body)}"</p>
              <div class="wall-meta"><span class="wall-dot" aria-hidden="true"></span>From ${this.escapeHtml(country_vague ?? 'somewhere in the world')} <span class="wall-dot" aria-hidden="true"></span> ${this.relativeTime(created_at)}</div>
              <div class="wi-footer">
                <span class="wi-type">${typeLabel}</span>
                <button class="heart-btn ${liked ? 'liked' : ''}" data-action="like-post" data-post-id="${id}" type="button" aria-label="${liked ? 'Unlike' : 'Like'} this post" aria-pressed="${liked}">${liked ? '♥' : '♡'}</button>
              </div>
            </article>
          `;
        }).join('')
      : (this.apiWallPosts.length === 0 ? WALL_POSTS.map(({ quote, region, age }) => `
          <article class="wall-item">
            <p class="wall-quote">"${quote}"</p>
            <div class="wall-meta"><span class="wall-dot" aria-hidden="true"></span>From somewhere in ${region} <span class="wall-dot" aria-hidden="true"></span> ${age}</div>
          </article>
        `).join('') : this.emptyState('🌙', 'Nothing here yet', 'No posts match this filter.'));

    const loadMore = this.wallNextCursor && filter === 'all'
      ? `<button class="wall-btn" data-action="load-more-wall" type="button">Load more</button>`
      : '';

    const hasToken = !!getToken();
    const canPost = hasToken && this.canPostConfession();
    const confessionBtn = hasToken
      ? `<button class="wall-btn${canPost ? '' : ' wall-btn--muted'}" data-action="add-confession" type="button"${canPost ? '' : ' disabled'}>
           ${canPost ? '+ Add your confession' : 'Confession posted tonight ✓'}
         </button>`
      : `<button class="wall-btn wall-btn--muted" data-action="add-confession" type="button">
           + Add your confession
         </button>`;

    const filterTabs = `
      <div class="wall-filters" role="tablist" aria-label="Filter posts">
        <button class="wf-tab ${filter === 'all' ? 'active' : ''}" data-filter="all" role="tab" aria-selected="${filter === 'all'}" type="button">All</button>
        <button class="wf-tab ${filter === 'confessions' ? 'active' : ''}" data-filter="confessions" role="tab" aria-selected="${filter === 'confessions'}" type="button">Confessions</button>
        <button class="wf-tab ${filter === 'words' ? 'active' : ''}" data-filter="words" role="tab" aria-selected="${filter === 'words'}" type="button">One Words</button>
      </div>
    `;

    return `
      <section class="screen" data-screen="wall" aria-labelledby="wall-title">
        ${this.statusBarTemplate()}
        <div class="wall-head">
          <h2 class="wall-title" id="wall-title" data-autofocus tabindex="-1">The Wall</h2>
          <p class="wall-subtitle">Things people wish they'd said. Anonymous. Forever.</p>
          ${confessionBtn}
          ${filterTabs}
        </div>
        <div class="scroll">${posts}${loadMore}</div>
        ${this.bottomNavTemplate('wall')}
      </section>
    `;
  }

  private historyTemplate(): string {
    const timezone = this.state.onboarding.timezone || 'Asia/Kolkata';
    const words = this.state.savedWords;
    const calls = this.state.savedCalls;

    const wordCloud = words.length > 0 ? `
      <div class="word-cloud" aria-label="Your saved words">
        ${words.map((w) => `<span class="word-pill">${this.escapeHtml(w)}</span>`).join('')}
      </div>
    ` : '';

    const callItems = calls.length === 0
      ? this.emptyState('🌙', 'No calls yet', 'Your first call is tonight. The line opens at 2 AM.', { label: 'Go to tonight', action: 'go-home' })
      : calls.map((call) => {
          const dateStr = new Intl.DateTimeFormat('en-US', {
            timeZone: timezone,
            month: 'short',
            day: 'numeric',
            hour: 'numeric',
            minute: '2-digit',
            hour12: true,
          }).format(new Date(call.startedAt));
          const mins = Math.floor(call.durationSecs / 60);
          const secs = call.durationSecs % 60;
          return `
            <article class="call-record">
              <div class="call-record-top">
                <span class="call-record-date">${dateStr}</span>
                <span class="call-record-duration">${mins}:${String(secs).padStart(2, '0')}</span>
              </div>
              ${call.word
                ? `<div class="call-record-word">${this.escapeHtml(call.word)}</div>`
                : `<div class="call-record-word call-record-word--none">No word saved</div>`}
            </article>
          `;
        }).join('');

    return `
      <section class="screen" data-screen="history" aria-labelledby="history-title">
        ${this.statusBarTemplate()}
        <div class="wall-head">
          <h2 class="wall-title" id="history-title" data-autofocus tabindex="-1">Your Calls</h2>
          <p class="wall-subtitle">Anonymous memories, kept locally.</p>
        </div>
        ${wordCloud}
        <div class="scroll">${callItems}</div>
        ${this.bottomNavTemplate('history')}
      </section>
    `;
  }

  private meTemplate(): string {
    const { avatar, alias, timezone } = this.state.onboarding;
    const totalMins = Math.floor(this.state.savedCalls.reduce((sum, c) => sum + c.durationSecs, 0) / 60);
    const tzLabel = TIMEZONES.flatMap((g) => g.zones).find((z) => z.value === timezone)?.label ?? timezone;
    const notifStatus = this.state.notificationsEnabled ? 'On' : 'Off';

    return `
      <section class="screen" data-screen="me" aria-labelledby="me-title">
        ${this.statusBarTemplate()}
        <div class="me-scroll">
          <div class="me-profile">
            <div class="me-avatar">${icon(avatar)}</div>
            <h2 class="me-alias" id="me-title" data-autofocus tabindex="-1">${this.escapeHtml(alias || 'Anonymous')}</h2>
            <div class="me-tier">${this.state.tier === 'premium' ? 'Premium' : 'Free'}</div>
          </div>
          <div class="me-stats">
            <article class="me-stat"><div class="me-stat-num">${this.state.calls}</div><div class="me-stat-label">Calls</div></article>
            <article class="me-stat"><div class="me-stat-num">${totalMins}</div><div class="me-stat-label">Minutes</div></article>
            <article class="me-stat"><div class="me-stat-num">${this.state.savedWords.length}</div><div class="me-stat-label">Words</div></article>
          </div>
          ${this.state.tier === 'free' ? `
            <div class="upgrade-banner">
              <div class="upgrade-banner-title">Go Premium</div>
              <div class="upgrade-banner-sub">5 calls/night · unlimited passes · custom avatars · streak badges · full history</div>
              <button class="upgrade-btn" data-action="upgrade" type="button">Go Premium →</button>
            </div>
          ` : ''}
          <div class="settings-section">
            <button class="settings-row" data-action="edit-timezone" type="button">
              <span class="settings-row-label">Timezone</span>
              <span class="settings-row-right"><span class="settings-row-value">${this.escapeHtml(tzLabel)}</span><span class="settings-row-chevron">›</span></span>
            </button>
            <button class="settings-row" data-action="toggle-notifications" type="button">
              <span class="settings-row-label">Notifications</span>
              <span class="settings-row-right"><span class="settings-row-value" data-notif-value>${notifStatus}</span><span class="settings-row-chevron">›</span></span>
            </button>
            <button class="settings-row" data-action="edit-alias" type="button">
              <span class="settings-row-label">Change alias</span>
              <span class="settings-row-chevron">›</span>
            </button>
            <button class="settings-row" data-action="open-privacy" type="button">
              <span class="settings-row-label">Privacy &amp; data</span>
              <span class="settings-row-chevron">›</span>
            </button>
            <button class="settings-row" data-action="delete-account" type="button">
              <span class="settings-row-label settings-row-label--danger">Delete account</span>
              <span class="settings-row-chevron">›</span>
            </button>
          </div>
        </div>
        ${this.bottomNavTemplate('me')}
      </section>
    `;
  }

  private privacyTemplate(): string {
    return `
      <section class="screen" data-screen="privacy" aria-labelledby="privacy-title">
        ${this.statusBarTemplate()}
        <div class="wall-head">
          <button class="back-btn" data-action="back-to-me" type="button">← Back</button>
          <h2 class="wall-title" id="privacy-title" data-autofocus tabindex="-1">Privacy &amp; Data</h2>
        </div>
        <div class="privacy-scroll">
          <div class="privacy-section">
            <div class="privacy-section-title">What we store</div>
            <div class="privacy-section-body"><ul>
              <li>Your alias and avatar (locally on this device only)</li>
              <li>Your selected timezone</li>
              <li>Words you choose to save after calls</li>
              <li>Your call history (locally on this device only)</li>
            </ul></div>
          </div>
          <div class="privacy-section">
            <div class="privacy-section-title">What we do NOT store</div>
            <div class="privacy-section-body"><ul>
              <li>Voice audio — calls are never recorded</li>
              <li>Your real identity or name</li>
              <li>Your exact location</li>
              <li>Any information shared verbally during calls</li>
            </ul></div>
          </div>
          <div class="privacy-section">
            <div class="privacy-section-title">How to delete your data</div>
            <div class="privacy-section-body">Use "Delete account" in the Me tab settings. This removes all locally stored data from this device immediately and cannot be undone.</div>
          </div>
          <div class="privacy-section">
            <div class="privacy-section-title">Contact</div>
            <div class="privacy-section-body">nightcall-privacy@nightcall.app</div>
          </div>
        </div>
      </section>
    `;
  }

  private bottomNavTemplate(active: NavTarget): string {
    const navItems: Array<{ target: NavTarget; icon: IconName; label: string; aria: string }> = [
      { target: 'tonight', icon: 'moon', label: 'Tonight', aria: 'Tonight' },
      { target: 'wall', icon: 'message', label: 'The Wall', aria: 'Wall' },
      { target: 'history', icon: 'history', label: 'History', aria: 'History' },
      { target: 'me', icon: 'user', label: 'Me', aria: 'Me' },
    ];
    return `
      <nav class="bnav" aria-label="Primary navigation">
        ${navItems.map((item) => `
          <button class="bnav-item ${active === item.target ? 'active' : ''}" data-nav="${item.target}" type="button" aria-label="${item.aria}" ${active === item.target ? 'aria-current="page"' : ''}>
            ${icon(item.icon)}${item.label}
          </button>
        `).join('')}
      </nav>
    `;
  }

  private confessBeforeCallTemplate(): string {
    return `
      <section class="screen" data-screen="confess-before-call" aria-labelledby="confess-title">
        ${this.statusBarTemplate()}
        <div class="confession-sheet">
          <div class="confession-header">
            <h2 class="confession-title" id="confess-title" data-autofocus tabindex="-1">Before the call</h2>
            <p class="confession-sub">One honest thing. Anonymous. Gone after tonight.</p>
          </div>
          <p class="confession-q">"${this.escapeHtml(this.pendingConfessionQuestion)}"</p>
          <div class="confession-input-wrap">
            <textarea class="confession-textarea" data-confession-input placeholder="Say it here…" maxlength="140" rows="4"></textarea>
            <div class="char-counter"><span data-char-count>0</span>/140</div>
          </div>
          <div class="confession-actions">
            <button class="ob-btn" data-action="start-call-with-confession" type="button" disabled data-confession-submit>Continue to call</button>
            <button class="wall-btn wall-btn--muted" data-action="skip-confession" type="button">Skip this →</button>
          </div>
        </div>
      </section>
    `;
  }

  private connectingTemplate(): string {
    return `
      <section class="screen" data-screen="connecting" aria-labelledby="connecting-title">
        <div class="connecting-screen">
          <div class="connecting-rings" aria-hidden="true">
            <div class="ring-2"></div>
            <div class="ring-1"></div>
            <div class="connecting-emoji">🌙</div>
          </div>
          <div class="connecting-label">CONNECTED</div>
          <h2 class="connecting-title" id="connecting-title" data-autofocus tabindex="-1">Your stranger is on the line.</h2>
        </div>
      </section>
    `;
  }

  private confessionRevealTemplate(): string {
    const pc = this.pendingConfession;
    return `
      <section class="screen" data-screen="confession-reveal" aria-labelledby="reveal-title">
        ${this.statusBarTemplate()}
        <div class="reveal-scroll">
          <h2 class="reveal-title" id="reveal-title" data-autofocus tabindex="-1">What you both carried.</h2>
          <p class="reveal-sub">Anonymous. Gone after tonight.</p>
          <div class="reveal-cards">
            <article class="reveal-card reveal-card--theirs">
              <div class="reveal-card-label">Their confession</div>
              ${pc ? `<p class="reveal-card-q">"${this.escapeHtml(pc.question)}"</p>` : ''}
              <p class="reveal-card-answer">…</p>
            </article>
            <article class="reveal-card reveal-card--mine">
              <div class="reveal-card-label">Yours</div>
              ${pc ? `<p class="reveal-card-q">"${this.escapeHtml(pc.question)}"</p>` : ''}
              <p class="reveal-card-answer">${pc?.answer ? `"${this.escapeHtml(pc.answer)}"` : '(skipped)'}</p>
            </article>
          </div>
          ${pc?.answer ? `<button class="wall-btn" data-action="share-confession-to-wall" type="button">Share to The Wall</button>` : ''}
          <button class="post-btn" data-action="close-confession-reveal" type="button">Continue →</button>
        </div>
      </section>
    `;
  }

  private streakCardTemplate(): string {
    const streak = this.userStreak;
    let tier = STREAK_TIERS[0];
    let tierIdx = 0;
    for (let i = 0; i < STREAK_TIERS.length; i++) {
      if (streak >= STREAK_TIERS[i].min) { tier = STREAK_TIERS[i]; tierIdx = i; }
    }
    const nextTier = STREAK_TIERS[tierIdx + 1];
    const progressPct = nextTier
      ? Math.min(100, Math.round(((streak - tier.min) / (nextTier.min - tier.min)) * 100))
      : 100;
    return `
      <div class="streak-card">
        <div class="streak-left">
          <div class="streak-count">${streak}</div>
          <div class="streak-label">night${streak !== 1 ? 's' : ''}</div>
        </div>
        <div class="streak-right">
          <div class="streak-badge" style="color:${tier.color}">${tier.label}</div>
          <div class="streak-progress-bar"><div class="streak-fill" style="width:${progressPct}%;background:${tier.color}"></div></div>
          ${nextTier ? `<div class="streak-next">${nextTier.min - streak} more to ${nextTier.label}</div>` : '<div class="streak-next">Maximum tier reached</div>'}
        </div>
      </div>
    `;
  }

  private emptyState(emojiIcon: string, title: string, body: string, cta?: { label: string; action: string }): string {
    return `
      <div class="empty-state">
        <div class="empty-icon">${emojiIcon}</div>
        <div class="empty-title">${title}</div>
        <div class="empty-body">${body}</div>
        ${cta ? `<button class="empty-cta" data-action="${cta.action}" type="button">${cta.label}</button>` : ''}
      </div>
    `;
  }

  private postCallOptionsTemplate(): string {
    return `
      <section class="screen" data-screen="postcall-options" aria-labelledby="pco-title">
        ${this.statusBarTemplate()}
        <div class="post-scroll">
          <div class="post-emoji" aria-hidden="true">🌌</div>
          <h2 class="post-title" id="pco-title" data-autofocus tabindex="-1">It's over.</h2>
          <p class="post-sub">That conversation existed for exactly 10 minutes. You'll never speak to them again. That made it real.</p>
          <button class="option-card" data-action="go-to-postcall" type="button">
            <div class="oc-icon" aria-hidden="true">✨</div>
            <div>
              <div class="oc-title">Save your word</div>
              <div class="oc-sub">One word to remember this call by.</div>
            </div>
            <div class="oc-chev" aria-hidden="true">›</div>
          </button>
          <button class="option-card" data-action="add-confession" type="button">
            <div class="oc-icon" aria-hidden="true">📝</div>
            <div>
              <div class="oc-title">Write to The Wall</div>
              <div class="oc-sub">Share something. Anonymous. Forever.</div>
            </div>
            <div class="oc-chev" aria-hidden="true">›</div>
          </button>
          <button class="option-card" data-action="retry-call" type="button">
            <div class="oc-icon" aria-hidden="true">📞</div>
            <div>
              <div class="oc-title">Call again tonight</div>
              <div class="oc-sub">If you still have calls left.</div>
            </div>
            <div class="oc-chev" aria-hidden="true">›</div>
          </button>
          <button class="postcall-never" data-action="go-home" type="button">I'm done for tonight →</button>
        </div>
      </section>
    `;
  }

  private noMatchTemplate(): string {
    return `
      <section class="screen" data-screen="no-match" aria-labelledby="no-match-title">
        ${this.statusBarTemplate()}
        <div class="no-match-screen">
          <div aria-hidden="true" style="font-size:3rem;margin-bottom:1rem">🌑</div>
          <h2 id="no-match-title" data-autofocus tabindex="-1" style="font-size:1.4rem;margin-bottom:0.5rem">No match tonight.</h2>
          <p style="color:var(--text-muted);margin-bottom:2rem;text-align:center">The line was quiet. Sometimes the universe has other plans.</p>
          <button class="ob-btn" data-action="retry-call" type="button">Try again ${icon('phone')}</button>
          <button class="wall-btn wall-btn--muted" data-action="go-home" type="button" style="margin-top:0.75rem">Go home</button>
        </div>
      </section>
    `;
  }

  private noInternetTemplate(): string {
    return `
      <section class="screen" data-screen="no-internet" aria-labelledby="no-internet-title">
        ${this.statusBarTemplate()}
        <div class="no-match-screen">
          <div aria-hidden="true" style="font-size:3rem;margin-bottom:1rem">📡</div>
          <h2 id="no-internet-title" data-autofocus tabindex="-1" style="font-size:1.4rem;margin-bottom:0.5rem">No connection.</h2>
          <p style="color:var(--text-muted);margin-bottom:2rem;text-align:center">Check your internet and try again. NightCall needs a connection to work.</p>
          <button class="ob-btn" data-action="go-home" type="button">Try again</button>
        </div>
      </section>
    `;
  }

  private onboardNotifTemplate(): string {
    return `
      <section class="screen" data-screen="onboard-notif" aria-labelledby="notif-title">
        ${this.statusBarTemplate()}
        <div class="notif-screen ob-scroll">
          <div class="notif-icon" aria-hidden="true">${icon('bell')}</div>
          <h2 class="ob-title" id="notif-title" data-autofocus tabindex="-1">Don't miss the 2 AM window</h2>
          <p class="ob-sub">We'll send you a nudge at 1:55 AM each night — just before the line opens. Nothing else. Ever.</p>
          <button class="ob-btn" data-action="enable-notif" type="button">${icon('bell')} Allow notifications</button>
          <button class="ob-btn-outline" data-action="skip-notif" type="button">Not now</button>
        </div>
      </section>
    `;
  }

  private showReportSheet(): void {
    const sheet = this.root.querySelector<HTMLElement>('[data-report-sheet]');
    if (sheet) sheet.classList.add('open');
  }

  private closeReportSheet(): void {
    const sheet = this.root.querySelector<HTMLElement>('[data-report-sheet]');
    if (sheet) sheet.classList.remove('open');
  }

  private async submitReport(): Promise<void> {
    const sheet = this.root.querySelector<HTMLElement>('[data-report-sheet]');
    if (!sheet) return;
    const checked = sheet.querySelector<HTMLInputElement>('input[name="reason"]:checked');
    if (!checked) { this.showToast('Select a reason first'); return; }
    const reason = checked.value;
    const otherText = (sheet.querySelector<HTMLTextAreaElement>('[data-other-text]')?.value ?? '').trim();
    const finalReason = reason === 'other' && otherText ? `other: ${otherText}` : reason;
    const reportedId = this.reportedUserId ?? 'unknown';
    const callId = this.currentCallId ?? this.currentRoomId ?? 'unknown';
    try {
      await api.reports.send(reportedId, callId, finalReason);
    } catch { /* ignore — report is best-effort */ }
    this.closeReportSheet();
    if (this.currentRoomId) {
      send('queue:leave');
      void api.calls.end(this.currentRoomId);
    }
    this.endCall();
  }

  private startWaitingRoom(): void {
    this.waitElapsedSeconds = 0;
    this.stopWaitingRoom();

    // Progress bar + message rotation (1s tick)
    this.waitTimerId = window.setInterval(() => {
      this.waitElapsedSeconds += 1;
      const pct = Math.min(100, Math.round((this.waitElapsedSeconds / 180) * 100));

      const bar = this.root.querySelector<HTMLElement>('[data-wait-progress]');
      if (bar) {
        bar.style.width = `${pct}%`;
        bar.closest('[role="progressbar"]')?.setAttribute('aria-valuenow', String(pct));
      }

      const msgs = WAIT_MESSAGES.filter((m) => m.secs <= this.waitElapsedSeconds);
      const current = msgs[msgs.length - 1];
      if (current) {
        const msgEl = this.root.querySelector<HTMLElement>('[data-wait-message]');
        const subEl = this.root.querySelector<HTMLElement>('[data-wait-sub]');
        if (msgEl && msgEl.textContent !== current.msg) msgEl.textContent = current.msg;
        if (subEl && subEl.textContent !== current.sub) subEl.textContent = current.sub;
      }

      if (this.waitElapsedSeconds >= 180) {
        this.stopWaitingRoom();
        send('queue:leave');
        this.setScreen('no-match');
      }
    }, 1_000);

    // Rotate quotes every 8s
    let quoteIdx = 0;
    const rotateQuote = () => {
      const quoteEl = this.root.querySelector<HTMLElement>('[data-wait-quote]');
      if (quoteEl) {
        quoteEl.style.opacity = '0';
        window.setTimeout(() => {
          quoteEl.textContent = WAIT_QUOTES[quoteIdx % WAIT_QUOTES.length];
          quoteEl.style.opacity = '1';
        }, 300);
      }
      quoteIdx++;
    };
    window.setTimeout(rotateQuote, 1_000); // show first quote after 1s delay
    this.waitQuoteTimerId = window.setInterval(rotateQuote, 8_000);

    this.startParticles();
  }

  private stopWaitingRoom(): void {
    if (this.waitTimerId !== undefined) { window.clearInterval(this.waitTimerId); this.waitTimerId = undefined; }
    if (this.waitQuoteTimerId !== undefined) { window.clearInterval(this.waitQuoteTimerId); this.waitQuoteTimerId = undefined; }
    this.stopAmbientAudio();
    if (this.stopParticlesFn) { this.stopParticlesFn(); this.stopParticlesFn = undefined; }
  }

  private startParticles(): void {
    const canvas = this.root.querySelector<HTMLCanvasElement>('[data-particles]');
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => {
      canvas.width = canvas.offsetWidth || canvas.parentElement?.offsetWidth || 300;
      canvas.height = canvas.offsetHeight || canvas.parentElement?.offsetHeight || 500;
    };
    resize();

    type Particle = { x: number; y: number; r: number; speed: number; opacity: number };
    const particles: Particle[] = Array.from({ length: 25 }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      r: Math.random() * 1.5 + 0.5,
      speed: Math.random() * 0.25 + 0.1,
      opacity: Math.random() * 0.5 + 0.2,
    }));

    let running = true;
    const draw = () => {
      if (!running) return;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      for (const p of particles) {
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(200,180,255,${p.opacity})`;
        ctx.fill();
        p.y -= p.speed;
        if (p.y < -5) { p.y = canvas.height + 5; p.x = Math.random() * canvas.width; }
      }
      requestAnimationFrame(draw);
    };
    draw();

    this.stopParticlesFn = () => { running = false; };
  }

  private startAmbientAudio(): void {
    try {
      if (this.ambientCtx) return;
      this.ambientCtx = new AudioContext();
      this.ambientGain = this.ambientCtx.createGain();
      this.ambientGain.gain.value = 0;
      this.ambientGain.connect(this.ambientCtx.destination);

      const rate = this.ambientCtx.sampleRate;
      const buffer = this.ambientCtx.createBuffer(1, rate * 2, rate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < data.length; i++) data[i] = (Math.random() * 2 - 1) * 0.04;

      const source = this.ambientCtx.createBufferSource();
      source.buffer = buffer;
      source.loop = true;

      const filter = this.ambientCtx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 400;

      source.connect(filter);
      filter.connect(this.ambientGain);
      source.start();

      this.ambientGain.gain.setTargetAtTime(0.25, this.ambientCtx.currentTime, 0.8);
      this.ambientOn = true;
    } catch { /* AudioContext not supported */ }
  }

  private stopAmbientAudio(): void {
    if (this.ambientCtx) {
      this.ambientCtx.close().catch(() => {});
      this.ambientCtx = undefined;
      this.ambientGain = undefined;
      this.ambientOn = false;
    }
  }

  private toggleAmbient(): void {
    if (this.ambientOn) {
      this.stopAmbientAudio();
      this.showToast('Ambient sound off');
    } else {
      this.startAmbientAudio();
      this.showToast('Ambient sound on');
    }
  }

  private filterWall(filter: 'all' | 'confessions' | 'words'): void {
    this.wallFilter = filter;
    if (this.state.activeScreen === 'wall') this.setScreen('wall', { skipPersistence: true });
  }

  private likePost(postId: string): void {
    const wasLiked = this.likedPosts.has(postId);
    if (wasLiked) {
      this.likedPosts.delete(postId);
    } else {
      this.likedPosts.add(postId);
      haptic(20);
    }
    const btn = this.root.querySelector<HTMLButtonElement>(`[data-post-id="${postId}"]`);
    if (btn) {
      const liked = this.likedPosts.has(postId);
      btn.classList.toggle('liked', liked);
      btn.textContent = liked ? '♥' : '♡';
      btn.setAttribute('aria-pressed', String(liked));
      btn.setAttribute('aria-label', `${liked ? 'Unlike' : 'Like'} this post`);
    }
  }

  private bindEvents(): void {
    this.root.addEventListener('click', (event) => {
      const button = (event.target as HTMLElement).closest<HTMLButtonElement>('button');
      if (!button) return;

      const action = button.dataset.action;
      const navTarget = button.dataset.nav as NavTarget | undefined;
      const avatar = button.dataset.avatar as IconName | undefined;

      if (avatar) this.selectAvatar(avatar);
      if (navTarget === 'tonight') this.setScreen(this.resolveHomeScreen());
      if (navTarget === 'wall') { this.setScreen('wall'); void this.loadWall(); }
      if (navTarget === 'history') { this.setScreen('history'); void this.loadHistory(); }
      if (navTarget === 'me') { this.setScreen('me'); void this.loadMe(); }
      if (action === 'welcome-next') this.setScreen('onboarding-setup');
      if (action === 'setup-next') this.handleSetupNext();
      if (action === 'enter-nightcall') void this.enterNightCall();
      if (action === 'start-call') {
        this.pendingConfessionQuestion = CONFESSION_QUESTIONS[Math.floor(Math.random() * CONFESSION_QUESTIONS.length)];
        this.pendingConfession = null;
        this.setScreen('confess-before-call');
      }
      if (action === 'skip-confession') { this.pendingConfession = null; this.setScreen('calling'); send('queue:join'); }
      if (action === 'start-call-with-confession') {
        const textarea = this.root.querySelector<HTMLTextAreaElement>('[data-confession-input]');
        const answer = textarea?.value.trim() ?? '';
        if (answer.length >= 10) {
          this.pendingConfession = { question: this.pendingConfessionQuestion, answer };
        }
        this.setScreen('calling');
        send('queue:join');
      }
      if (action === 'close-confession-reveal') { this.pendingConfession = null; this.setScreen('postcall-options'); }
      if (action === 'share-confession-to-wall') {
        if (this.pendingConfession?.answer) {
          void api.wall.post(this.pendingConfession.answer).then(() => {
            this.showToast('Shared to The Wall 🌙');
          }).catch(() => {
            this.showToast('Could not share — try again');
          });
        }
        this.pendingConfession = null;
        this.setScreen('postcall-options');
      }
      if (action === 'report-call') this.showReportSheet();
      if (action === 'submit-report') void this.submitReport();
      if (action === 'close-report') this.closeReportSheet();
      if (action === 'cancel-call') {
        if (this.connectingTimerId !== undefined) { window.clearTimeout(this.connectingTimerId); this.connectingTimerId = undefined; }
        send('queue:leave');
        this.setScreen(this.resolveHomeScreen());
      }
      if (action === 'go-home') this.setScreen(this.resolveHomeScreen());
      if (action === 'end-call') {
        if (this.currentRoomId) {
          send('queue:leave');
          void api.calls.end(this.currentRoomId);
        }
        this.endCall();
      }
      if (action === 'toggle-mute') this.handleToggleMute();
      if (action === 'save-word') void this.saveWord();
      if (action === 'open-wall') void this.handleWallPost();
      if (action === 'add-confession') void this.handleConfession();
      if (action === 'load-more-wall') void this.loadMoreWall();
      if (action === 'use-pass') this.usePass();
      if (action === 'upgrade') this.showToast('Premium coming soon — stay tuned 🌙');
      if (action === 'retry-call') { this.setScreen('calling'); send('queue:join'); }
      if (action === 'go-to-postcall') this.setScreen('postcall');
      if (action === 'toggle-ambient') this.toggleAmbient();
      if (action === 'enable-notif') { void this.requestPushPermission(); this.setScreen(this.resolveHomeScreen()); }
      if (action === 'skip-notif') this.setScreen(this.resolveHomeScreen());
      const postId = button.dataset.postId;
      if (action === 'like-post' && postId) this.likePost(postId);
      const filterVal = button.dataset.filter as 'all' | 'confessions' | 'words' | undefined;
      if (filterVal) this.filterWall(filterVal);
      if (action === 'edit-timezone' || action === 'edit-alias') this.setScreen('onboarding-setup');
      if (action === 'toggle-notifications') void this.toggleNotifications();
      if (action === 'open-privacy') this.setScreen('privacy');
      if (action === 'back-to-me') this.setScreen('me');
      if (action === 'delete-account') void this.deleteAccount();
    });

    this.root.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement;
      if (target.matches('[data-alias-input]')) {
        this.state.onboarding.alias = target.value;
        this.saveState();
      }
      if (target.matches('[data-confession-input]')) {
        const len = (target as HTMLTextAreaElement).value.length;
        const counter = this.root.querySelector<HTMLElement>('[data-char-count]');
        if (counter) counter.textContent = String(len);
        const submitBtn = this.root.querySelector<HTMLButtonElement>('[data-confession-submit]');
        if (submitBtn) submitBtn.disabled = len < 10;
      }
    });

    this.root.addEventListener('change', (event) => {
      const target = event.target as HTMLInputElement | HTMLSelectElement;
      if (target.matches('[data-timezone-select]')) {
        this.state.onboarding.timezone = target.value;
        this.saveState();
      }
      const confirmation = (target as HTMLInputElement).dataset.confirmation as ConfirmationKey | undefined;
      if (confirmation) {
        this.state.onboarding.confirmations[confirmation] = (target as HTMLInputElement).checked;
        this.saveState();
        this.syncConfirmButton();
      }
      if ((target as HTMLInputElement).name === 'reason') {
        const otherEl = this.root.querySelector<HTMLElement>('[data-other-text]');
        if (otherEl) otherEl.style.display = (target as HTMLInputElement).value === 'other' ? 'block' : 'none';
      }
    });
  }

  private bindSocketEvents(): void {
    if (this.socketBound) return;
    this.socketBound = true;

    on('queue:waiting', () => {
      this.showToast('In queue — finding your stranger…');
    });

    on('queue:matched', (payload) => {
      const { roomId, isInitiator, prompt } = payload as { roomId: string; isInitiator: boolean; prompt?: string };
      this.currentRoomId = roomId;
      if (prompt) this.currentPrompt = prompt;

      // Candle-out animation then show connecting screen
      const candle = this.root.querySelector<SVGElement>('.candle-svg');
      if (candle) candle.classList.add('candle-out');

      window.setTimeout(() => {
        this.setScreen('connecting');
        void startRtcCall(roomId, isInitiator, {
          onConnected: () => { /* audio established */ },
          onEnded: () => { this.endCall(); },
          onAudioLevel: () => { /* wave bars animate via CSS */ },
        }).catch(() => {
          if (this.connectingTimerId !== undefined) { window.clearTimeout(this.connectingTimerId); this.connectingTimerId = undefined; }
          this.showToast('Could not connect — check microphone permissions');
          this.setScreen(this.resolveHomeScreen());
        });
        this.connectingTimerId = window.setTimeout(() => {
          this.connectingTimerId = undefined;
          this.startCall();
        }, 2500);
      }, candle ? 400 : 0);
    });

    on('queue:limit_reached', () => {
      this.showToast('Daily call limit reached — try again tomorrow');
      this.setScreen(this.resolveHomeScreen());
    });

    on('queue:closed', () => {
      this.showToast('The line is closed right now');
      this.setScreen(this.resolveHomeScreen());
    });
  }

  private setScreen(screen: ScreenId, options: { skipPersistence?: boolean } = {}): void {
    const leaving = this.state.activeScreen;

    // Stop waiting room when leaving calling screen
    if (leaving === 'calling' && screen !== 'calling') {
      this.stopWaitingRoom();
    }

    this.refreshScreen(screen);

    this.state.activeScreen = screen;
    let activeNode: HTMLElement | null = null;

    this.root.querySelectorAll<HTMLElement>('[data-screen]').forEach((node) => {
      const isActive = node.dataset.screen === screen;
      node.classList.toggle('active', isActive);
      node.setAttribute('aria-hidden', String(!isActive));
      if (isActive) activeNode = node;
    });

    if (screen !== 'incall') this.stopTimer();
    if (screen === 'incall') this.startTimer();

    // Start waiting room after template is in DOM
    if (screen === 'calling') {
      window.requestAnimationFrame(() => this.startWaitingRoom());
    }

    if (!options.skipPersistence) this.saveState();
    this.updateClockAndWindow();

    if (activeNode) {
      window.requestAnimationFrame(() => {
        (activeNode as HTMLElement).querySelector<HTMLElement>('[data-autofocus]')?.focus({ preventScroll: true });
      });
    }
  }

  private refreshScreen(screen: ScreenId): void {
    const refreshable: Partial<Record<ScreenId, () => string>> = {
      me: () => this.meTemplate(),
      history: () => this.historyTemplate(),
      calling: () => this.callingTemplate(),
      incall: () => this.inCallTemplate(),
      wall: () => this.wallTemplate(),
      'confess-before-call': () => this.confessBeforeCallTemplate(),
      'confession-reveal': () => this.confessionRevealTemplate(),
      'postcall-options': () => this.postCallOptionsTemplate(),
      'no-match': () => this.noMatchTemplate(),
    };
    const template = refreshable[screen];
    if (!template) return;
    const node = this.root.querySelector<HTMLElement>(`[data-screen="${screen}"]`);
    if (node) node.outerHTML = template();
  }

  private resolveHomeScreen(): ScreenId {
    return isLineOpen(this.state.onboarding.timezone) ? 'home-open' : 'home-closed';
  }

  // 4a — check stored JWT on startup; skip onboarding if valid
  private async scheduleSplashTransition(): Promise<void> {
    if (this.splashTimerId !== undefined) window.clearTimeout(this.splashTimerId);
    await new Promise<void>((resolve) => {
      this.splashTimerId = window.setTimeout(resolve, 900);
    });

    const token = getToken();
    if (token) {
      try {
        const user = await api.me.get();
        this.state.onboarding.alias = user.pseudonym;
        this.state.onboarding.avatar = user.avatar as IconName;
        this.state.onboarding.timezone = user.timezone;
        this.state.tier = user.tier;
        if (user.streak !== undefined) this.userStreak = user.streak;
        this.state.onboarding.completed = true;
        this.saveState();
        connectSocket(token);
        this.bindSocketEvents();
        this.setScreen(this.resolveHomeScreen());
      } catch {
        localStorage.removeItem('nc:token');
        localStorage.removeItem('nc:user');
        this.setScreen(this.state.onboarding.completed ? this.resolveHomeScreen() : 'onboarding-welcome');
      }
    } else {
      // No token — always require fresh auth; never bypass to home screen
      this.state.onboarding.completed = false;
      this.saveState();
      this.setScreen('onboarding-welcome');
    }
  }

  private selectAvatar(avatar: IconName): void {
    this.state.onboarding.avatar = avatar;
    this.saveState();
    this.root.querySelectorAll<HTMLButtonElement>('[data-avatar]').forEach((button) => {
      const selected = button.dataset.avatar === avatar;
      button.classList.toggle('sel', selected);
      button.setAttribute('aria-checked', String(selected));
    });
  }

  private handleSetupNext(): void {
    const alias = this.root.querySelector<HTMLInputElement>('[data-alias-input]')?.value.trim() || '';
    const timezone = this.root.querySelector<HTMLSelectElement>('[data-timezone-select]')?.value || '';

    this.state.onboarding.alias = alias;
    this.state.onboarding.timezone = timezone;

    if (!timezone) {
      this.showToast('Choose your timezone first...');
      this.root.querySelector<HTMLSelectElement>('[data-timezone-select]')?.focus();
      return;
    }

    this.saveState();

    if (this.state.onboarding.completed) {
      void api.me.update({ pseudonym: alias, timezone }).catch(() => {});
      this.setScreen('me');
    } else {
      this.setScreen('onboarding-confirm');
    }
  }

  // 4b — create anonymous account on first entry, connect socket
  private async enterNightCall(): Promise<void> {
    if (!this.canEnterNightCall()) {
      this.showToast('Confirm all three items first...');
      return;
    }

    try {
      const { token, user } = await api.auth.init({
        pseudonym: this.state.onboarding.alias || 'Anonymous',
        avatar: this.state.onboarding.avatar,
        timezone: this.state.onboarding.timezone,
        consentAge: this.state.onboarding.confirmations.age,
        consentAnon: this.state.onboarding.confirmations.privacy,
        consentTerms: this.state.onboarding.confirmations.terms,
      });

      localStorage.setItem('nc:token', token);
      localStorage.setItem('nc:user', JSON.stringify(user));

      this.state.onboarding.completed = true;
      this.state.onboarding.alias = user.pseudonym;
      this.state.onboarding.avatar = user.avatar as IconName;
      this.state.tier = user.tier;
      this.saveState();

      connectSocket(token);
      this.bindSocketEvents();
      this.setScreen('onboard-notif');
    } catch (err: unknown) {
      console.error('enterNightCall error:', err);
      const e = err as { status?: number; message?: string };
      if (e.status === 429) {
        this.showToast('Too many attempts — wait a moment');
      } else if (!navigator.onLine) {
        this.showToast('No internet — check your connection');
      } else {
        const msg = e.message ?? 'Unknown error';
        this.showToast(`Could not connect: ${msg}`);
      }
    }
  }

  private async requestPushPermission(): Promise<void> {
    if (!('Notification' in window) || !('serviceWorker' in navigator)) return;
    if (Notification.permission === 'granted') {
      this.state.notificationsEnabled = true;
      this.saveState();
      await this.subscribeToPush().catch(() => {});
      return;
    }
    if (Notification.permission === 'denied') return;
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      this.state.notificationsEnabled = true;
      this.saveState();
      this.showToast("We'll remind you at 1:55 AM every night 🌙");
      await this.subscribeToPush().catch(() => {});
    }
  }

  // 4l — VAPID push subscription
  private async subscribeToPush(): Promise<void> {
    const vapidKey = import.meta.env.VITE_VAPID_PUBLIC_KEY;
    if (!vapidKey) return;
    const reg = await navigator.serviceWorker.ready;
    if (!reg.pushManager) return;
    const subscription = await reg.pushManager.subscribe({
      userVisibleOnly: true,
      applicationServerKey: vapidKey,
    });
    await api.push.subscribe(subscription.toJSON() as PushSubscriptionJSON);
  }

  private async toggleNotifications(): Promise<void> {
    if (!('Notification' in window)) {
      this.showToast('Notifications not supported on this browser');
      return;
    }
    if (this.state.notificationsEnabled) {
      this.state.notificationsEnabled = false;
      this.saveState();
      this.showToast('Notifications turned off');
      await api.push.unsubscribe().catch(() => {});
    } else {
      if (Notification.permission === 'denied') {
        this.showToast('Enable notifications in your browser settings');
        return;
      }
      const perm = await Notification.requestPermission();
      if (perm === 'granted') {
        this.state.notificationsEnabled = true;
        this.saveState();
        this.showToast("We'll remind you at 1:55 AM every night 🌙");
        await this.subscribeToPush().catch(() => {});
      }
    }
    const notifValue = this.root.querySelector<HTMLElement>('[data-notif-value]');
    if (notifValue) notifValue.textContent = this.state.notificationsEnabled ? 'On' : 'Off';
  }

  private canEnterNightCall(): boolean {
    return Object.values(this.state.onboarding.confirmations).every(Boolean);
  }

  private syncOnboardingControls(): void {
    this.selectAvatar(this.state.onboarding.avatar);
    const aliasInput = this.root.querySelector<HTMLInputElement>('[data-alias-input]');
    if (aliasInput) aliasInput.value = this.state.onboarding.alias;
    const timezoneSelect = this.root.querySelector<HTMLSelectElement>('[data-timezone-select]');
    if (timezoneSelect) timezoneSelect.value = this.state.onboarding.timezone;
    this.syncConfirmButton();
  }

  private syncConfirmButton(): void {
    const enterButton = this.root.querySelector<HTMLButtonElement>('[data-action="enter-nightcall"]');
    if (enterButton) enterButton.disabled = !this.canEnterNightCall();
  }

  // 4c — transition to incall screen and start countdown display
  private startCall(): void {
    this.callRemainingSeconds = CALL_DURATION_SECONDS;
    this.callStartedAt = Date.now();
    haptic([50, 30, 50]);
    this.setScreen('incall');
    this.updateTimerDisplay();
    // Rotate hint every 3 minutes
    this.hintTimerId = window.setInterval(() => this.rotateCallHint(), 180_000);
  }

  private rotateCallHint(): void {
    const hintEl = this.root.querySelector<HTMLElement>('[data-call-hint]');
    if (!hintEl) return;
    const current = hintEl.textContent ?? '';
    const next = CALL_HINTS.filter((h) => h !== current);
    hintEl.textContent = next[Math.floor(Math.random() * next.length)] ?? CALL_HINTS[0];
  }

  // 4d — cleanup WebRTC and local state, navigate to postcall or confession-reveal
  private endCall(): void {
    rtcEndCall();
    this.stopTimer();
    if (this.connectingTimerId !== undefined) { window.clearTimeout(this.connectingTimerId); this.connectingTimerId = undefined; }
    haptic([100, 50, 100, 50, 200]);

    const durationSecs = this.callStartedAt > 0
      ? Math.min(CALL_DURATION_SECONDS, Math.floor((Date.now() - this.callStartedAt) / 1_000))
      : CALL_DURATION_SECONDS - this.callRemainingSeconds;

    const newCall: SavedCall = {
      id: this.currentCallId ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`,
      startedAt: this.callStartedAt || Date.now() - durationSecs * 1_000,
      durationSecs,
      word: null,
    };

    this.state.savedCalls = [newCall, ...this.state.savedCalls].slice(0, 50);
    this.state.calls += 1;
    this.callStartedAt = 0;
    this.currentRoomId = undefined;
    this.currentCallId = undefined;
    this.isMuted = false;
    this.saveState();
    this.updateStats();

    // Brief hard-cut to black before post-call screen
    const phone = this.root.querySelector<HTMLElement>('[data-phone]');
    if (phone) {
      phone.classList.add('hard-cut');
      window.setTimeout(() => {
        phone.classList.remove('hard-cut');
        if (this.pendingConfession) {
          this.setScreen('confession-reveal');
        } else {
          this.setScreen('postcall-options');
        }
      }, 350);
    } else {
      if (this.pendingConfession) {
        this.setScreen('confession-reveal');
      } else {
        this.setScreen('postcall-options');
      }
    }
  }

  // 4e — mute/unmute microphone
  private handleToggleMute(): void {
    this.isMuted = !this.isMuted;
    toggleMute(this.isMuted);
    const btn = this.root.querySelector<HTMLButtonElement>('[data-action="toggle-mute"]');
    if (btn) {
      btn.textContent = this.isMuted ? 'Unmute' : 'Mute';
      btn.setAttribute('aria-pressed', String(this.isMuted));
    }
    const banner = this.root.querySelector<HTMLElement>('[data-mute-banner]');
    if (banner) banner.classList.toggle('visible', this.isMuted);
    haptic(this.isMuted ? [20] : [10]);
  }

  private startTimer(): void {
    if (this.timerId !== undefined) return;
    this.timerId = window.setInterval(() => {
      this.callRemainingSeconds = Math.max(0, this.callRemainingSeconds - 1);
      this.updateTimerDisplay();
      if (this.callRemainingSeconds === 0) this.endCall();
    }, 1_000);
  }

  private stopTimer(): void {
    if (this.timerId !== undefined) { window.clearInterval(this.timerId); this.timerId = undefined; }
    if (this.hintTimerId !== undefined) { window.clearInterval(this.hintTimerId); this.hintTimerId = undefined; }
  }

  private updateTimerDisplay(): void {
    const timerText = this.root.querySelector<HTMLElement>('[data-timer-text]');
    const timerFill = this.root.querySelector<HTMLElement>('[data-timer-fill]');
    if (!timerText || !timerFill) return;
    const minutes = Math.floor(this.callRemainingSeconds / 60);
    const seconds = String(this.callRemainingSeconds % 60).padStart(2, '0');
    const percentage = Math.round((this.callRemainingSeconds / CALL_DURATION_SECONDS) * 100);
    timerText.textContent = `${minutes}:${seconds} remaining`;
    timerFill.style.width = `${percentage}%`;
    timerText.classList.remove('timer-text--amber', 'timer-text--red');
    if (this.callRemainingSeconds <= 60) {
      timerText.classList.add('timer-text--red');
      if (this.callRemainingSeconds === 60) haptic([100, 50, 100]);
    } else if (this.callRemainingSeconds <= 180) {
      timerText.classList.add('timer-text--amber');
    }
  }

  // 4f — persist word locally and send to API
  private async saveWord(): Promise<void> {
    const input = this.root.querySelector<HTMLInputElement>('[data-word-input]');
    const word = input?.value.trim().replace(/\s+/g, ' ');

    if (!word) {
      this.showToast('Type one word first...');
      input?.focus();
      return;
    }

    this.state.savedWords = [word, ...this.state.savedWords].slice(0, 25);
    const latest = this.state.savedCalls[0];
    if (latest?.word === null) {
      latest.word = word;
      if (latest.id && !latest.id.startsWith('seed-')) {
        void api.words.save(latest.id, word);
      }
    }

    this.saveState();
    if (input) input.value = '';
    haptic(60);
    this.showToast(`Word saved: "${word}" 🌙`);
    window.setTimeout(() => this.setScreen(this.resolveHomeScreen()), 1_500);
  }

  // 4g — prompt for wall post text and send to API
  private async handleWallPost(): Promise<void> {
    const body = window.prompt('Share something to The Wall (max 500 characters):');
    if (!body?.trim()) return;
    if (body.trim().length > 500) {
      this.showToast('Too long — keep it under 500 characters');
      return;
    }
    try {
      await api.wall.post(body.trim());
      this.showToast('Posted to The Wall 🌙');
      this.setScreen('wall');
      void this.loadWall();
    } catch {
      this.showToast('Could not post — try again');
    }
  }

  private async handleConfession(): Promise<void> {
    if (!getToken()) {
      this.showToast('Complete onboarding first to confess 🌙');
      return;
    }
    if (!this.canPostConfession()) {
      this.showToast('One confession per night — come back tomorrow 🌙');
      return;
    }
    const body = window.prompt('Your confession (10–500 characters):\n\nPosted anonymously on The Wall.');
    if (!body?.trim()) return;
    const trimmed = body.trim();
    if (trimmed.length < 10) {
      this.showToast('Too short — say a little more');
      return;
    }
    if (trimmed.length > 500) {
      this.showToast('Too long — keep it under 500 characters');
      return;
    }
    try {
      await api.wall.post(trimmed);
      localStorage.setItem('nc:lastConfession', new Date().toISOString());
      this.showToast('Confession posted to The Wall 🌙');
      void this.loadWall();
    } catch (err: unknown) {
      const e = err as { status?: number; message?: string };
      if (e.status === 429) {
        localStorage.setItem('nc:lastConfession', new Date().toISOString());
        this.showToast('One confession per night — come back tomorrow 🌙');
      } else if (e.status === 422) {
        this.showToast('That content can\'t be posted — try rewording it');
      } else {
        this.showToast('Could not post — try again');
      }
    }
  }

  // 4h — load wall posts from API and re-render
  private async loadWall(): Promise<void> {
    try {
      const { posts, nextCursor } = await api.wall.list();
      this.apiWallPosts = posts;
      this.wallNextCursor = nextCursor;
      if (this.state.activeScreen === 'wall') {
        this.setScreen('wall', { skipPersistence: true });
      }
    } catch { /* keep showing existing posts */ }
  }

  private async loadMoreWall(): Promise<void> {
    if (!this.wallNextCursor) return;
    try {
      const { posts, nextCursor } = await api.wall.list(this.wallNextCursor);
      this.apiWallPosts = [...this.apiWallPosts, ...posts];
      this.wallNextCursor = nextCursor;
      if (this.state.activeScreen === 'wall') {
        this.setScreen('wall', { skipPersistence: true });
      }
    } catch { /* ignore */ }
  }

  // 4i — load call history from API
  private async loadHistory(): Promise<void> {
    try {
      const { calls } = await api.calls.history();
      this.state.savedCalls = calls.map((c: CallRecord) => ({
        id: c.id,
        startedAt: new Date(c.started_at).getTime(),
        durationSecs: c.duration_secs,
        word: c.word,
      }));
      if (this.state.activeScreen === 'history') {
        this.setScreen('history', { skipPersistence: true });
      }
    } catch { /* keep showing existing */ }
  }

  // 4j — refresh profile from API
  private async loadMe(): Promise<void> {
    try {
      const user = await api.me.get();
      this.state.onboarding.alias = user.pseudonym;
      this.state.onboarding.avatar = user.avatar as IconName;
      this.state.onboarding.timezone = user.timezone;
      this.state.tier = user.tier;
      if (user.streak !== undefined) this.userStreak = user.streak;
      if (this.state.activeScreen === 'me') {
        this.setScreen('me', { skipPersistence: true });
      }
    } catch { /* keep showing existing */ }
  }

  private usePass(): void {
    if (this.state.passesLeft <= 0) return;
    this.state.passesLeft -= 1;
    this.saveState();
    haptic([40, 20, 40]);
    this.showToast('Pass used — finding another stranger…');
    send('queue:pass');

    const passLink = this.root.querySelector<HTMLButtonElement>('[data-action="use-pass"]');
    if (passLink) {
      if (this.state.passesLeft > 0) {
        passLink.textContent = `Use a pass to skip this match — ${this.state.passesLeft} ${this.state.passesLeft === 1 ? 'pass' : 'passes'} left`;
      } else {
        passLink.remove();
      }
    }
  }

  // 4k — delete account locally and on server
  private async deleteAccount(): Promise<void> {
    const confirmed = window.confirm(
      'Delete your NightCall account?\n\nThis removes your alias, avatar, call history, and saved words from this device. This cannot be undone.',
    );
    if (!confirmed) return;

    await api.me.delete().catch(() => {});
    disconnectSocket();
    localStorage.clear();
    this.showToast('Account deleted.');
    window.setTimeout(() => location.reload(), 1_500);
  }

  private updateStats(): void {
    this.root.querySelectorAll<HTMLElement>('[data-stat="calls"]').forEach((n) => { n.textContent = String(this.state.calls); });
    this.root.querySelectorAll<HTMLElement>('[data-stat="passes"]').forEach((n) => { n.textContent = String(this.state.passesLeft); });
    this.root.querySelectorAll<HTMLElement>('[data-stat="wall"]').forEach((n) => { n.textContent = String(this.state.wallCount); });
  }

  private showToast(message: string): void {
    const toast = this.root.querySelector<HTMLElement>('[data-toast]');
    if (!toast) return;
    toast.textContent = message;
    toast.classList.add('show');
    if (this.toastTimerId !== undefined) window.clearTimeout(this.toastTimerId);
    this.toastTimerId = window.setTimeout(() => toast.classList.remove('show'), 2_500);
  }

  private relativeTime(isoString: string): string {
    const diff = Date.now() - new Date(isoString).getTime();
    const h = Math.floor(diff / 3_600_000);
    if (h < 1) return 'just now';
    if (h < 24) return `${h}h ago`;
    return `${Math.floor(h / 24)}d ago`;
  }

  private updateClockAndWindow(): void {
    const timezone = this.state.onboarding.timezone || 'Asia/Kolkata';

    const clockParts = new Intl.DateTimeFormat('en-US', {
      timeZone: timezone,
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    }).formatToParts(new Date());

    const clockHour = clockParts.find((p) => p.type === 'hour')?.value ?? '';
    const clockMinute = clockParts.find((p) => p.type === 'minute')?.value ?? '';
    const clockPeriod = clockParts.find((p) => (p.type as string).toLowerCase() === 'dayperiod')?.value ?? '';
    const clockStr = `${clockHour}:${clockMinute}`;
    const statusStr = `${clockHour}:${clockMinute} ${clockPeriod}`.trimEnd();

    this.root.querySelectorAll<HTMLElement>('[data-live-clock]').forEach((n) => { n.textContent = statusStr; });
    this.root.querySelectorAll<HTMLElement>('[data-main-clock]').forEach((n) => { n.textContent = clockStr; });

    const openSecs = getSecondsUntilOpen(timezone);

    const openCountdown = this.root.querySelector<HTMLElement>('[data-open-countdown]');
    if (openCountdown) openCountdown.textContent = formatDuration(openSecs * 1_000);

    const callBtnCountdown = this.root.querySelector<HTMLElement>('[data-call-btn-countdown]');
    if (callBtnCountdown) callBtnCountdown.textContent = formatDuration(openSecs * 1_000);

    const announceEl = this.root.querySelector<HTMLElement>('[data-countdown-announce]');
    if (announceEl && openSecs > 0 && openSecs % 60 === 0) {
      const h = Math.floor(openSecs / 3600);
      const m = Math.floor((openSecs % 3600) / 60);
      announceEl.textContent = h > 0
        ? `Line opens in ${h} ${h === 1 ? 'hour' : 'hours'} and ${m} minutes`
        : `Line opens in ${m} ${m === 1 ? 'minute' : 'minutes'}`;
    }

    const closeSecs = getSecondsUntilClose(timezone);
    const closeCountdown = this.root.querySelector<HTMLElement>('[data-close-countdown]');
    if (closeCountdown) {
      const minutes = Math.floor(closeSecs / 60);
      const seconds = closeSecs % 60;
      closeCountdown.textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;
    }

    const shouldBeHomeOpen = isLineOpen(timezone);
    if (this.state.activeScreen === 'home-open' && !shouldBeHomeOpen) this.setScreen('home-closed');
    if (this.state.activeScreen === 'home-closed' && shouldBeHomeOpen) this.setScreen('home-open');
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      this.stopTimer();
      return;
    }
    if (this.state.activeScreen === 'incall') this.startTimer();
    this.updateClockAndWindow();
  }

  private escapeHtml(value: string): string {
    return value.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] ?? c));
  }
}

const appRoot = document.querySelector<HTMLElement>('#app');
if (!appRoot) throw new Error('NightCall mount node not found.');
new NightCallApp(appRoot);
