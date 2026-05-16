import { StrictMode, useEffect, useMemo, useState } from 'react';
import { createRoot } from 'react-dom/client';
import {
  BatteryMedium,
  Check,
  History,
  MessageCircle,
  Moon,
  Phone,
  PhoneOff,
  User,
  Wifi,
} from 'lucide-react';
import './styles.css';

type ScreenId = 'home' | 'calling' | 'incall' | 'postcall' | 'wall';

type ToastState = {
  message: string;
  visible: boolean;
};

type WallPost = {
  quote: string;
  location: string;
  age: string;
};

const TOTAL_CALL_SECONDS = 10 * 60;
const INITIAL_CALL_SECONDS = 6 * 60 + 14;

const wallPosts: WallPost[] = [
  {
    quote:
      "I told a stranger I loved someone I've never admitted loving. Saying it out loud to nobody made it more real than anything.",
    location: 'Brazil',
    age: '2h ago',
  },
  {
    quote: "My word was 'lighter'. I didn't expect to mean it.",
    location: 'the UK',
    age: '4h ago',
  },
  {
    quote:
      "They said 'you\'re the first person I\'ve told.' I'll carry that forever even though I'll never know their name.",
    location: 'Canada',
    age: '6h ago',
  },
  {
    quote:
      "I hung up after 3 minutes because I started crying. I don't know why I'm posting this. I guess I just want someone to know it happened.",
    location: 'India',
    age: '9h ago',
  },
  {
    quote:
      "Asked them what they'd do if they weren't afraid. They went silent for 45 seconds. Then said 'go home.'",
    location: 'Germany',
    age: '11h ago',
  },
];

function formatClock(date: Date, withMeridiem = true) {
  const hours = date.getHours();
  const minutes = date.getMinutes().toString().padStart(2, '0');
  const hour12 = hours % 12 || 12;
  return withMeridiem
    ? `${hour12}:${minutes} ${hours >= 12 ? 'PM' : 'AM'}`
    : `${hour12}:${minutes}`;
}

function formatDuration(seconds: number) {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainder = (safeSeconds % 60).toString().padStart(2, '0');
  return `${minutes}:${remainder}`;
}

function StatusBar({ time, showBattery = false }: { time: string; showBattery?: boolean }) {
  return (
    <div className="sbar" aria-label="Device status">
      <span className="sbar-time">{time}</span>
      <div className="sbar-icons" aria-hidden="true">
        <Wifi size={13} strokeWidth={2} />
        {showBattery ? <BatteryMedium size={14} strokeWidth={2} /> : null}
      </div>
    </div>
  );
}

function BottomNav({ active, setScreen }: { active: ScreenId; setScreen: (screen: ScreenId) => void }) {
  const items = [
    { id: 'home' as const, label: 'Tonight', icon: Moon, ariaLabel: 'Home' },
    { id: 'wall' as const, label: 'The Wall', icon: MessageCircle, ariaLabel: 'Wall' },
    { id: 'history' as const, label: 'History', icon: History, ariaLabel: 'History' },
    { id: 'me' as const, label: 'Me', icon: User, ariaLabel: 'Me' },
  ];

  return (
    <nav className="bnav" aria-label="Primary navigation">
      {items.map(({ id, label, icon: Icon, ariaLabel }) => {
        const isInteractive = id === 'home' || id === 'wall';
        const isActive = active === id;
        return (
          <button
            className={`bnav-item${isActive ? ' active' : ''}`}
            key={id}
            type="button"
            aria-current={isActive ? 'page' : undefined}
            aria-label={ariaLabel}
            disabled={!isInteractive}
            onClick={() => isInteractive && setScreen(id)}
          >
            <Icon size={20} strokeWidth={1.8} aria-hidden="true" />
            {label}
          </button>
        );
      })}
    </nav>
  );
}

