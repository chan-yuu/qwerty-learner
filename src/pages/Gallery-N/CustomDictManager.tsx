import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import type { CustomDict } from '@/store'
import { currentChapterAtom, currentDictIdAtom, customDictsAtom } from '@/store'
import type { LanguageCategoryType, LanguageType, Word } from '@/typings'
import { useAtom, useSetAtom } from 'jotai'
import type React from 'react'
import { useCallback, useState } from 'react'
import IconBook from '~icons/tabler/book'
import IconEdit from '~icons/tabler/edit'
import IconPlus from '~icons/tabler/plus'
import IconTrash from '~icons/tabler/trash'

export default function CustomDictManager() {
  const [customDicts, setCustomDicts] = useAtom(customDictsAtom)
  const [currentDictId, setCurrentDictId] = useAtom(currentDictIdAtom)
  const setCurrentChapter = useSetAtom(currentChapterAtom)

  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('list')

  // Form states
  const [editingId, setEditingId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [langCategory, setLangCategory] = useState<LanguageCategoryType>('en')
  const [rawText, setRawText] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  const handleOpenEdit = useCallback((dict: CustomDict) => {
    setEditingId(dict.id)
    setName(dict.name)
    setDescription(dict.description)
    setLangCategory(dict.languageCategory)
    // Convert words back to string format
    const wordsStr = dict.words.map((w) => `${w.name} / ${w.trans.join(', ')}`).join('\n')
    setRawText(wordsStr)
    setErrorMsg('')
    setActiveTab('add')
  }, [])

  const handleOpenAdd = useCallback(() => {
    setEditingId(null)
    setName('')
    setDescription('')
    setLangCategory('en')
    setRawText('')
    setErrorMsg('')
    setActiveTab('add')
  }, [])

  const handleDelete = useCallback(
    (id: string) => {
      if (window.confirm('确定要删除这个自定义词库吗？此操作不可恢复。')) {
        setCustomDicts((prev) => prev.filter((d) => d.id !== id))
        if (currentDictId === id) {
          setCurrentDictId('cet4')
          setCurrentChapter(0)
        }
      }
    },
    [currentDictId, setCurrentDictId, setCurrentChapter, setCustomDicts],
  )

  const parseWords = (text: string): Word[] => {
    const lines = text.split('\n')
    const words: Word[] = []

    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#') || trimmed.startsWith('//')) {
        continue
      }

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

      if (wordName) {
        const trans = transStr
          ? transStr
              .split(/[,，;；/]+/)
              .map((t) => t.trim())
              .filter(Boolean)
          : []
        words.push({
          name: wordName,
          trans,
          usphone: '',
          ukphone: '',
        })
      }
    }

    return words
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMsg('请输入词库名称')
      return
    }
    if (!rawText.trim()) {
      setErrorMsg('请输入单词内容')
      return
    }

    let parsedWords: Word[] = []
    const trimmedInput = rawText.trim()
    if (trimmedInput.startsWith('[') && trimmedInput.endsWith(']')) {
      try {
        const obj = JSON.parse(trimmedInput)
        if (Array.isArray(obj)) {
          parsedWords = obj
            .map((item: { name?: string; word?: string; trans?: unknown; translation?: string; usphone?: string; ukphone?: string }) => {
              const wordName = item.name || item.word || ''
              let trans: string[] = []
              if (Array.isArray(item.trans)) {
                trans = item.trans.map(String)
              } else if (typeof item.trans === 'string') {
                trans = [item.trans]
              } else if (typeof item.translation === 'string') {
                trans = [item.translation]
              }
              return {
                name: wordName,
                trans,
                usphone: item.usphone || '',
                ukphone: item.ukphone || '',
              }
            })
            .filter((w) => w.name)
        }
      } catch (e) {
        // Fallback to text parsing
      }
    }

    if (parsedWords.length === 0) {
      parsedWords = parseWords(rawText)
    }

    if (parsedWords.length === 0) {
      setErrorMsg('未能解析出有效的单词，请检查输入格式')
      return
    }

    const dictId = editingId || `custom_${Date.now()}`

    const newDict: CustomDict = {
      id: dictId,
      name: name.trim(),
      description: description.trim() || `${parsedWords.length}个单词的自定义词库`,
      category: '自定义',
      tags: ['自定义'],
      url: dictId, // Use the id as the URL path for SWR interception
      length: parsedWords.length,
      language: langCategory as LanguageType,
      languageCategory: langCategory,
      words: parsedWords,
    }

    if (editingId) {
      setCustomDicts((prev) => prev.map((d) => (d.id === editingId ? newDict : d)))
    } else {
      setCustomDicts((prev) => [...prev, newDict])
    }

    // Reset form
    setName('')
    setDescription('')
    setRawText('')
    setEditingId(null)
    setActiveTab('list')
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <button
          type="button"
          onClick={() => {
            setIsOpen(true)
            setActiveTab('list')
          }}
          className="group flex items-center space-x-2 rounded-lg border border-indigo-200 bg-gradient-to-r from-indigo-50 to-blue-50 px-4 py-2.5 text-sm font-medium text-indigo-600 shadow-sm transition-all duration-200 hover:scale-105 hover:border-indigo-300 hover:from-indigo-100 hover:to-blue-100 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 dark:border-indigo-400 dark:from-gray-800 dark:to-gray-700 dark:text-indigo-400 dark:hover:from-gray-700 dark:hover:to-gray-600"
        >
          <IconBook className="h-4 w-4" />
          <span>自定义词典</span>
          <span className="transform transition-transform group-hover:translate-x-1">✍️</span>
        </button>
      </DialogTrigger>
      <DialogContent className="w-[45rem] max-w-none !rounded-[20px] bg-white text-slate-900 dark:bg-slate-900 dark:text-slate-100">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-xl font-bold text-slate-950 dark:text-white">
            <span>自定义词典管理</span>
          </DialogTitle>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2 w-full">
          <TabsList className="mb-4 grid w-full grid-cols-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
            <TabsTrigger value="list" className="py-2">
              我的词典 ({customDicts.length})
            </TabsTrigger>
            <TabsTrigger value="add" onClick={handleOpenAdd} className="py-2">
              {editingId ? '修改词典' : '新建词典'}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="list" className="h-[30rem] overflow-y-auto pr-2">
            {customDicts.length === 0 ? (
              <div className="flex h-full flex-col items-center justify-center gap-4 text-slate-500 dark:text-slate-400">
                <p className="text-sm">暂无自定义词典，快去创建一个吧！</p>
                <button
                  type="button"
                  onClick={handleOpenAdd}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
                >
                  <IconPlus className="h-4 w-4" />
                  新建词典
                </button>
              </div>
            ) : (
              <div className="space-y-4">
                {customDicts.map((dict) => (
                  <div
                    key={dict.id}
                    className="bg-slate-50/55 flex items-center justify-between rounded-xl border border-slate-100 p-4 dark:border-slate-800 dark:bg-slate-800/40"
                  >
                    <div className="flex-grow pr-4 text-left">
                      <h4 className="text-lg font-bold text-slate-900 dark:text-white">{dict.name}</h4>
                      <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{dict.description}</p>
                      <div className="mt-2 flex items-center gap-3 text-xs font-semibold text-slate-500">
                        <span className="rounded bg-indigo-50 px-2 py-0.5 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                          {dict.length} 单词
                        </span>
                        <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                          {dict.languageCategory === 'en'
                            ? '英语'
                            : dict.languageCategory === 'ja'
                            ? '日语'
                            : dict.languageCategory === 'de'
                            ? '德语'
                            : dict.languageCategory === 'kk'
                            ? '哈萨克语'
                            : dict.languageCategory === 'id'
                            ? '印尼语'
                            : 'Code'}
                        </span>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleOpenEdit(dict)}
                        className="rounded-lg p-2 text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                        title="编辑"
                      >
                        <IconEdit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(dict.id)}
                        className="rounded-lg p-2 text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                        title="删除"
                      >
                        <IconTrash className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="add" className="h-[30rem] overflow-y-auto pr-2">
            <form onSubmit={handleSubmit} className="space-y-4">
              {errorMsg && (
                <div className="rounded-lg border border-rose-100 bg-rose-50 p-3 text-sm text-rose-600 dark:border-rose-950 dark:bg-rose-950/30 dark:text-rose-400">
                  {errorMsg}
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5 text-left">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">词库名称 *</label>
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="例如：我的考研高频错词"
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                  />
                </div>
                <div className="space-y-1.5 text-left">
                  <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">语言类型 *</label>
                  <select
                    value={langCategory}
                    onChange={(e) => setLangCategory(e.target.value as LanguageCategoryType)}
                    className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                  >
                    <option value="en">英语</option>
                    <option value="ja">日语</option>
                    <option value="de">德语</option>
                    <option value="kk">哈萨克语</option>
                    <option value="id">印尼语</option>
                    <option value="code">Code</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1.5 text-left">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">描述</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="例如：我自己整理的四六级和考研常错单词表"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="flex justify-between text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <span>单词内容 *</span>
                  <span className="text-xs font-normal text-slate-400">支持文本格式或 Qwerty JSON 格式</span>
                </label>
                <textarea
                  required
                  rows={8}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder='请输入或粘贴单词，格式：&#10;apple / 苹果&#10;banana / 香蕉&#10;abandon / 放弃&#10;&#10;或者粘贴 JSON 格式：&#10;[&#10;  {"name": "apple", "trans": ["苹果"]},&#10;  {"name": "banana", "trans": ["香蕉"]}&#10;]'
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                />
              </div>

              <div className="flex justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    setEditingId(null)
                    setActiveTab('list')
                  }}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-500 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-indigo-600 hover:shadow"
                >
                  {editingId ? '保存修改' : '创建词典'}
                </button>
              </div>
            </form>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}
