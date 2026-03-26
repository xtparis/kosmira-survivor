/**
 * Υπολογίζει βαθμολογία από τα fixtures και τα 3 σενάρια σωτηρίας.
 * - Βασικό: Monte Carlo simulation (10.000 επαναλήψεις)
 * - Χειρότερο: deterministic, ευνοεί τις ομάδες πάνω από εμάς
 * - Καλύτερο: deterministic, ευνοεί εμάς
 */
import simResult from './simulation-result.json'
const SIMULATIONS = 10000

// ─── Βαθμολογία από fixtures ─────────────────────────────────────────────────
export function calcStandings(fixtures, adjustments = []) {
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

  adjustments.forEach(adj => {
      if (stats[adj.team]) stats[adj.team].points += adj.points
  })

  return Object.values(stats).sort((a, b) =>
    b.points !== a.points ? b.points - a.points : (b.gf - b.ga) - (a.gf - a.ga)
  )
}

// ─── Πιθανότητες ομάδας βάσει ιστορικού ─────────────────────────────────────
function getTeamProbs(team) {
  if (!team || team.played === 0) return { win: 0.33, draw: 0.33, loss: 0.34 }
  return {
    win:  team.wins   / team.played,
    draw: team.draws  / team.played,
    loss: team.losses / team.played,
  }
}

// ─── Προσομοίωση ενός ματς ───────────────────────────────────────────────────
function simulateMatch(homeTeam, awayTeam) {
  const hp = getTeamProbs(homeTeam)
  const ap = getTeamProbs(awayTeam)

  const pHomeWin = (hp.win  + ap.loss) / 2
  const pDraw    = (hp.draw + ap.draw) / 2

  const r = Math.random()
  if (r < pHomeWin) return 'home'
  if (r < pHomeWin + pDraw) return 'draw'
  return 'away'
}

// ─── Χειρότερο σενάριο ───────────────────────────────────────────────────────
// Ευνοεί τις ομάδες πάνω από εμάς:
// - Ομάδα safe vs ζώνη → κερδίζει η safe
// - Μεταξύ ομάδων ζώνης → κερδίζει η υψηλότερη (ανεβαίνουν οι πιο ψηλά)
// - Μεταξύ safe ομάδων → ισοπαλία (δεν επηρεάζει)
function calcWorstCase(standings, pendingFixtures, myTeamName, safePos) {
  const pts = {}
  standings.forEach(t => { pts[t.name] = t.points })

  pendingFixtures.forEach(f => {
    const homePos = standings.findIndex(t => t.name === f.home) + 1
    const awayPos = standings.findIndex(t => t.name === f.away) + 1
    const homeInZone = homePos > safePos
    const awayInZone = awayPos > safePos
    if (homeInZone && !awayInZone) {
      if (f.home === myTeamName) {
        // Εμείς vs safe → χάνουμε
        pts[f.away] += 3
      } else {
        pts[f.home] += 3
      }
    } else if (!homeInZone && awayInZone) {
      if (f.away === myTeamName) {
        // Safe vs εμείς → χάνουμε
        pts[f.home] += 3
      } else {
        pts[f.away] += 3
      }
    } else if (homeInZone && awayInZone) {
      if (f.home === myTeamName) {
        pts[f.away] += 3
      } else if (f.away === myTeamName) {
        pts[f.home] += 3
      } else {
        // Μεταξύ ζώνης → κερδίζει η χαμηλότερη
        if (homePos > awayPos) pts[f.home] += 3
        else pts[f.away] += 3
      }
    } else {
      pts[f.home] += 1; pts[f.away] += 1
    }
  })

  const finalStandings = Object.entries(pts)
    .map(([name, points]) => ({ name, points }))
    .sort((a, b) => b.points - a.points)

  const safetyLine = finalStandings[safePos - 1].points
  const myPoints = pts[myTeamName]

  return {
    needed: Math.max(0, safetyLine - myPoints),
    safetyLine,
    myFinalPoints: myPoints,
  }
}

