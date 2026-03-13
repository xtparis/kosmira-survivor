/**
 * Build-time Monte Carlo simulation script
 * Τρέχει κατά το build και γράφει το αποτέλεσμα στο src/simulation-result.json
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const SIMULATIONS = 10000

// ─── Load data ───────────────────────────────────────────────────────────────
const data = JSON.parse(readFileSync(join(__dirname, '../src/data.json'), 'utf-8'))
const { fixtures, relegationZone, myTeam: myTeamName } = data

// ─── Βαθμολογία από fixtures ─────────────────────────────────────────────────
function calcStandings(fixtures) {
  const stats = {}
  fixtures.forEach(f => {
    if (!stats[f.home]) stats[f.home] = { name: f.home, points: 0, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0 }
    if (!stats[f.away]) stats[f.away] = { name: f.away, points: 0, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0 }

    if (f.homeGoals === null || f.awayGoals === null) return

    const h = stats[f.home]
    const a = stats[f.away]
    h.played++; a.played++
    h.gf += f.homeGoals; h.ga += f.awayGoals
    a.gf += f.awayGoals; a.ga += f.homeGoals

    if (f.homeGoals > f.awayGoals) {
      h.wins++; h.points += 3; a.losses++
    } else if (f.homeGoals < f.awayGoals) {
      a.wins++; a.points += 3; h.losses++
    } else {
      h.draws++; h.points++; a.draws++; a.points++
    }
  })

  return Object.values(stats).sort((a, b) =>
    b.points !== a.points ? b.points - a.points : (b.gf - b.ga) - (a.gf - a.ga)
  )
}

// ─── Πιθανότητες ομάδας ──────────────────────────────────────────────────────
function getTeamProbs(team) {
  if (!team || team.played === 0) return { win: 0.33, draw: 0.33, loss: 0.34 }
  return {
    win:  team.wins   / team.played,
    draw: team.draws  / team.played,
    loss: team.losses / team.played,
  }
}

// ─── Προσομοίωση ματς ────────────────────────────────────────────────────────
function simulateMatch(homeTeam, awayTeam) {
  const hp = getTeamProbs(homeTeam)
  const ap = getTeamProbs(awayTeam)
  const pHomeWin = (hp.win + ap.loss) / 2
  const pDraw    = (hp.draw + ap.draw) / 2
  const r = Math.random()
  if (r < pHomeWin) return 'home'
  if (r < pHomeWin + pDraw) return 'draw'
  return 'away'
}

// ─── Monte Carlo ──────────────────────────────────────────────────────────────
function runMonteCarlo(standings, pendingFixtures, myTeamName, safePos) {
  let savedCount = 0
  let totalSafetyLine = 0
  let totalMyPoints = 0

  const teamMap = {}
  standings.forEach(t => { teamMap[t.name] = t })

  for (let i = 0; i < SIMULATIONS; i++) {
    const pts = {}
    standings.forEach(t => { pts[t.name] = t.points })

    pendingFixtures.forEach(f => {
      const result = simulateMatch(teamMap[f.home], teamMap[f.away])
      if (result === 'home') pts[f.home] += 3
      else if (result === 'draw') { pts[f.home] += 1; pts[f.away] += 1 }
      else pts[f.away] += 3
    })

    const finalStandings = Object.entries(pts)
      .map(([name, points]) => ({ name, points }))
      .sort((a, b) => b.points - a.points)

    const safetyLine = finalStandings[safePos - 1].points
    const myPoints = pts[myTeamName]

    totalSafetyLine += safetyLine
    totalMyPoints += myPoints
    if (myPoints >= safetyLine) savedCount++
  }

  return {
    survivalPct: Math.round((savedCount / SIMULATIONS) * 100),
    avgSafetyLine: Math.round(totalSafetyLine / SIMULATIONS),
    avgMyPoints: Math.round(totalMyPoints / SIMULATIONS),
  }
}

// ─── Run ──────────────────────────────────────────────────────────────────────
const standings = calcStandings(fixtures)
const pendingFixtures = fixtures.filter(f => f.homeGoals === null || f.awayGoals === null)
const totalTeams = standings.length
const safePos = totalTeams - relegationZone

console.log(`🎲 Running Monte Carlo simulation (${SIMULATIONS.toLocaleString()} iterations)...`)
const result = runMonteCarlo(standings, pendingFixtures, myTeamName, safePos)
console.log(`✅ Done! Survival: ${result.survivalPct}% | Avg safety line: ${result.avgSafetyLine} | Avg my points: ${result.avgMyPoints}`)

// ─── Write result ─────────────────────────────────────────────────────────────
const output = {
  simulatedAt: new Date().toISOString(),
  simulations: SIMULATIONS,
  survivalPct: result.survivalPct,
  avgSafetyLine: result.avgSafetyLine,
  avgMyPoints: result.avgMyPoints,
}

writeFileSync(
  join(__dirname, '../src/simulation-result.json'),
  JSON.stringify(output, null, 2)
)

console.log(`📄 Result written to src/simulation-result.json`)
