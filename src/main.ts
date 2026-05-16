import './styles.css';

type ScreenId =
  | 'splash'
  | 'onboarding-welcome'
  | 'onboarding-setup'
  | 'onboarding-confirm'
  | 'home-closed'
  | 'home-open'
  | 'calling'
  | 'incall'
  | 'postcall'
  | 'wall';

type NavTarget = 'tonight' | 'wall';
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
  | 'clock'
  | 'userCheck'
  | 'shieldOff'
  | 'fileText';

type WallPost = {
  quote: string;
  region: string;
  age: string;
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
  calls: number;
  passesLeft: number;
  wallCount: number;
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
  clock: '<path d="M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0"/><path d="M12 7v5l3 3"/>',
  userCheck: '<path d="M8 7a4 4 0 1 0 8 0a4 4 0 0 0 -8 0"/><path d="M6 21v-2a4 4 0 0 1 4 -4h3"/><path d="M15 19l2 2l4 -4"/>',
  shieldOff: '<path d="M12 3l7 4v5c0 2 -1 4 -2.7 5.7"/><path d="M14 20a11 11 0 0 1 -9 -10v-3l3.8 -2.2"/><path d="M3 3l18 18"/>',
  fileText: '<path d="M14 3v4a1 1 0 0 0 1 1h4"/><path d="M17 21h-10a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2h7l5 5v11a2 2 0 0 1 -2 2z"/><path d="M9 9h1"/><path d="M9 13h6"/><path d="M9 17h6"/>',
};

const AVATARS: IconName[] = ['moon', 'star', 'cloud', 'flame', 'droplet', 'leaf', 'eye', 'wind', 'snowflake', 'sun'];
const LOCAL_STORAGE_KEY = 'nightcall:v2';
const CALL_DURATION_SECONDS = 600;
const INITIAL_REMAINING_SECONDS = 374;
const LINE_OPEN_HOUR = 2;
const LINE_OPEN_MINUTE = 0;
const LINE_CLOSE_HOUR = 2;
const LINE_CLOSE_MINUTE = 50;

const WALL_POSTS: WallPost[] = [
  {
    quote:
      "I told a stranger I loved someone I've never admitted loving. Saying it out loud to nobody made it more real than anything.",
    region: 'Brazil',
    age: '2h ago',
  },
  {
    quote: "My word was 'lighter'. I didn't expect to mean it.",
    region: 'the UK',
    age: '4h ago',
  },
  {
    quote:
      "They said 'you're the first person I've told.' I'll carry that forever even though I'll never know their name.",
    region: 'Canada',
    age: '6h ago',
  },
  {
    quote:
      "I hung up after 3 minutes because I started crying. I don't know why I'm posting this. I guess I just want someone to know it happened.",
    region: 'India',
    age: '9h ago',
  },
  {
    quote: "Asked them what they'd do if they weren't afraid. They went silent for 45 seconds. Then said 'go home.'",
    region: 'Germany',
    age: '11h ago',
  },
];

const TIMEZONES = [
  { group: 'India', zones: [{ value: 'Asia/Kolkata', label: 'India — IST (UTC +5:30)' }] },
  {
    group: 'US & Canada',
    zones: [
      { value: 'America/New_York', label: 'US Eastern — ET (UTC -5)' },
      { value: 'America/Chicago', label: 'US Central — CT (UTC -6)' },
      { value: 'America/Denver', label: 'US Mountain — MT (UTC -7)' },
      { value: 'America/Los_Angeles', label: 'US Pacific — PT (UTC -8)' },
    ],
  },
  {
    group: 'Europe',
    zones: [
      { value: 'Europe/London', label: 'UK — GMT (UTC 0)' },
      { value: 'Europe/Paris', label: 'Central Europe — CET (UTC +1)' },
      { value: 'Europe/Moscow', label: 'Russia — MSK (UTC +3)' },
    ],
  },
  {
    group: 'Asia',
    zones: [
      { value: 'Asia/Dubai', label: 'UAE — GST (UTC +4)' },
      { value: 'Asia/Singapore', label: 'Singapore — SGT (UTC +8)' },
      { value: 'Asia/Tokyo', label: 'Japan — JST (UTC +9)' },
      { value: 'Asia/Seoul', label: 'Korea — KST (UTC +9)' },
    ],
  },
  {
    group: 'Australia & Pacific',
    zones: [
      { value: 'Australia/Sydney', label: 'Sydney — AEST (UTC +10)' },
      { value: 'Pacific/Auckland', label: 'New Zealand — NZST (UTC +12)' },
    ],
  },
  {
    group: 'Latin America',
    zones: [
      { value: 'America/Sao_Paulo', label: 'Brazil — BRT (UTC -3)' },
      { value: 'America/Mexico_City', label: 'Mexico — CST (UTC -6)' },
    ],
  },
];

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
    confirmations: {
      age: false,
      privacy: false,
      terms: false,
    },
  };
}

