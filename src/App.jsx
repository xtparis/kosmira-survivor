import { useState, useEffect } from 'react'
import data from './data.json'
import { calcScenarios } from './calc.js'
import './App.css'

const SCENARIOS = [
  { key: 'base',  label: '📊 Βασικό',    color: 'var(--green)' },
  { key: 'worst', label: '🔴 Χειρότερο', color: 'var(--red)'   },
  { key: 'best',  label: '🔵 Καλύτερο',  color: 'var(--blue)'  },
]

function useAnimatedNumber(target) {
  const [display, setDisplay] = useState(target)
  useEffect(() => {
    let start = null
    const from = display
    const to = target
    if (from === to) return
    const duration = 600
    const step = (ts) => {
      if (!start) start = ts
      const progress = Math.min((ts - start) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(from + (to - from) * ease))
      if (progress < 1) requestAnimationFrame(step)
    }
    requestAnimationFrame(step)
  }, [target])
  return display
}

function PointsDisplay({ value, color }) {
  const animated = useAnimatedNumber(value)
  return (
    <div className="points-big" style={{ color }}>
      {animated}
    </div>
  )
}

function ScenarioSwitcher({ active, onChange }) {
  return (
    <div className="scenario-switcher">
      {SCENARIOS.map(s => (
        <button
          key={s.key}
          className={`scenario-btn ${active === s.key ? 'active' : ''}`}
          style={active === s.key ? { color: s.color, borderBottomColor: s.color } : {}}
          onClick={() => onChange(s.key)}
        >
          {s.label}
        </button>
      ))}
    </div>
  )
}

function MainCard({ scenario, calc }) {
  const sc = calc[scenario]
  const { myTeam, remaining } = calc
  const needed = sc.needed
  const maxPossible = myTeam.points + remaining * 3

  let accentColor = 'var(--green)'
  if (scenario === 'worst') accentColor = 'var(--red)'
  if (scenario === 'best') accentColor = 'var(--blue)'

  // Urgency color for base scenario
  if (scenario === 'base') {
    if (needed > remaining * 2.5) accentColor = 'var(--red)'
    else if (needed > remaining * 1.5) accentColor = 'var(--yellow)'
  }

  return (
    <div className="card main-card" style={{ '--accent': accentColor }}>
      <div className="card-accent-line" />
      <div className="scenario-tag">
        {SCENARIOS.find(s => s.key === scenario).label.replace(/^[^ ]+ /, '')} Σενάριο
      </div>

      <PointsDisplay value={needed} color={accentColor} />
      <div className="points-label">βαθμοί για σωτηρία</div>

      <div className="stats-row">
        <div className="stat">
          <span className="stat-val">{myTeam.points}</span>
          <span className="stat-lbl">Τρέχοντες</span>
        </div>
        <div className="stat">
          <span className="stat-val">{remaining}</span>
          <span className="stat-lbl">Αγώνες</span>
        </div>
        <div className="stat">
          <span className="stat-val">{maxPossible}</span>
          <span className="stat-lbl">Μέγιστοι</span>
        </div>
      </div>

      <p className="scenario-desc">{sc.desc}</p>
    </div>
  )
}

function StatusCard({ calc }) {
  const { myPos, totalTeams, myTeam, safetyTeam, isSafe } = calc
  const gap = safetyTeam.points - myTeam.points

  return (
    <div className="card status-card">
      <div className="status-left">
        <div className="big-pos" style={{ color: isSafe ? 'var(--green)' : 'var(--red)' }}>
          {myPos}
        </div>
        <div>
          <div className="pos-label">Θέση από {totalTeams}</div>
          <div className={`badge ${isSafe ? 'badge-safe' : 'badge-danger'}`}>
            {isSafe ? '✓ Ασφαλής' : '⚠ Υποβιβασμός'}
          </div>
        </div>
      </div>
      <div className="status-right">
        <div className="gap-val" style={{ color: gap > 0 ? 'var(--yellow)' : 'var(--green)' }}>
          {gap > 0 ? `+${gap}` : '✓'}
        </div>
        <div className="gap-lbl">
          {gap > 0 ? `βαθμοί από ${safetyTeam.name.split('.').pop().trim()}` : 'Πάνω από τη γραμμή'}
        </div>
      </div>
    </div>
  )
}

function NextMatchCard({ nextMatch }) {
  return (
    <div className="card next-match-card">
      <div className="match-tag">⚽ Επόμενος Αγώνας</div>
      <div className="match-opponent">{nextMatch.opponent}</div>
      <div className="match-when">{nextMatch.date} &bull; {nextMatch.time}</div>
    </div>
  )
}

function LeagueTable({ calc, myTeamName }) {
  const { sorted, safePos } = calc

  return (
    <div className="table-wrap">
      <div className="section-title">Βαθμολογία</div>
      <table className="league-table">
        <thead>
          <tr>
            <th>#</th>
            <th>Ομάδα</th>
            <th>ΑΓ</th>
            <th>Β</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map((team, i) => {
            const pos = i + 1
            const isMe = team.name === myTeamName
            const isRel = pos > safePos
            const isRelLine = pos === safePos + 1

            return (
              <tr
                key={team.name}
                className={[
                  isMe ? 'row-me' : '',
                  isRel && !isMe ? 'row-rel' : '',
                  isRelLine ? 'row-rel-line' : '',
                ].join(' ')}
              >
                <td className="col-pos">{pos}</td>
                <td className="col-name">
                  {isMe && <span className="me-dot" />}
                  {team.name}
                </td>
                <td className="col-num">{team.played}</td>
                <td className="col-pts">{team.points}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

export default function App() {
  const [scenario, setScenario] = useState('base')
  const calc = calcScenarios(data)

  return (
    <div className="app">
      <div className="bg-grid" />
      <div className="container">
        <header>
          <div className="header-eyebrow">Ερασιτεχνικό Πρωτάθλημα</div>
          <h1 className="header-title">Α.Ο. ΚΟΣΜΗΡΑΣ</h1>
          <div className="header-sub">Survival Tracker</div>
        </header>

        <ScenarioSwitcher active={scenario} onChange={setScenario} />
        <MainCard scenario={scenario} calc={calc} />
        <StatusCard calc={calc} />
        <NextMatchCard nextMatch={data.nextMatch} />
        <LeagueTable calc={calc} myTeamName={data.myTeam} />

        <footer>
          <span>Τελευταία ενημέρωση: {new Date().toLocaleDateString('el-GR')}</span>
        </footer>
      </div>
    </div>
  )
}
