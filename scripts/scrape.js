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
  return name.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim()
}

function findFixture(fixtures, homeScraped, awayScraped) {
  homeScraped = homeScraped.toUpperCase()
  awayScraped = awayScraped.toUpperCase()

  return fixtures.find(f => {
    const fHome = f.home.toUpperCase()
    const fAway = f.away.toUpperCase()
    const homeMatch = fHome === homeScraped || fHome.includes(homeScraped.substring(0, 8)) || homeScraped.includes(fHome.substring(0, 8))
    const awayMatch = fAway === awayScraped || fAway.includes(awayScraped.substring(0, 8)) || awayScraped.includes(fAway.substring(0, 8))
    return homeMatch && awayMatch && f.homeGoals === null
  })
}

async function scrape() {
  console.log('🔍 Fetching results from epsip.gr...')

  const res = await fetch(URL)
  const html = await res.text()

  const data = JSON.parse(readFileSync(DATA_PATH, 'utf-8'))
  let updatedCount = 0

  // Παρσάρουμε κάθε row του πίνακα
  // Format: <tr><td>ΟμάδαΑ - <b>ΟμάδαΒ</b></td>...<td><b>X-Y</b></td></tr>
  const rowRegex = /<tr[^>]*>.*?<td[^>]*>(?:<a[^>]*>)?(?:<b>)?([^<\-]+?)(?:<\/b>)?\s*-\s*(?:<b>)?([^<]+?)(?:<\/b>)?(?:<\/a>)?<\/td>.*?<td[^>]*>(?:<a[^>]*>)?(?:<b>)?(\d+)-(\d+)(?:\s*α\.α\.)?(?:<\/b>)?(?:<\/a>)?<\/td><\/tr>/gs

  let match
  while ((match = rowRegex.exec(html)) !== null) {
    const homeName = cleanName(match[1])
    const awayName = cleanName(match[2])
    const homeGoals = parseInt(match[3])
    const awayGoals = parseInt(match[4])

    if (homeName.length < 4 || awayName.length < 4) continue

    const fixture = findFixture(data.fixtures, homeName, awayName)
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
