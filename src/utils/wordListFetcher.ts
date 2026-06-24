import type { Word } from '@/typings'

export async function wordListFetcher(url: string): Promise<Word[]> {
  if (url.startsWith('custom_')) {
    try {
      const customDicts = JSON.parse(localStorage.getItem('customDicts') || '[]')
      const custom = customDicts.find((d: { id: string; words?: Word[] }) => d.id === url)
      return custom ? custom.words || [] : []
    } catch (e) {
      console.error('Failed to parse custom dictionaries from localStorage', e)
      return []
    }
  }

  const URL_PREFIX: string = REACT_APP_DEPLOY_ENV === 'pages' ? '/qwerty-learner' : ''

  const response = await fetch(URL_PREFIX + url)
  const words: Word[] = await response.json()
  return words
}