// ─── Καλύτερο σενάριο ────────────────────────────────────────────────────────
// Ευνοεί εμάς:
// - Ομάδα safe vs ζώνη → κερδίζει η safe (ρεαλιστικό)
// - Μεταξύ ομάδων ζώνης → κερδίζει η χαμηλότερη (μένουν χαμηλά)
// - Μεταξύ safe ομάδων → ισοπαλία
function calcBestCase(standings, pendingFixtures, myTeamName, safePos) {
  const pts = {}
  standings.forEach(t => { pts[t.name] = t.points })

  pendingFixtures.forEach(f => {
    const homePos = standings.findIndex(t => t.name === f.home) + 1
    const awayPos = standings.findIndex(t => t.name === f.away) + 1
    const homeIsSafe = homePos <= safePos
    const awayIsSafe = awayPos <= safePos

    if (homeIsSafe && !awayIsSafe) {
      pts[f.home] += 3
    } else if (!homeIsSafe && awayIsSafe) {
      pts[f.away] += 3
    } else if (!homeIsSafe && !awayIsSafe) {
      // Μεταξύ ζώνης: κερδίζει η χαμηλότερη (μένουν χαμηλά)
      if (homePos > awayPos) pts[f.home] += 3
      else pts[f.away] += 3
    } else {
      pts[f.home] += 1; pts[f.away] += 1
    }
  })

  const finalStandings = Object.entries(pts)
    .map(([name, points]) => ({ name, points }))
    .sort((a, b) => b.points - a.points)

  const safetyLine = finalStandings[safePos - 1].points
  const myPoints = pts[myTeamName]

  return {
    needed: Math.max(0, safetyLine - myPoints),
    safetyLine,
    myFinalPoints: myPoints,
  }
}

// ─── Κύρια συνάρτηση ─────────────────────────────────────────────────────────
export function calcScenarios(data) {
  const { relegationZone, fixtures, myTeam: myTeamName } = data

  const sorted = calcStandings(fixtures, data.pointsAdjustments)
  const myTeam = sorted.find(t => t.name === myTeamName)
  const myPos = sorted.findIndex(t => t.name === myTeamName) + 1
  const totalTeams = sorted.length
  const safePos = totalTeams - relegationZone
  const safetyTeam = sorted[safePos - 1]

  // Υπόλοιπα ματς που αφορούν ομάδες που έχουν ακόμα αγώνες
  const pendingFixtures = fixtures.filter(f => f.homeGoals === null || f.awayGoals === null)

  // Υπόλοιποι αγώνες της δικής μας ομάδας
  const remaining = pendingFixtures.filter(f => f.home === myTeamName || f.away === myTeamName).length

  const baseRate = myTeam.played > 0 ? (myTeam.points / myTeam.played).toFixed(2) : '0.00'

  // ─── Monte Carlo ─────────────────────────────────────────────────────────
  const mc = simResult  // αντί για runMonteCarlo(...)
  const baseNeeded = Math.max(0, data.manualSafetyLine - myTeam.points)

  // ─── Worst / Best ─────────────────────────────────────────────────────────
  const worst = calcWorstCase(sorted, pendingFixtures, myTeamName, safePos)
  const best  = calcBestCase(sorted, pendingFixtures, myTeamName, safePos)
  const bestNeeded = Math.min(best.needed, data.manualBestCase - myTeam.points)


  return {
    sorted,
    myTeam,
    myPos,
    remaining,
    totalTeams,
    safePos,
    safetyTeam,
    isSafe: myPos <= safePos,

    base: {
      needed: baseNeeded,
      safetyLine: data.manualSafetyLine,
      simulatedSafetyLine: mc.avgSafetyLine,  // ← για το σχόλιο
      survivalPct: mc.survivalPct,
      rate: baseRate,
      desc: `Εκτίμηση: σωτηρία στους ${data.manualSafetyLine} βαθμούς. Έχει γίνει Simulation (${SIMULATIONS.toLocaleString()} επαναλήψεις) που βγάζει την ζώνη στους ~${mc.avgSafetyLine} βαθμούς. (${mc.survivalPct}% πιθανότητα σωτηρίας).`,
    },
    worst: {
      needed: worst.needed,
      safetyLine: worst.safetyLine,
      desc: `Αν όλα πάνε σκατά και ξεκωλωθούν όλοι. Η ζώνη φτάνει στους ${worst.needed + myTeam.points} βαθμούς.`,
    },
    best: {
      needed: bestNeeded,
      safetyLine: best.safetyLine,
      desc: `Καλύτερο πιθανό σενάριο. Υπολογίζουμε οτι όλοι εχουν +3 από το Δροσοχώρι. Αν κοιμηθεί ο θεός με ${bestNeeded + myTeam.points} βαθμούς σωνόμαστε.`,
    },
  }
}