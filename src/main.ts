import './styles.css';

type ScreenId = 'home' | 'calling' | 'incall' | 'postcall' | 'wall';
type NavTarget = Extract<ScreenId, 'home' | 'wall'>;

type WallPost = {
  quote: string;
  region: string;
  age: string;
};

type AppState = {
  activeScreen: ScreenId;
  savedWords: string[];
  calls: number;
  passesLeft: number;
  wallCount: number;
};


type IconName = 'wifi' | 'battery' | 'phone' | 'phoneOff' | 'check' | 'moon' | 'message' | 'history' | 'user';

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
};

function icon(name: IconName): string {
  return `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">${ICON_PATHS[name]}</svg>`;
}

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

const LOCAL_STORAGE_KEY = 'nightcall:v1';
const CALL_DURATION_SECONDS = 600;
const INITIAL_REMAINING_SECONDS = 374;

class NightCallApp {
  private readonly root: HTMLElement;
  private state: AppState;
  private callRemainingSeconds = INITIAL_REMAINING_SECONDS;
  private timerId: number | undefined;
  private toastTimerId: number | undefined;

  constructor(root: HTMLElement) {
    this.root = root;
    this.state = this.loadState();
    this.render();
    this.bindEvents();
    this.updateClock();
    this.updateTimerDisplay();
    window.setInterval(() => this.updateClock(), 30_000);
    document.addEventListener('visibilitychange', () => this.handleVisibilityChange());
  }

  private loadState(): AppState {
    const defaultState: AppState = {
      activeScreen: 'home',
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
        activeScreen: 'home',
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
          ${this.homeTemplate()}
          ${this.callingTemplate()}
          ${this.inCallTemplate()}
          ${this.postCallTemplate()}
          ${this.wallTemplate()}
        </div>
      </section>
    `;
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

  private homeTemplate(): string {
    return `
      <section class="screen active" data-screen="home" aria-labelledby="home-title">
        ${this.statusBarTemplate('2:00 AM', true)}
        <div class="nc-hero">
          <h1 class="nc-logo" id="home-title">Night<span>Call</span></h1>
          <p class="nc-tagline">10 minutes. One stranger. Then it's over.</p>
        </div>
        <div class="nc-time-card">
          <div class="nc-time-label">Right now</div>
          <div class="nc-clock" data-main-clock>2:00</div>
          <div class="nc-clock-sub">The line is open</div>
          <div class="nc-window">
            <div class="nc-window-dot" aria-hidden="true"></div>
            <div class="nc-window-text"><strong>2,847 people</strong> are awake right now. One of them is about to talk to you.</div>
          </div>
        </div>
        <button class="nc-call-btn" data-action="start-call" type="button">
          ${icon('phone')} Call a Stranger
        </button>
        <div class="nc-stats" aria-label="Tonight stats">
          <article class="nc-stat"><div class="nc-stat-num" data-stat="calls">${this.state.calls}</div><div class="nc-stat-label">My calls</div></article>
          <article class="nc-stat"><div class="nc-stat-num" data-stat="passes">${this.state.passesLeft}</div><div class="nc-stat-label">Passes left</div></article>
          <article class="nc-stat"><div class="nc-stat-num" data-stat="wall">${this.state.wallCount}</div><div class="nc-stat-label">On The Wall</div></article>
        </div>
        ${this.bottomNavTemplate('home')}
      </section>
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
    const navItems: Array<{ target: NavTarget; icon: IconName; label: string; aria: string }> = [
      { target: 'home', icon: 'moon', label: 'Tonight', aria: 'Home' },
      { target: 'wall', icon: 'message', label: 'The Wall', aria: 'Wall' },
    ];

    const disabledItems: Array<{ icon: IconName; label: string; aria: string }> = [
      { icon: 'history', label: 'History', aria: 'History' },
      { icon: 'user', label: 'Me', aria: 'Me' },
    ];

    return `
      <nav class="bnav" aria-label="Primary navigation">
        ${navItems
          .map(
            (item) => `
              <button class="bnav-item ${active === item.target ? 'active' : ''}" data-nav="${item.target}" type="button" aria-label="${item.aria}" aria-current="${active === item.target ? 'page' : 'false'}">
                ${icon(item.icon)}${item.label}
              </button>
            `,
          )
          .join('')}
        ${disabledItems
          .map(
            (item) => `
              <button class="bnav-item" type="button" aria-label="${item.aria}" disabled>
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

      if (navTarget) this.setScreen(navTarget);
      if (action === 'start-call') this.setScreen('calling');
      if (action === 'cancel-call' || action === 'go-home') this.setScreen('home');
      if (action === 'connect-call') this.startCall();
      if (action === 'end-call') this.endCall();
      if (action === 'save-word') this.saveWord();
      if (action === 'open-wall') this.setScreen('wall');
    });
  }

  private setScreen(screen: ScreenId): void {
    this.state.activeScreen = screen;
    this.root.querySelectorAll<HTMLElement>('[data-screen]').forEach((node) => {
      const isActive = node.dataset.screen === screen;
      node.classList.toggle('active', isActive);
      node.setAttribute('aria-hidden', String(!isActive));
    });

    if (screen !== 'incall') this.stopTimer();
    if (screen === 'incall') this.startTimer();
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
    const minutes = Math.floor(this.callRemainingSeconds / 60);
    const seconds = String(this.callRemainingSeconds % 60).padStart(2, '0');
    const percentage = Math.round((this.callRemainingSeconds / CALL_DURATION_SECONDS) * 100);

    this.root.querySelector<HTMLElement>('[data-timer-text]')!.textContent = `${minutes}:${seconds} remaining`;
    this.root.querySelector<HTMLElement>('[data-timer-fill]')!.style.width = `${percentage}%`;
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
    window.setTimeout(() => this.setScreen('home'), 1_500);
  }

  private updateStats(): void {
    this.root.querySelector<HTMLElement>('[data-stat="calls"]')!.textContent = String(this.state.calls);
    this.root.querySelector<HTMLElement>('[data-stat="passes"]')!.textContent = String(this.state.passesLeft);
    this.root.querySelector<HTMLElement>('[data-stat="wall"]')!.textContent = String(this.state.wallCount);
  }

  private showToast(message: string): void {
    const toast = this.root.querySelector<HTMLElement>('[data-toast]');
    if (!toast) return;

    toast.textContent = message;
    toast.classList.add('show');
    if (this.toastTimerId !== undefined) window.clearTimeout(this.toastTimerId);
    this.toastTimerId = window.setTimeout(() => toast.classList.remove('show'), 2_500);
  }

  private updateClock(): void {
    const now = new Date();
    const hours = now.getHours();
    const minutes = String(now.getMinutes()).padStart(2, '0');
    const period = hours >= 12 ? 'PM' : 'AM';
    const hour12 = hours % 12 || 12;

    this.root.querySelectorAll<HTMLElement>('[data-live-clock]').forEach((node) => {
      node.textContent = `${hour12}:${minutes} ${period}`;
    });

    const mainClock = this.root.querySelector<HTMLElement>('[data-main-clock]');
    if (mainClock) mainClock.textContent = `${hour12}:${minutes}`;
  }

  private handleVisibilityChange(): void {
    if (document.hidden) {
      this.stopTimer();
      return;
    }

    if (this.state.activeScreen === 'incall') this.startTimer();
    this.updateClock();
  }
}

const appRoot = document.querySelector<HTMLElement>('#app');

if (!appRoot) {
  throw new Error('NightCall mount node not found.');
}

new NightCallApp(appRoot);
