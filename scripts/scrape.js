/**
 * scrape.js — Κάνει fetch τα αποτελέσματα από το epsip.gr και ενημερώνει το data.json
 */

import { readFileSync, writeFileSync } from 'fs'
import { fileURLToPath } from 'url'
import { dirname, join } from 'path'

const __dirname = dirname(fileURLToPath(import.meta.url))
const DATA_PATH = join(__dirname, '../src/data.json')
const URL = 'https://epsip.gr/results/display_schedule.php?league_id=301'

function findFixture(fixtures, homeScraped, awayScraped) {
  homeScraped = homeScraped.toUpperCase()
  awayScraped = awayScraped.toUpperCase()

  return fixtures.find(f => {
    const fHome = f.home.toUpperCase()
    const fAway = f.away.toUpperCase()
    const homeMatch = fHome === homeScraped ||
      fHome.includes(homeScraped.substring(0, 8)) ||
      homeScraped.includes(fHome.substring(0, 8))
    const awayMatch = fAway === awayScraped ||
      fAway.includes(awayScraped.substring(0, 8)) ||
      awayScraped.includes(fAway.substring(0, 8))
    return homeMatch && awayMatch && f.homeGoals === null
  })
}

async function scrape() {
  console.log('🔍 Fetching results from epsip.gr...')

  const res = await fetch(URL)
  const html = await res.text()

  const data = JSON.parse(readFileSync(DATA_PATH, 'utf-8'))
  let updatedCount = 0

  // Σπάμε σε rows
  const rows = html.match(/<tr[^>]*>.*?<\/tr>/gs) || []

  for (const row of rows) {
    // Παίρνουμε τα cells καθαρά από HTML tags
    const cells = [...row.matchAll(/<td[^>]*>(.*?)<\/td>/gs)]
      .map(m => m[1].replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim())

    if (cells.length < 7) continue

    const teamCell  = cells[0]  // "ΟμάδαΑ - ΟμάδαΒ"
    const scoreCell = cells[6]  // "X-Y" ή κενό

    // Skip αν δεν υπάρχει αποτέλεσμα
    const scoreMatch = scoreCell.match(/^(\d+)-(\d+)/)
    if (!scoreMatch) continue

    // Skip αν δεν υπάρχουν ομάδες
    const teamMatch = teamCell.match(/^(.+?)\s*-\s*(.+)$/)
    if (!teamMatch) continue

    const homeName = teamMatch[1].trim()
    const awayName = teamMatch[2].trim()
    const homeGoals = parseInt(scoreMatch[1])
    const awayGoals = parseInt(scoreMatch[2])

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
