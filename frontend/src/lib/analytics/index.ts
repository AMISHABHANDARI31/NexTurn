export const track = (event: string, properties?: Record<string, unknown>) => {
  if (import.meta.env.DEV) console.info('[NexTurn analytics]', event, properties ?? {})
}
