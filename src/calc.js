/**
 * Υπολογίζει βαθμολογία από τα fixtures και τα 3 σενάρια σωτηρίας.
 */

function getTeamNames(fixtures) {
  const names = new Set()
  fixtures.forEach(f => { names.add(f.home); names.add(f.away) })
  return [...names]
}

function calcStandings(fixtures) {
  const stats = {}

  // Αρχικοποίηση όλων των ομάδων
  getTeamNames(fixtures).forEach(name => {
    stats[name] = { name, points: 0, played: 0, wins: 0, draws: 0, losses: 0, gf: 0, ga: 0 }
  })

  // Επεξεργασία αποτελεσμάτων
  fixtures.forEach(f => {
    if (f.homeGoals === null || f.awayGoals === null) return

    const h = stats[f.home]
    const a = stats[f.away]

    h.played++; a.played++
    h.gf += f.homeGoals; h.ga += f.awayGoals
    a.gf += f.awayGoals; a.ga += f.homeGoals

    if (f.homeGoals > f.awayGoals) {
      h.wins++; h.points += 3
      a.losses++
    } else if (f.homeGoals < f.awayGoals) {
      a.wins++; a.points += 3
      h.losses++
    } else {
      h.draws++; h.points++
      a.draws++; a.points++
    }
  })

  return Object.values(stats).sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    return (b.gf - b.ga) - (a.gf - a.ga)
  })
}

export function calcScenarios(data) {
  const { totalRounds, relegationZone, fixtures, myTeam: myTeamName } = data

  const sorted = calcStandings(fixtures)
  const myTeam = sorted.find(t => t.name === myTeamName)
  const myPos = sorted.findIndex(t => t.name === myTeamName) + 1
  const totalTeams = sorted.length
  const safePos = totalTeams - relegationZone
  const safetyTeam = sorted[safePos - 1]
  const remaining = totalRounds - myTeam.played

  // ─── ΣΕΝΑΡΙΟ 1: ΒΑΣΙΚΟ ──────────────────────────────────────────────────
  const baseProjected = sorted.map(t => {
    const rem = totalRounds - t.played
    const rate = t.played > 0 ? t.points / t.played : 0
    return { ...t, projected: Math.round(t.points + rate * rem) }
  }).sort((a, b) => b.projected - a.projected)

  const baseSafetyLine = baseProjected[safePos - 1].projected
  const baseMyProjected = baseProjected.find(t => t.name === myTeamName).projected
  const baseNeeded = Math.max(0, baseSafetyLine - myTeam.points + 1)
  const baseRate = myTeam.played > 0 ? (myTeam.points / myTeam.played).toFixed(2) : '0.00'

  // ─── ΣΕΝΑΡΙΟ 2: ΧΕΙΡΟΤΕΡΟ ───────────────────────────────────────────────
  const worstSafetyRem = totalRounds - safetyTeam.played
  const worstSafetyLine = safetyTeam.points + worstSafetyRem * 3
  const worstNeeded = Math.min(remaining * 3, Math.max(0, worstSafetyLine - myTeam.points + 1))
  const worstMathPossible = remaining * 3 >= worstNeeded

  // ─── ΣΕΝΑΡΙΟ 3: ΚΑΛΥΤΕΡΟ ────────────────────────────────────────────────
  const bestSafetyLine = safetyTeam.points
  const bestNeeded = Math.max(0, bestSafetyLine - myTeam.points + 1)

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
      safetyLine: baseSafetyLine,
      myProjected: baseMyProjected,
      rate: baseRate,
      desc: `Με τον τρέχοντα ρυθμό σου (${baseRate} βαθμοί/αγώνα), προβλέπονται ~${baseMyProjected} βαθμοί στο τέλος. Η γραμμή σωτηρίας εκτιμάται στους ~${baseSafetyLine} βαθμούς συνολικά.`,
    },
    worst: {
      needed: worstNeeded,
      safetyLine: worstSafetyLine,
      mathPossible: worstMathPossible,
      desc: `Αν η 11η κερδίσει όλα τα υπόλοιπα, θα φτάσει τους ${worstSafetyLine} βαθμούς. ${worstMathPossible ? `Χρειάζεσαι ${worstNeeded} από ${remaining * 3} δυνατούς βαθμούς.` : 'Μαθηματικά αδύνατο να φτάσεις αυτή τη γραμμή.'}`,
    },
    best: {
      needed: bestNeeded,
      safetyLine: bestSafetyLine,
      desc: `Αν η ${safetyTeam.name} δεν κερδίσει ξανά, η γραμμή σωτηρίας μένει στους ${bestSafetyLine} βαθμούς. Το μαθηματικό ελάχιστο που χρειάζεσαι.`,
    },
  }
}