function HomeScreen({ currentTime, setScreen }: { currentTime: Date; setScreen: (screen: ScreenId) => void }) {
  return (
    <section className="screen active" aria-labelledby="nightcall-title">
      <StatusBar time={formatClock(currentTime)} showBattery />
      <header className="nc-hero">
        <h1 className="nc-logo" id="nightcall-title">
          Night<span>Call</span>
        </h1>
        <p className="nc-tagline">10 minutes. One stranger. Then it's over.</p>
      </header>

      <main className="home-main">
        <section className="nc-time-card" aria-labelledby="right-now-label">
          <div className="nc-time-label" id="right-now-label">
            Right now
          </div>
          <div className="nc-clock" aria-label={`Current time ${formatClock(currentTime)}`}>
            {formatClock(currentTime, false)}
          </div>
          <div className="nc-clock-sub">The line is open</div>
          <div className="nc-window">
            <div className="nc-window-dot" aria-hidden="true" />
            <p className="nc-window-text">
              <strong>2,847 people</strong> are awake right now. One of them is about to talk to you.
            </p>
          </div>
        </section>

        <button className="nc-call-btn" type="button" onClick={() => setScreen('calling')}>
          <Phone size={18} strokeWidth={2} aria-hidden="true" />
          Call a Stranger
        </button>

        <section className="nc-stats" aria-label="NightCall stats">
          <article className="nc-stat">
            <div className="nc-stat-num">7</div>
            <div className="nc-stat-label">My calls</div>
          </article>
          <article className="nc-stat">
            <div className="nc-stat-num">2</div>
            <div className="nc-stat-label">Passes left</div>
          </article>
          <article className="nc-stat">
            <div className="nc-stat-num">43</div>
            <div className="nc-stat-label">On The Wall</div>
          </article>
        </section>
      </main>

      <BottomNav active="home" setScreen={setScreen} />
    </section>
  );
}

function CallingScreen({ setScreen }: { setScreen: (screen: ScreenId) => void }) {
  return (
    <section className="screen active" aria-labelledby="calling-title">
      <StatusBar time="2:00 AM" />
      <main className="calling-bg">
        <div className="calling-ring" aria-hidden="true">
          <div className="calling-emoji">🌙</div>
        </div>
        <div className="calling-label">Connecting</div>
        <h2 className="calling-title" id="calling-title">
          Finding your stranger...
        </h2>
        <p className="calling-sub">
          Somewhere in the world,
          <br />
          someone is waiting too.
        </p>
        <div className="call-actions" aria-label="Calling actions">
          <div className="call-action">
            <button
              className="call-action-btn call-end"
              type="button"
              onClick={() => setScreen('home')}
              aria-label="Cancel call"
            >
              <PhoneOff size={23} strokeWidth={2} aria-hidden="true" />
            </button>
            <div className="call-action-label">Cancel</div>
          </div>
          <div className="call-action">
            <button
              className="call-action-btn call-connect"
              type="button"
              onClick={() => setScreen('incall')}
              aria-label="Connect to stranger"
            >
              <Check size={25} strokeWidth={2.4} aria-hidden="true" />
            </button>
            <div className="call-action-label">Connect</div>
          </div>
        </div>
      </main>
    </section>
  );
}

function InCallScreen({ remainingSeconds, setScreen }: { remainingSeconds: number; setScreen: (screen: ScreenId) => void }) {
  const progress = Math.round((remainingSeconds / TOTAL_CALL_SECONDS) * 100);

  return (
    <section className="screen active" aria-labelledby="incall-question">
      <StatusBar time="2:03 AM" />
      <header className="incall-top">
        <h2 className="incall-qs" id="incall-question">
          &quot;What's something you've been carrying alone that you wish someone knew?&quot;
        </h2>
        <div className="timer-bar" aria-hidden="true">
          <div className="timer-fill" style={{ width: `${progress}%` }} />
        </div>
        <div className="timer-text" aria-live="polite">
          {formatDuration(remainingSeconds)} remaining
        </div>
      </header>

      <main className="incall-scroll">
        <section className="incall-wave" aria-label="Stranger speaking indicator">
          <div className="wave-bars" aria-hidden="true">
            {[8, 16, 12, 20, 10].map((height, index) => (
              <div className="wave-bar" key={`${height}-${index}`} style={{ height }} />
            ))}
          </div>
          <div className="wave-label">Your stranger is speaking...</div>
        </section>
        <aside className="incall-hint">
          &quot;The best NightCalls happen when you say the thing you've never said out loud. This stranger
          won't remember your name. That's the point.&quot;
        </aside>
        <article className="message-card">
          <div className="message-meta">From Tokyo · Anonymous</div>
          <p className="message-copy">
            &quot;I quit my job today. Nobody knows yet. I feel terrified and completely free at the same
            time...&quot;
          </p>
        </article>
        <article className="message-card">
          <div className="message-meta message-meta-you">You</div>
          <p className="message-copy message-copy-you">
            &quot;That's incredible. The terrified part is the honest part.&quot;
          </p>
        </article>
      </main>

      <button className="incall-end" type="button" onClick={() => setScreen('postcall')}>
        <PhoneOff size={17} strokeWidth={2} aria-hidden="true" />
        End call
      </button>
    </section>
  );
}

