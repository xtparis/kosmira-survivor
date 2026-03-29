/**
 * scrape.js — Κάνει fetch τα αποτελέσματα από το epsip.gr και ενημερώνει το data.json
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_PATH = join(__dirname, '../src/data.json')
const URL = 'https://epsip.gr/results/display_schedule.php?league_id=301'

function cleanName(name) {
  return name.replace(/\*\*/g, '').replace(/\[/g, '').replace(/\]/g, '').trim()
}

// Βρίσκει το καλύτερο match μεταξύ scraped ονόματος και data.json
function findTeam(scraped, teams) {
  scraped = cleanName(scraped).toUpperCase()
  // Exact match
  let found = teams.find(t => t.toUpperCase() === scraped)
  if (found) return found
  // Partial match — τουλάχιστον 6 κοινοί χαρακτήρες
  found = teams.find(t => {
    const a = t.toUpperCase()
    return a.includes(scraped.substring(0, 8)) || scraped.includes(a.substring(0, 8))
  })
  return found || null
}

async function scrape() {
  console.log('🔍 Fetching results from epsip.gr...')

  const res = await fetch(URL)
  const text = await res.text()
  console.log(text.substring(0, 3000))
  
  const data = JSON.parse(readFileSync(DATA_PATH, 'utf-8'))
  const allTeams = [...new Set(data.fixtures.flatMap(f => [f.home, f.away]))]
  let updatedCount = 0

  // Παρσάρουμε το markdown-like format που επιστρέφει το fetch
  // Κάθε γραμμή ματς έχει: | ΟμάδαΑ - ΟμάδαΒ | ... | ΣΚΟΡ |
  const lines = text.split('\n')

  for (const line of lines) {
    // Ψάχνουμε σκορ: | **X-Y** | ή | X-Y | ή | **X-Y α.α.** |
    const scoreMatch = line.match(/\|\s*\*?\*?(\d+)-(\d+)(?:\s*α\.α\.|\s*a\.a\.)?\*?\*?\s*\|?\s*$/)
    if (!scoreMatch) continue

    const homeGoals = parseInt(scoreMatch[1])
    const awayGoals = parseInt(scoreMatch[2])

    // Ψάχνουμε ονόματα ομάδων: | ΟμάδαΑ - **ΟμάδαΒ** | ή | [ΟμάδαΑ - ΟμάδαΒ](link) |
    const teamMatch = line.match(/\|\s*(?:\[)?\s*\*?\*?\s*(.+?)\s*\*?\*?\s*-\s*\*?\*?\s*(.+?)\s*\*?\*?\s*(?:\]\([^)]+\))?\s*\|/)
    if (!teamMatch) continue

    const homeScraped = cleanName(teamMatch[1])
    const awayScraped = cleanName(teamMatch[2])

    // Skip αν δεν μοιάζουν με ονόματα ομάδων
    if (homeScraped.length < 4 || awayScraped.length < 4) continue

    const homeName = findTeam(homeScraped, allTeams)
    const awayName = findTeam(awayScraped, allTeams)

    if (!homeName || !awayName) continue

    // Βρίσκουμε το fixture που είναι ακόμα null
    const fixture = data.fixtures.find(f =>
      f.home === homeName &&
      f.away === awayName &&
      f.homeGoals === null
    )

    if (fixture) {
      fixture.homeGoals = homeGoals
      fixture.awayGoals = awayGoals
      updatedCount++
      console.log(`✅ ${fixture.home} ${homeGoals}-${awayGoals} ${fixture.away} (Round ${fixture.round})`)
    }
  }

  if (updatedCount > 0) {
    data.lastUpdate = new Date().toLocaleDateString('el-GR')
    writeFileSync(DATA_PATH, JSON.stringify(data, null, 2))
    console.log(`\n📝 Updated ${updatedCount} fixtures in data.json`)
  } else {
    console.log('ℹ️  No new results found.')
  }

  process.exit(0)
}

scrape().catch(err => {
  console.error('❌ Error:', err)
  process.exit(1)
})