function formatTime(date: Date): { clock: string; status: string } {
  const hours = date.getHours();
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const period = hours >= 12 ? 'PM' : 'AM';
  const hour12 = hours % 12 || 12;
  return { clock: `${hour12}:${minutes}`, status: `${hour12}:${minutes} ${period}` };
}

function isLineOpen(date = new Date()): boolean {
  const minutesFromMidnight = date.getHours() * 60 + date.getMinutes();
  const opensAt = LINE_OPEN_HOUR * 60 + LINE_OPEN_MINUTE;
  const closesAt = LINE_CLOSE_HOUR * 60 + LINE_CLOSE_MINUTE;
  return minutesFromMidnight >= opensAt && minutesFromMidnight < closesAt;
}

function nextOpenDate(now = new Date()): Date {
  const next = new Date(now);
  next.setHours(LINE_OPEN_HOUR, LINE_OPEN_MINUTE, 0, 0);
  if (now.getTime() >= next.getTime()) next.setDate(next.getDate() + 1);
  return next;
}

function closeDate(now = new Date()): Date {
  const close = new Date(now);
  close.setHours(LINE_CLOSE_HOUR, LINE_CLOSE_MINUTE, 0, 0);
  return close;
}

function formatDuration(milliseconds: number): string {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1_000));
  const hours = Math.floor(totalSeconds / 3_600);
  const minutes = Math.floor((totalSeconds % 3_600) / 60);
  const seconds = totalSeconds % 60;
  return `${hours}:${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

class NightCallApp {
  private readonly root: HTMLElement;
  private state: AppState;
  private callRemainingSeconds = INITIAL_REMAINING_SECONDS;
  private timerId: number | undefined;
  private clockTimerId: number | undefined;
  private toastTimerId: number | undefined;
  private splashTimerId: number | undefined;

  constructor(root: HTMLElement) {
    this.root = root;
    this.state = this.loadState();
    this.render();
    this.bindEvents();
    this.updateClockAndWindow();
    this.updateTimerDisplay();
    this.clockTimerId = window.setInterval(() => this.updateClockAndWindow(), 1_000);
    document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
    this.scheduleSplashTransition();
  }

  private loadState(): AppState {
    const defaultState: AppState = {
      activeScreen: 'splash',
      onboarding: defaultOnboarding(),
      savedWords: [],
      calls: 7,
      passesLeft: 2,
      wallCount: 43,
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
        savedWords: Array.isArray(parsed.savedWords) ? parsed.savedWords.slice(0, 25) : [],
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
        calls: this.state.calls,
        passesLeft: this.state.passesLeft,
        wallCount: this.state.wallCount,
      }),
    );
  }

  private render(): void {
    this.root.innerHTML = `
      <section class="wrap">
        <div class="phone" data-phone>
          <div class="toast" data-toast role="status" aria-live="polite">Connecting...</div>
          ${this.splashTemplate()}
          ${this.onboardingWelcomeTemplate()}
          ${this.onboardingSetupTemplate()}
          ${this.onboardingConfirmTemplate()}
          ${this.homeClosedTemplate()}
          ${this.homeOpenTemplate()}
          ${this.callingTemplate()}
          ${this.inCallTemplate()}
          ${this.postCallTemplate()}
          ${this.wallTemplate()}
        </div>
      </section>
    `;
    this.setScreen(this.state.activeScreen, { skipPersistence: true });
    this.syncOnboardingControls();
  }

  private statusBarTemplate(time = '2:00 AM', withBattery = false): string {
    return `
      <div class="sbar">
        <span class="sbar-time" data-live-clock>${time}</span>
        <div class="sbar-icons" aria-hidden="true">
          ${icon('wifi')}
          ${withBattery ? icon('battery') : ''}
        </div>
      </div>
    `;
  }

  private stepsTemplate(step: 1 | 2 | 3): string {
    return `
      <div class="steps" aria-label="Onboarding step ${step} of 3">
        ${[1, 2, 3]
          .map((item) => `<div class="step ${item === step ? 'active' : ''}" aria-hidden="true"></div>`)
          .join('')}
      </div>
    `;
  }

  private splashTemplate(): string {
    return `
      <section class="screen active" data-screen="splash" aria-labelledby="splash-title">
        <div class="splash-bg">
          <div class="splash-ring">${icon('moon', 'splash-icon')}</div>
          <h1 class="splash-logo" id="splash-title">Night<em>Call</em></h1>
          <p class="tagline">10 minutes. One stranger. Then it's over.</p>
          <p class="splash-loading">Loading…</p>
        </div>
      </section>
    `;
  }

  private onboardingWelcomeTemplate(): string {
    return `
      <section class="screen" data-screen="onboarding-welcome" aria-labelledby="welcome-title">
        ${this.statusBarTemplate('2:00 AM', true)}
        ${this.stepsTemplate(1)}
        <div class="ob-scroll">
          <h2 class="ob-title ob-title--large" id="welcome-title">The line opens<br />at midnight.</h2>
          <p class="ob-sub">Every night, for exactly 50 minutes — 2:00 to 2:50 AM — a line opens. You get 10 minutes with a stranger. Then it's gone. So are they.</p>
          <article class="quote-card">
            <div class="quote-label">From The Wall, last night</div>
            <p class="quote-copy">“She laughed when I said I was scared of being forgotten. Then said she was too.”</p>
            <div class="quote-meta">— From somewhere in Brazil</div>
          </article>
          <article class="quote-card">
            <p class="quote-copy">“I told a stranger the thing I've been holding for three years. It took 4 minutes. I feel lighter.”</p>
            <div class="quote-meta">— From somewhere in India</div>
          </article>
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
          <h2 class="ob-title" id="setup-title">Who are you tonight?</h2>
          <p class="ob-kicker">Pick an avatar and a name. No real info needed.</p>
          <div class="section-label">Your avatar</div>
          <div class="avatar-grid" role="radiogroup" aria-label="Choose avatar">
            ${AVATARS.map(
              (avatar) => `
                <button class="ava ${avatar === this.state.onboarding.avatar ? 'sel' : ''}" data-avatar="${avatar}" role="radio" aria-checked="${avatar === this.state.onboarding.avatar}" type="button">
                  ${icon(avatar)}
                </button>
              `,
            ).join('')}
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
    const selectedTimezone = this.state.onboarding.timezone;
    return `
      <option value="">Select your timezone…</option>
      ${TIMEZONES.map(
        ({ group, zones }) => `
          <optgroup label="${group}">
            ${zones
              .map(
                ({ value, label }) =>
                  `<option value="${value}" ${value === selectedTimezone ? 'selected' : ''}>${label}</option>`,
              )
              .join('')}
          </optgroup>
        `,
      ).join('')}
    `;
  }

  private onboardingConfirmTemplate(): string {
    return `
      <section class="screen" data-screen="onboarding-confirm" aria-labelledby="confirm-title">
        ${this.statusBarTemplate()}
        ${this.stepsTemplate(3)}
        <div class="ob-scroll">
          <h2 class="ob-title" id="confirm-title">Before you enter.</h2>
          <p class="ob-kicker">Three things to confirm so everyone stays safe.</p>
          ${this.confirmationItemTemplate(
            'age',
            'userCheck',
            'You are 18 or older',
            'NightCall is for adults only. Anonymous late-night voice calls with strangers are not appropriate for minors.',
            'I confirm I am 18 years of age or older',
          )}
          ${this.confirmationItemTemplate(
            'privacy',
            'shieldOff',
            'We are not responsible for what you share',
            'NightCall is anonymous by design. We do not store your identity. Any personal information you choose to share verbally during a call is entirely your own responsibility. Do not share sensitive data like your address, passwords, or financial information.',
            'I understand NightCall is not responsible for personal information I voluntarily share',
          )}
          ${this.confirmationItemTemplate(
            'terms',
            'fileText',
            'Terms & community rules',
            'No harassment. No hate speech. No sharing private information of others. Violations result in a permanent ban. The community reporting system keeps this safe.',
            'I accept the Terms of Service and Community Guidelines',
          )}
          <button class="ob-btn" data-action="enter-nightcall" type="button" ${this.canEnterNightCall() ? '' : 'disabled'}>Enter NightCall ${icon('moon')}</button>
          <p class="fineprint">Your alias and avatar are the only things we store.</p>
        </div>
      </section>
    `;
  }

  private confirmationItemTemplate(
    key: ConfirmationKey,
    iconName: IconName,
    title: string,
    description: string,
    label: string,
  ): string {
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
        ${this.statusBarTemplate('11:48 PM', true)}
        <div class="scroll">
          <div class="nc-hero nc-hero--compact">
            <h1 class="nc-logo" id="closed-title">Night<span>Call</span></h1>
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
          <button class="nc-call-btn disabled" disabled type="button">${icon('phone')} Line is closed</button>
          ${this.statsTemplate('closed')}
          <article class="wall-item">
            <div class="quote-label">From The Wall · last night</div>
            <p class="wall-quote">“My word was 'lighter'. I didn't expect to mean it.”</p>
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
        ${this.statusBarTemplate('2:17 AM', true)}
        <div class="scroll">
          <div class="nc-hero nc-hero--compact">
            <h1 class="nc-logo" id="open-title">Night<span>Call</span></h1>
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
          <article class="wall-item">
            <p class="wall-quote">“I told a stranger I loved someone I've never admitted loving. Saying it out loud made it more real than anything.”</p>
            <div class="wall-meta"><span class="wall-dot" aria-hidden="true"></span>From somewhere in Brazil <span class="wall-dot" aria-hidden="true"></span> 2h ago</div>
          </article>
        </div>
        ${this.bottomNavTemplate('tonight')}
      </section>
    `;
  }

  private statsTemplate(mode: 'open' | 'closed'): string {
    const items =
      mode === 'open'
        ? [
            { value: this.state.calls, label: 'My calls', stat: 'calls' },
            { value: this.state.passesLeft, label: 'Passes left', stat: 'passes' },
            { value: this.state.wallCount, label: 'On The Wall', stat: 'wall' },
          ]
        : [
            { value: 289, label: 'Awake now', stat: 'awake' },
            { value: this.state.passesLeft + 1, label: 'My passes', stat: 'passes' },
            { value: this.state.wallCount, label: 'Wall posts', stat: 'wall' },
          ];

    return `
      <div class="nc-stats" aria-label="Tonight stats">
        ${items
          .map(
            ({ value, label, stat }) =>
              `<article class="nc-stat"><div class="nc-stat-num" data-stat="${stat}">${value}</div><div class="nc-stat-label">${label}</div></article>`,
          )
          .join('')}
      </div>
    `;
  }

  private callingTemplate(): string {
    return `
      <section class="screen" data-screen="calling" aria-labelledby="calling-title">
        ${this.statusBarTemplate()}
        <div class="calling-bg">
          <div class="calling-ring" aria-hidden="true"><div class="calling-emoji">🌙</div></div>
          <div class="calling-label">Connecting</div>
          <h2 class="calling-title" id="calling-title">Finding your stranger...</h2>
          <p class="calling-sub">Somewhere in the world,<br />someone is waiting too.</p>
          <div class="call-actions">
            <div class="call-action">
              <button class="call-action-btn call-end" data-action="cancel-call" type="button" aria-label="Cancel call">${icon('phoneOff')}</button>
              <div class="call-action-label">Cancel</div>
            </div>
            <div class="call-action">
              <button class="call-action-btn call-connect" data-action="connect-call" type="button" aria-label="Connect call">${icon('check')}</button>
              <div class="call-action-label">Connect</div>
            </div>
          </div>
        </div>
      </section>
    `;
  }

  private inCallTemplate(): string {
    return `
      <section class="screen" data-screen="incall" aria-labelledby="incall-question">
        ${this.statusBarTemplate('2:03 AM')}
        <div class="incall-top">
          <h2 class="incall-qs" id="incall-question">“What's something you've been carrying alone that you wish someone knew?”</h2>
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
          <aside class="incall-hint">“The best NightCalls happen when you say the thing you've never said out loud. This stranger won't remember your name. That's the point.”</aside>
          <article class="transcript-card">
            <div class="transcript-meta">From Tokyo · Anonymous</div>
            <p class="transcript-copy">“I quit my job today. Nobody knows yet. I feel terrified and completely free at the same time...”</p>
          </article>
          <article class="transcript-card transcript-card--you">
            <div class="transcript-meta">You</div>
            <p class="transcript-copy">“That's incredible. The terrified part is the honest part.”</p>
          </article>
        </div>
        <button class="incall-end" data-action="end-call" type="button">${icon('phoneOff')} End call</button>
      </section>
    `;
  }

  private postCallTemplate(): string {
    return `
      <section class="screen" data-screen="postcall" aria-labelledby="post-title">
        ${this.statusBarTemplate('2:13 AM')}
        <div class="post-scroll">
          <div class="post-emoji" aria-hidden="true">🌌</div>
          <h2 class="post-title" id="post-title">It's over.</h2>
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

  private wallTemplate(): string {
    const posts = WALL_POSTS.map(
      ({ quote, region, age }) => `
        <article class="wall-item">
          <p class="wall-quote">“${quote}”</p>
          <div class="wall-meta"><span class="wall-dot" aria-hidden="true"></span>From somewhere in ${region} <span class="wall-dot" aria-hidden="true"></span> ${age}</div>
        </article>
      `,
    ).join('');

    return `
      <section class="screen" data-screen="wall" aria-labelledby="wall-title">
        ${this.statusBarTemplate()}
        <div class="wall-head">
          <h2 class="wall-title" id="wall-title">The Wall</h2>
          <p class="wall-subtitle">Things people wish they'd said. Anonymous. Forever.</p>
        </div>
        <div class="scroll">${posts}</div>
        ${this.bottomNavTemplate('wall')}
      </section>
    `;
  }

  private bottomNavTemplate(active: NavTarget): string {
    const navItems: Array<{ target?: NavTarget; icon: IconName; label: string; aria: string; disabled?: boolean }> = [
      { target: 'tonight', icon: 'moon', label: 'Tonight', aria: 'Tonight' },
      { target: 'wall', icon: 'message', label: 'The Wall', aria: 'Wall' },
      { icon: 'history', label: 'History', aria: 'History', disabled: true },
      { icon: 'user', label: 'Me', aria: 'Me', disabled: true },
    ];

    return `
      <nav class="bnav" aria-label="Primary navigation">
        ${navItems
          .map(
            (item) => `
              <button class="bnav-item ${active === item.target ? 'active' : ''}" ${item.target ? `data-nav="${item.target}"` : ''} type="button" aria-label="${item.aria}" ${active === item.target ? 'aria-current="page"' : ''} ${item.disabled ? 'disabled' : ''}>
                ${icon(item.icon)}${item.label}
              </button>
            `,
          )
          .join('')}
      </nav>
    `;
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
      if (navTarget === 'wall') this.setScreen('wall');
      if (action === 'welcome-next') this.setScreen('onboarding-setup');
      if (action === 'setup-next') this.handleSetupNext();
      if (action === 'enter-nightcall') this.enterNightCall();
      if (action === 'start-call') this.setScreen('calling');
      if (action === 'cancel-call' || action === 'go-home') this.setScreen(this.resolveHomeScreen());
      if (action === 'connect-call') this.startCall();
      if (action === 'end-call') this.endCall();
      if (action === 'save-word') this.saveWord();
      if (action === 'open-wall') this.setScreen('wall');
    });

    this.root.addEventListener('input', (event) => {
      const target = event.target as HTMLInputElement | HTMLSelectElement;
      if (target.matches('[data-alias-input]')) {
        this.state.onboarding.alias = target.value;
        this.saveState();
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
    });
  }

  private setScreen(screen: ScreenId, options: { skipPersistence?: boolean } = {}): void {
    this.state.activeScreen = screen;
    this.root.querySelectorAll<HTMLElement>('[data-screen]').forEach((node) => {
      const isActive = node.dataset.screen === screen;
      node.classList.toggle('active', isActive);
      node.setAttribute('aria-hidden', String(!isActive));
    });

    if (screen !== 'incall') this.stopTimer();
    if (screen === 'incall') this.startTimer();
    if (!options.skipPersistence) this.saveState();
    this.updateClockAndWindow();
  }

  private resolveHomeScreen(): ScreenId {
    return isLineOpen() ? 'home-open' : 'home-closed';
  }

  private scheduleSplashTransition(): void {
    if (this.splashTimerId !== undefined) window.clearTimeout(this.splashTimerId);
    this.splashTimerId = window.setTimeout(() => {
      this.setScreen(this.state.onboarding.completed ? this.resolveHomeScreen() : 'onboarding-welcome');
    }, 900);
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
    this.setScreen('onboarding-confirm');
  }

  private enterNightCall(): void {
    if (!this.canEnterNightCall()) {
      this.showToast('Confirm all three items first...');
      return;
    }

    this.state.onboarding.completed = true;
    this.saveState();
    this.setScreen(this.resolveHomeScreen());
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

  private startCall(): void {
    this.callRemainingSeconds = INITIAL_REMAINING_SECONDS;
    this.setScreen('incall');
    this.updateTimerDisplay();
  }

  private endCall(): void {
    this.stopTimer();
    this.state.calls += 1;
    this.saveState();
    this.updateStats();
    this.setScreen('postcall');
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
    if (this.timerId === undefined) return;
    window.clearInterval(this.timerId);
    this.timerId = undefined;
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
  }

  private saveWord(): void {
    const input = this.root.querySelector<HTMLInputElement>('[data-word-input]');
    const word = input?.value.trim().replace(/\s+/g, ' ');

    if (!word) {
      this.showToast('Type one word first...');
      input?.focus();
      return;
    }

    this.state.savedWords = [word, ...this.state.savedWords].slice(0, 25);
    this.saveState();
    if (input) input.value = '';
    this.showToast(`Word saved: “${word}” 🌙`);
    window.setTimeout(() => this.setScreen(this.resolveHomeScreen()), 1_500);
  }

  private updateStats(): void {
    this.root.querySelectorAll<HTMLElement>('[data-stat="calls"]').forEach((node) => {
      node.textContent = String(this.state.calls);
    });
    this.root.querySelectorAll<HTMLElement>('[data-stat="passes"]').forEach((node) => {
      node.textContent = String(this.state.passesLeft);
    });
    this.root.querySelectorAll<HTMLElement>('[data-stat="wall"]').forEach((node) => {
      node.textContent = String(this.state.wallCount);
    });
  }

  private showToast(message: string): void {
    const toast = this.root.querySelector<HTMLElement>('[data-toast]');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('show');
    if (this.toastTimerId !== undefined) window.clearTimeout(this.toastTimerId);
    this.toastTimerId = window.setTimeout(() => toast.classList.remove('show'), 2_500);
  }

  private updateClockAndWindow(): void {
    const now = new Date();
    const time = formatTime(now);

    this.root.querySelectorAll<HTMLElement>('[data-live-clock]').forEach((node) => {
      node.textContent = time.status;
    });

    this.root.querySelectorAll<HTMLElement>('[data-main-clock]').forEach((node) => {
      node.textContent = time.clock;
    });

    const openCountdown = this.root.querySelector<HTMLElement>('[data-open-countdown]');
    if (openCountdown) openCountdown.textContent = formatDuration(nextOpenDate(now).getTime() - now.getTime());

    const closeCountdown = this.root.querySelector<HTMLElement>('[data-close-countdown]');
    if (closeCountdown) {
      const milliseconds = closeDate(now).getTime() - now.getTime();
      const totalSeconds = Math.max(0, Math.floor(milliseconds / 1_000));
      const minutes = Math.floor(totalSeconds / 60);
      const seconds = totalSeconds % 60;
      closeCountdown.textContent = `${minutes}:${String(seconds).padStart(2, '0')}`;
    }

    const shouldBeHomeOpen = isLineOpen(now);
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
    return value.replace(/[&<>"]/g, (character) => {
      const entities: Record<string, string> = {
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
      };
      return entities[character];
    });
  }
}

const appRoot = document.querySelector<HTMLElement>('#app');

if (!appRoot) {
  throw new Error('NightCall mount node not found.');
}

new NightCallApp(appRoot);
