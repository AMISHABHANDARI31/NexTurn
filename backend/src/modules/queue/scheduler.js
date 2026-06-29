import { processAutomationTick } from './automationService.js'

let timer = null
let running = false

export function startQueueAutomationScheduler() {
  if (timer) return
  const intervalMs = Math.max(15_000, Number(process.env.QUEUE_AUTOMATION_INTERVAL_MS) || 30_000)
  timer = setInterval(runAutomationTick, intervalMs)
  timer.unref?.()
  console.log(`Queue automation scheduler started (${intervalMs}ms).`)
}

export function stopQueueAutomationScheduler() {
  if (!timer) return
  clearInterval(timer)
  timer = null
}

async function runAutomationTick() {
  if (running) return
  running = true
  try {
    const results = await processAutomationTick()
    const advanced = results.filter((result) => result.advanced)
    if (advanced.length) console.info(`[queue-automation] advanced=${advanced.length}`)
  } catch (error) {
    console.error('[queue-automation] scheduler failed:', error.message)
  } finally {
    running = false
  }
}
