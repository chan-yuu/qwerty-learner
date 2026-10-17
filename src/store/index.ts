import atomForConfig from './atomForConfig'
import { reviewInfoAtom } from './reviewInfoAtom'
import { DISMISS_START_CARD_DATE_KEY, defaultFontSizeConfig } from '@/constants'
import { idDictionaryMap } from '@/resources/dictionary'
import { correctSoundResources, keySoundResources, wrongSoundResources } from '@/resources/soundResource'
import type {
  Dictionary,
  InfoPanelState,
  LoopWordTimesOption,
  PhoneticType,
  PronunciationType,
  WordDictationOpenBy,
  WordDictationType,
} from '@/typings'
import { getDictChapterCount } from '@/utils/customDict'
import type { CustomDict } from '@/utils/customDict'
import type { ReviewRecord } from '@/utils/db/record'
import { atom } from 'jotai'
import { atomWithStorage } from 'jotai/utils'

export type { CustomDict, CustomDictChapter } from '@/utils/customDict'

/**
 * 首帧同步读取 localStorage。
 * jotai 2.1.0 的 atomWithStorage 没有 getOnInit 选项，默认先用 initialValue 渲染、
 * 挂载后才异步回填存储值。这会导致 Typing 页在首帧把自定义词典误判为“不存在”并重置为 cet4。
 * 把存储值当作 initialValue 传入即可让首帧就拿到正确值。
 */
function getStoredValue<T>(key: string, fallback: T): T {
  try {
    const raw = typeof window === 'undefined' ? null : window.localStorage.getItem(key)
    if (raw === null) return fallback
    return JSON.parse(raw) as T
  } catch (e) {
    return fallback
  }
}

export const customDictsAtom = atomWithStorage<CustomDict[]>('customDicts', getStoredValue<CustomDict[]>('customDicts', []))

export const currentDictIdAtom = atomWithStorage('currentDict', getStoredValue('currentDict', 'cet4'))

/** 默认词典：设置后每次刷新页面都会回到这个词库 */
export const defaultDictIdAtom = atomWithStorage<string | null>('defaultDict', getStoredValue<string | null>('defaultDict', null))

export const currentDictInfoAtom = atom<Dictionary>((get) => {
  const id = get(currentDictIdAtom)
  let dict = idDictionaryMap[id]
  if (!dict) {
    const customDicts = get(customDictsAtom)
    const custom = customDicts.find((d) => d.id === id)
    if (custom) {
      dict = {
        id: custom.id,
        name: custom.name,
        description: custom.description,
        category: custom.category,
        tags: custom.tags,
        url: custom.url,
        length: custom.length,
        language: custom.language,
        languageCategory: custom.languageCategory,
        chapterCount: getDictChapterCount(custom),
      }
    }
  }
  // 如果 dict 不存在，则返回 cet4. Typing 中会检查 DictId 是否存在，如果不存在则会重置为 cet4
  if (!dict) {
    dict = idDictionaryMap.cet4
  }
  return dict
})

export const currentChapterAtom = atomWithStorage('currentChapter', getStoredValue('currentChapter', 0))

/**
 * 请求打开自定义词典管理器并直接进入某个词典的章节管理。
 * 词典详情弹窗、打字页空章节提示等地方都可以复用。
 */
export const customDictManagerRequestAtom = atom<{ dictId: string } | null>(null)

export const loopWordConfigAtom = atomForConfig<{ times: LoopWordTimesOption }>('loopWordConfig', {
  times: 1,
})

export const keySoundsConfigAtom = atomForConfig('keySoundsConfig', {
  isOpen: true,
  isOpenClickSound: true,
  volume: 1,
  resource: keySoundResources[0],
})

export const hintSoundsConfigAtom = atomForConfig('hintSoundsConfig', {
  isOpen: true,
  volume: 1,
  isOpenWrongSound: true,
  isOpenCorrectSound: true,
  wrongResource: wrongSoundResources[0],
  correctResource: correctSoundResources[0],
})

export const pronunciationConfigAtom = atomForConfig('pronunciation', {
  isOpen: true,
  volume: 1,
  type: 'us' as PronunciationType,
  name: '美音',
  isLoop: false,
  isTransRead: false,
  transVolume: 1,
  rate: 1,
})

export const fontSizeConfigAtom = atomForConfig('fontsize', defaultFontSizeConfig)

export const pronunciationIsOpenAtom = atom((get) => get(pronunciationConfigAtom).isOpen)

export const pronunciationIsTransReadAtom = atom((get) => get(pronunciationConfigAtom).isTransRead)

export const randomConfigAtom = atomForConfig('randomConfig', {
  isOpen: false,
})

export const isShowPrevAndNextWordAtom = atomWithStorage('isShowPrevAndNextWord', true)

export const isIgnoreCaseAtom = atomWithStorage('isIgnoreCase', true)

export const isShowAnswerOnHoverAtom = atomWithStorage('isShowAnswerOnHover', true)

export const isTextSelectableAtom = atomWithStorage('isTextSelectable', false)

export const reviewModeInfoAtom = reviewInfoAtom({
  isReviewMode: false,
  reviewRecord: undefined as ReviewRecord | undefined,
})
export const isReviewModeAtom = atom((get) => get(reviewModeInfoAtom).isReviewMode)

export const phoneticConfigAtom = atomForConfig('phoneticConfig', {
  isOpen: true,
  type: 'us' as PhoneticType,
})

export const isOpenDarkModeAtom = atomWithStorage('isOpenDarkModeAtom', window.matchMedia('(prefers-color-scheme: dark)').matches)

export const isShowSkipAtom = atom(false)

export const isInDevModeAtom = atom(false)

export const infoPanelStateAtom = atom<InfoPanelState>({
  donate: false,
  vsc: false,
  community: false,
  redBook: false,
})

export const wordDictationConfigAtom = atomForConfig('wordDictationConfig', {
  isOpen: false,
  type: 'hideAll' as WordDictationType,
  openBy: 'auto' as WordDictationOpenBy,
})

export const dismissStartCardDateAtom = atomWithStorage<Date | null>(DISMISS_START_CARD_DATE_KEY, null)

// Enhanced version promotion popup state
export const hasSeenEnhancedPromotionAtom = atomWithStorage('hasSeenEnhancedPromotion', false)

// for dev test
//   dismissStartCardDateAtom = atom<Date | null>(new Date())
