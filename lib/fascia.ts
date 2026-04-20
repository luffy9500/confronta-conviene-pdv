export function getFascia(mq: number): 'MINI' | 'MIDI' | 'MAXI' {
  if (mq <= 500) return 'MINI'
  if (mq <= 1000) return 'MIDI'
  return 'MAXI'
}