function PostCallScreen({ saveWord, setScreen }: { saveWord: (word: string) => void; setScreen: (screen: ScreenId) => void }) {
  const [word, setWord] = useState('');

  return (
    <section className="screen active" aria-labelledby="post-call-title">
      <StatusBar time="2:13 AM" />
      <main className="post-scroll">
        <div className="post-emoji" aria-hidden="true">
          🌌
        </div>
        <h2 className="post-title" id="post-call-title">
          It's over.
        </h2>
        <p className="post-sub">
          That conversation existed for exactly 10 minutes. You'll never speak to them again. That made
          it real.
        </p>
        <label className="word-card">
          <span className="word-label">One word. That's all you keep.</span>
          <input
            className="word-input"
            placeholder="free..."
            maxLength={20}
            value={word}
            onChange={(event) => setWord(event.target.value)}
          />
        </label>
        <button className="post-btn" type="button" onClick={() => saveWord(word)}>
          Save my word
        </button>
        <button className="wall-btn" type="button" onClick={() => setScreen('wall')}>
          Post something to The Wall
        </button>
        <button className="wall-btn wall-btn-muted" type="button" onClick={() => setScreen('home')}>
          Go back to tonight
        </button>
      </main>
    </section>
  );
}

function WallScreen({ setScreen }: { setScreen: (screen: ScreenId) => void }) {
  return (
    <section className="screen active" aria-labelledby="wall-title">
      <StatusBar time="2:00 AM" />
      <header className="wall-header">
        <h2 id="wall-title">The Wall</h2>
        <p>Things people wish they'd said. Anonymous. Forever.</p>
      </header>
      <main className="scroll">
        {wallPosts.map((post) => (
          <article className="wall-item" key={`${post.location}-${post.age}`}>
            <p className="wall-quote">&quot;{post.quote}&quot;</p>
            <div className="wall-meta">
              <span className="wall-dot" aria-hidden="true" />
              From somewhere in {post.location}
              <span className="wall-dot" aria-hidden="true" />
              {post.age}
            </div>
          </article>
        ))}
      </main>
      <BottomNav active="wall" setScreen={setScreen} />
    </section>
  );
}

function NightCallApp() {
  const [screen, setScreen] = useState<ScreenId>('home');
  const [currentTime, setCurrentTime] = useState(() => new Date());
  const [remainingSeconds, setRemainingSeconds] = useState(INITIAL_CALL_SECONDS);
  const [toast, setToast] = useState<ToastState>({ message: 'Connecting...', visible: false });

  useEffect(() => {
    const clockId = window.setInterval(() => setCurrentTime(new Date()), 30_000);
    return () => window.clearInterval(clockId);
  }, []);

  useEffect(() => {
    if (screen !== 'incall') {
      return undefined;
    }

    const timerId = window.setInterval(() => {
      setRemainingSeconds((seconds) => Math.max(0, seconds - 1));
    }, 1_000);

    return () => window.clearInterval(timerId);
  }, [screen]);

  useEffect(() => {
    if (!toast.visible) {
      return undefined;
    }

    const toastId = window.setTimeout(() => {
      setToast((previous) => ({ ...previous, visible: false }));
    }, 2_500);

    return () => window.clearTimeout(toastId);
  }, [toast.visible, toast.message]);

  const screenContent = useMemo(() => {
    switch (screen) {
      case 'calling':
        return <CallingScreen setScreen={setScreen} />;
      case 'incall':
        return <InCallScreen remainingSeconds={remainingSeconds} setScreen={setScreen} />;
      case 'postcall':
        return <PostCallScreen saveWord={saveWord} setScreen={setScreen} />;
      case 'wall':
        return <WallScreen setScreen={setScreen} />;
      case 'home':
      default:
        return <HomeScreen currentTime={currentTime} setScreen={setScreen} />;
    }
  }, [currentTime, remainingSeconds, screen]);

  function saveWord(rawWord: string) {
    const trimmedWord = rawWord.trim();

    if (!trimmedWord) {
      setToast({ message: 'Type one word first...', visible: true });
      return;
    }

    setToast({ message: `Word saved: "${trimmedWord}" 🌙`, visible: true });
    window.setTimeout(() => setScreen('home'), 1_500);
  }

  return (
    <div className="wrap">
      <div className="phone" id="nc-phone">
        <div className={`toast${toast.visible ? ' show' : ''}`} role="status" aria-live="polite">
          {toast.message}
        </div>
        {screenContent}
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <NightCallApp />
  </StrictMode>,
);
