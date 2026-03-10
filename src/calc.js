/**
 * Υπολογισμός και των 3 σεναρίων σωτηρίας.
 * @param {Object} data - Τα δεδομένα από data.json
 * @returns {Object} - Αποτελέσματα και για τα 3 σενάρια
 */
export function calcScenarios(data) {
  const { totalRounds, relegationZone, teams, myTeam: myTeamName } = data

  // Ταξινόμηση βαθμολογίας
  const sorted = [...teams].sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points
    // Διαφορά τερμάτων ως tiebreaker
    return (b.gf - b.ga) - (a.gf - a.ga)
  })

  const myTeam = sorted.find(t => t.name === myTeamName)
  const myPos = sorted.findIndex(t => t.name === myTeamName) + 1
  const totalTeams = sorted.length
  const safePos = totalTeams - relegationZone // τελευταία ασφαλής θέση (1-based)

  const safetyTeam = sorted[safePos - 1]   // ομάδα ακριβώς πάνω από υποβιβασμό
  const remaining = totalRounds - myTeam.played

  // ─── ΣΕΝΑΡΙΟ 1: ΒΑΣΙΚΟ ──────────────────────────────────────────────────
  // Κάθε ομάδα συνεχίζει με τον τρέχοντα ρυθμό βαθμών/αγώνα
  const baseProjected = sorted.map(t => {
    const rem = totalRounds - t.played
    const rate = t.points / t.played
    return { ...t, projected: Math.round(t.points + rate * rem) }
  }).sort((a, b) => b.projected - a.projected)

  const baseSafetyLine = baseProjected[safePos - 1].projected
  const baseMyProjected = baseProjected.find(t => t.name === myTeamName).projected
  const baseNeeded = Math.max(0, baseSafetyLine - myTeam.points + 1)
  const baseRate = (myTeam.points / myTeam.played).toFixed(2)

  // ─── ΣΕΝΑΡΙΟ 2: ΧΕΙΡΟΤΕΡΟ ───────────────────────────────────────────────
  // Η ομάδα στη θέση safePos κερδίζει ΟΛΑ τα υπόλοιπα παιχνίδια
  const worstSafetyTeamRem = totalRounds - safetyTeam.played
  const worstSafetyLine = safetyTeam.points + worstSafetyTeamRem * 3
  const worstNeeded = Math.min(remaining * 3, Math.max(0, worstSafetyLine - myTeam.points + 1))
  const worstMathPossible = remaining * 3 >= worstNeeded

  // ─── ΣΕΝΑΡΙΟ 3: ΚΑΛΥΤΕΡΟ ────────────────────────────────────────────────
  // Η ομάδα στη θέση safePos δεν παίρνει άλλους βαθμούς
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
      desc: `Με τον τρέχοντα ρυθμό σου (${baseRate} βαθμοί/αγώνα), προβλέπονται ~${baseMyProjected} βαθμοί στο τέλος. Η γραμμή σωτηρίας εκτιμάται στους ~${baseSafetyLine} βαθμούς.`,
    },
    worst: {
      needed: worstNeeded,
      safetyLine: worstSafetyLine,
      mathPossible: worstMathPossible,
      desc: `Αν η ${safetyTeam.name} κερδίσει όλα τα υπόλοιπα, θα φτάσει τους ${worstSafetyLine} βαθμούς. ${worstMathPossible ? `Χρειάζεσαι ${worstNeeded} από ${remaining * 3} δυνατούς βαθμούς.` : 'Μαθηματικά αδύνατο να φτάσεις αυτή τη γραμμή.'}`,
    },
    best: {
      needed: bestNeeded,
      safetyLine: bestSafetyLine,
      desc: `Αν η ${safetyTeam.name} δεν κερδίσει ξανά, η γραμμή σωτηρίας μένει στους ${bestSafetyLine} βαθμούς. Το μαθηματικό ελάχιστο που χρειάζεσαι.`,
    },
  }
}
