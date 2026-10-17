import type { LanguageCategoryType, LanguageType, Word } from '@/typings'

export type CustomDictChapter = {
  id: string
  name: string
  words: Word[]
}

export type CustomDict = {
  id: string
  name: string
  description: string
  category: string
  tags: string[]
  url: string
  length: number
  language: LanguageType
  languageCategory: LanguageCategoryType
  /**
   * 所有章节单词的扁平集合，保留它是为了兼容旧版本数据与部分依赖 words 的逻辑。
   * 新写法请通过 chapters 维护。
   */
  words: Word[]
  /** 显式章节；旧数据没有该字段时会按每 20 词自动拆分一次 */
  chapters?: CustomDictChapter[]
  createdAt?: number
  updatedAt?: number
}

/** 旧版本自定义词典没有章节概念，导入时按 20 词一章切分 */
export const LEGACY_CHAPTER_LENGTH = 20

export function createChapterId() {
  return `chapter_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export function splitWordsIntoChapters(words: Word[], chapterLength = LEGACY_CHAPTER_LENGTH): CustomDictChapter[] {
  const chapters: CustomDictChapter[] = []
  for (let i = 0; i < words.length; i += chapterLength) {
    chapters.push({
      id: createChapterId(),
      name: `第 ${chapters.length + 1} 章`,
      words: words.slice(i, i + chapterLength),
    })
  }
  return chapters
}

/** 读取章节；旧数据（只有 words）按每 20 词切分，不写回存储 */
export function getDictChapters(dict: CustomDict): CustomDictChapter[] {
  if (Array.isArray(dict.chapters)) return dict.chapters
  return splitWordsIntoChapters(dict.words ?? [])
}

export function getDictWords(dict: CustomDict): Word[] {
  return getDictChapters(dict).flatMap((chapter) => chapter.words)
}

export function getDictChapterCount(dict: CustomDict): number {
  return getDictChapters(dict).length
}

/** 用章节重建词典的聚合字段（words / length / updatedAt） */
export function applyChapters(dict: CustomDict, chapters: CustomDictChapter[]): CustomDict {
  const words = chapters.flatMap((chapter) => chapter.words)
  return {
    ...dict,
    chapters,
    words,
    length: words.length,
    updatedAt: Date.now(),
  }
}

/** 迁移旧数据：补上 chapters 字段 */
export function normalizeCustomDict(dict: CustomDict): CustomDict {
  if (Array.isArray(dict.chapters)) return applyChapters(dict, dict.chapters)
  return applyChapters(dict, splitWordsIntoChapters(dict.words ?? []))
}

export function dedupeWords(words: Word[]): Word[] {
  const seen = new Set<string>()
  const result: Word[] = []
  for (const word of words) {
    const key = word.name.trim().toLowerCase()
    if (!key || seen.has(key)) continue
    seen.add(key)
    result.push(word)
  }
  return result
}

type RawWordItem = {
  name?: string
  word?: string
  trans?: unknown
  translation?: string
  usphone?: string
  ukphone?: string
}

function normalizeTranslation(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean)
  }
  if (typeof value === 'string') {
    return value
      .split(/[,，;；/]+/)
      .map((item) => item.trim())
      .filter(Boolean)
  }
  return []
}

function normalizeWordItem(item: RawWordItem): Word | null {
  const name = (item.name || item.word || '').trim()
  if (!name) return null
  const trans = normalizeTranslation(item.trans)
  return {
    name,
    trans: trans.length ? trans : normalizeTranslation(item.translation),
    usphone: (item.usphone || '').trim(),
    ukphone: (item.ukphone || '').trim(),
  }
}

/** 提取所有顶层的 [...] 或 {...} 块，忽略字符串内部的括号 */
function extractTopLevelBlocks(input: string, open: string, close: string): string[] {
  const blocks: string[] = []
  let depth = 0
  let startIdx = -1
  let inQuote = false
  let escape = false

  for (let i = 0; i < input.length; i++) {
    const char = input[i]
    if (escape) {
      escape = false
      continue
    }
    if (char === '\\') {
      escape = true
      continue
    }
    if (char === '"') {
      inQuote = !inQuote
      continue
    }
    if (inQuote) continue

    if (char === open) {
      if (depth === 0) startIdx = i
      depth++
    } else if (char === close) {
      depth--
      if (depth === 0 && startIdx !== -1) {
        blocks.push(input.substring(startIdx, i + 1))
        startIdx = -1
      }
    }
  }

  return blocks
}

/** 纯文本行解析：`apple / 苹果`、`apple 苹果`、`apple: 苹果` 等 */
export function parsePlainTextWords(text: string): Word[] {
  const words: Word[] = []

  for (const line of text.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) continue

    let wordName = ''
    let transStr = ''

    const sepMatch = trimmed.match(/[/：:—-]/)
    if (sepMatch) {
      const sep = sepMatch[0]
      const idx = trimmed.indexOf(sep)
      wordName = trimmed.substring(0, idx).trim()
      transStr = trimmed.substring(idx + 1).trim()
    } else {
      const parts = trimmed.split(/\s+/)
      wordName = parts[0].trim()
      transStr = parts.slice(1).join(' ').trim()
    }

    if (!wordName) continue
    words.push({
      name: wordName,
      trans: normalizeTranslation(transStr),
      usphone: '',
      ukphone: '',
    })
  }

  return words
}

/**
 * 解析导入文本，支持：
 * 1. 一个或多个相邻的 JSON 数组 [{...}, {...}]
 * 2. 一个或多个 JSON 对象 {"word": "释义"} 或 {"name": "...", "trans": [...]}
 * 3. 纯文本行格式
 */
export function parseWordImportText(text: string): Word[] {
  // 允许直接粘贴带 ```json 代码块标记的内容
  const input = text
    .trim()
    .replace(/^```[a-zA-Z]*\s*/, '')
    .replace(/```$/, '')
    .trim()
  if (!input) return []

  const arrayBlocks = extractTopLevelBlocks(input, '[', ']')
  const objectBlocks = arrayBlocks.length === 0 ? extractTopLevelBlocks(input, '{', '}') : []

  const words: Word[] = []

  for (const block of arrayBlocks) {
    try {
      const arr = JSON.parse(block)
      if (!Array.isArray(arr)) continue
      for (const item of arr) {
        const word = normalizeWordItem(item as RawWordItem)
        if (word) words.push(word)
      }
    } catch (e) {
      // 忽略无法解析的块，继续尝试其它块
    }
  }

  if (words.length === 0) {
    for (const block of objectBlocks) {
      try {
        const obj = JSON.parse(block)
        if (!obj || typeof obj !== 'object' || Array.isArray(obj)) continue

        if ('name' in obj || 'word' in obj) {
          const word = normalizeWordItem(obj as RawWordItem)
          if (word) words.push(word)
          continue
        }

        for (const [key, value] of Object.entries(obj)) {
          const nested = (typeof value === 'object' && value !== null ? value : {}) as RawWordItem
          const trans = typeof value === 'object' && value !== null ? nested.trans ?? nested.translation : value
          const word = normalizeWordItem({
            name: key,
            trans,
            usphone: nested.usphone,
            ukphone: nested.ukphone,
          })
          if (word) words.push(word)
        }
      } catch (e) {
        // 忽略无法解析的块
      }
    }
  }

  if (words.length === 0) {
    // 形似 JSON 但解析失败时，不要把原始 JSON 文本当普通文本解析成垃圾单词
    if (input.startsWith('[') || input.startsWith('{')) return []
    return dedupeWords(parsePlainTextWords(input))
  }

  return dedupeWords(words)
}
