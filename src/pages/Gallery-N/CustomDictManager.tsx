import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { currentChapterAtom, currentDictIdAtom, customDictManagerRequestAtom, customDictsAtom, defaultDictIdAtom } from '@/store'
import type { LanguageCategoryType, LanguageType } from '@/typings'
import type { CustomDict, CustomDictChapter } from '@/utils/customDict'
import { applyChapters, createChapterId, getDictChapters, getDictWords, parseWordImportText } from '@/utils/customDict'
import { useAtom, useSetAtom } from 'jotai'
import type React from 'react'
import { useCallback, useEffect, useMemo, useState } from 'react'
import IconBook from '~icons/tabler/book'
import IconChevronDown from '~icons/tabler/chevron-down'
import IconChevronLeft from '~icons/tabler/chevron-left'
import IconEdit from '~icons/tabler/edit'
import IconPlus from '~icons/tabler/plus'
import IconStar from '~icons/tabler/star'
import IconTrash from '~icons/tabler/trash'
import IconUpload from '~icons/tabler/upload'

const LANGUAGE_OPTIONS: { value: LanguageCategoryType; label: string }[] = [
  { value: 'en', label: '英语' },
  { value: 'code', label: 'Code' },
]

function getLanguageLabel(value?: LanguageCategoryType) {
  return LANGUAGE_OPTIONS.find((option) => option.value === value)?.label ?? '英语'
}

export default function CustomDictManager() {
  const [customDicts, setCustomDicts] = useAtom(customDictsAtom)
  const [currentDictId, setCurrentDictId] = useAtom(currentDictIdAtom)
  const [defaultDictId, setDefaultDictId] = useAtom(defaultDictIdAtom)
  const [managerRequest, setManagerRequest] = useAtom(customDictManagerRequestAtom)
  const setCurrentChapter = useSetAtom(currentChapterAtom)

  const [isOpen, setIsOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('list')

  // 词典表单（仅元信息，不再要求同时导入单词）
  const [editingDictId, setEditingDictId] = useState<string | null>(null)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [langCategory, setLangCategory] = useState<LanguageCategoryType>('en')

  // 章节管理 / 单词导入
  const [manageDictId, setManageDictId] = useState<string | null>(null)
  const [importChapterId, setImportChapterId] = useState<string | null>(null)
  const [chapterName, setChapterName] = useState('')
  const [expandedChapterId, setExpandedChapterId] = useState<string | null>(null)

  // 导入表单
  const [rawText, setRawText] = useState('')
  const [fileName, setFileName] = useState('')
  const [replaceMode, setReplaceMode] = useState(false)
  const [errorMsg, setErrorMsg] = useState('')
  const [notice, setNotice] = useState('')

  const manageDict = customDicts.find((dict) => dict.id === manageDictId)
  const chapters = manageDict ? getDictChapters(manageDict) : []
  const importChapter = chapters.find((chapter) => chapter.id === importChapterId)
  const previewCount = useMemo(() => (rawText.trim() ? parseWordImportText(rawText).length : 0), [rawText])

  const resetImportForm = useCallback(() => {
    setRawText('')
    setFileName('')
    setReplaceMode(false)
    setErrorMsg('')
  }, [])

  // 外部组件（词典详情、打字页空章节提示）请求直接打开某个词典的章节管理
  useEffect(() => {
    if (!managerRequest) return
    const target = customDicts.find((dict) => dict.id === managerRequest.dictId)
    setManagerRequest(null)
    if (!target) return
    setIsOpen(true)
    setActiveTab('list')
    setManageDictId(target.id)
    setImportChapterId(null)
    setExpandedChapterId(null)
    setNotice('')
    setErrorMsg('')
    resetImportForm()
  }, [customDicts, managerRequest, resetImportForm, setManagerRequest])

  const resetAll = useCallback(() => {
    setManageDictId(null)
    setImportChapterId(null)
    setExpandedChapterId(null)
    setEditingDictId(null)
    setNotice('')
    setErrorMsg('')
    resetImportForm()
  }, [resetImportForm])

  const updateDict = useCallback(
    (dictId: string, updater: (dict: CustomDict) => CustomDict) => {
      setCustomDicts((prev) => prev.map((dict) => (dict.id === dictId ? updater(dict) : dict)))
    },
    [setCustomDicts],
  )

  const handleOpenCreate = useCallback(() => {
    setEditingDictId(null)
    setName('')
    setDescription('')
    setLangCategory('en')
    setNotice('')
    setErrorMsg('')
    setActiveTab('add')
  }, [])

  const handleOpenEdit = useCallback((dict: CustomDict) => {
    setEditingDictId(dict.id)
    setName(dict.name)
    setDescription(dict.description)
    setLangCategory(dict.languageCategory || 'en')
    setNotice('')
    setErrorMsg('')
    setActiveTab('add')
  }, [])

  const handleDictSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setErrorMsg('请输入词库名称')
      return
    }
    setErrorMsg('')

    if (editingDictId) {
      updateDict(editingDictId, (dict) => ({
        ...dict,
        name: name.trim(),
        description: description.trim() || dict.description,
        language: langCategory as LanguageType,
        languageCategory: langCategory,
        updatedAt: Date.now(),
      }))
      setEditingDictId(null)
      setActiveTab('list')
      setNotice('词典信息已更新')
      return
    }

    const dictId = `custom_${Date.now()}`
    const newDict: CustomDict = {
      id: dictId,
      name: name.trim(),
      description: description.trim() || '自定义词库',
      category: '自定义',
      tags: ['自定义'],
      url: dictId,
      length: 0,
      language: langCategory as LanguageType,
      languageCategory: langCategory,
      words: [],
      chapters: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    }
    setCustomDicts((prev) => [...prev, newDict])
    setName('')
    setDescription('')
    // 创建后直接进入章节管理，方便先建章节再导入单词
    setManageDictId(dictId)
    setImportChapterId(null)
    setExpandedChapterId(null)
    setActiveTab('list')
    setNotice('词典已创建，先新建一个章节，再往章节里导入单词')
  }

  const handleDeleteDict = useCallback(
    (dict: CustomDict) => {
      if (!window.confirm(`确定要删除「${dict.name}」吗？此操作不可恢复。`)) return
      setCustomDicts((prev) => prev.filter((item) => item.id !== dict.id))
      if (defaultDictId === dict.id) setDefaultDictId(null)
      if (currentDictId === dict.id) {
        setCurrentDictId('cet4')
        setCurrentChapter(0)
      }
      if (manageDictId === dict.id) {
        setManageDictId(null)
        setImportChapterId(null)
      }
    },
    [currentDictId, defaultDictId, manageDictId, setCurrentChapter, setCurrentDictId, setCustomDicts, setDefaultDictId],
  )

  const handleCreateChapter = useCallback(() => {
    if (!manageDict) return
    const chapter: CustomDictChapter = {
      id: createChapterId(),
      name: `第 ${chapters.length + 1} 章`,
      words: [],
    }
    updateDict(manageDict.id, (dict) => applyChapters(dict, [...getDictChapters(dict), chapter]))
    setChapterName(chapter.name)
    setImportChapterId(chapter.id)
    setExpandedChapterId(chapter.id)
    setNotice('')
    resetImportForm()
  }, [chapters.length, manageDict, resetImportForm, updateDict])

  const handleOpenImport = useCallback(
    (chapter: CustomDictChapter) => {
      setImportChapterId(chapter.id)
      setChapterName(chapter.name)
      setNotice('')
      resetImportForm()
    },
    [resetImportForm],
  )

  const handleRenameChapter = useCallback(
    (chapter: CustomDictChapter) => {
      if (!manageDict) return
      const nextName = window.prompt('章节名称', chapter.name)
      if (nextName === null) return
      const trimmed = nextName.trim()
      if (!trimmed) return
      updateDict(manageDict.id, (dict) =>
        applyChapters(
          dict,
          getDictChapters(dict).map((item) => (item.id === chapter.id ? { ...item, name: trimmed } : item)),
        ),
      )
    },
    [manageDict, updateDict],
  )

  const handleDeleteChapter = useCallback(
    (chapter: CustomDictChapter) => {
      if (!manageDict) return
      if (!window.confirm(`确定要删除「${chapter.name}」吗？章节里的 ${chapter.words.length} 个单词也会一起删除。`)) return
      updateDict(manageDict.id, (dict) =>
        applyChapters(
          dict,
          getDictChapters(dict).filter((item) => item.id !== chapter.id),
        ),
      )
      if (expandedChapterId === chapter.id) setExpandedChapterId(null)
      if (importChapterId === chapter.id) setImportChapterId(null)
    },
    [expandedChapterId, importChapterId, manageDict, updateDict],
  )

  const handleRemoveWord = useCallback(
    (chapterId: string, wordIndex: number) => {
      if (!manageDict) return
      updateDict(manageDict.id, (dict) =>
        applyChapters(
          dict,
          getDictChapters(dict).map((item) =>
            item.id === chapterId ? { ...item, words: item.words.filter((_, index) => index !== wordIndex) } : item,
          ),
        ),
      )
    },
    [manageDict, updateDict],
  )

  const handleFileUpload = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    setFileName(file.name)
    const reader = new FileReader()
    reader.onload = (event) => {
      const text = event.target?.result as string
      if (!text) return
      setRawText(text)
      setErrorMsg('')
    }
    reader.readAsText(file)
  }, [])

  const handleImportSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!manageDict || !importChapter) {
      setErrorMsg('章节不存在，请重新打开')
      return
    }
    const parsed = parseWordImportText(rawText)
    if (parsed.length === 0) {
      setErrorMsg('未能解析出有效的单词，请检查输入格式')
      return
    }

    const existing = new Set(importChapter.words.map((word) => word.name.trim().toLowerCase()))
    const newWords = replaceMode ? parsed : parsed.filter((word) => !existing.has(word.name.trim().toLowerCase()))
    const merged = replaceMode ? parsed : [...importChapter.words, ...newWords]
    const nextName = chapterName.trim() || importChapter.name

    updateDict(manageDict.id, (dict) =>
      applyChapters(
        dict,
        getDictChapters(dict).map((chapter) => (chapter.id === importChapter.id ? { ...chapter, name: nextName, words: merged } : chapter)),
      ),
    )

    const skipped = parsed.length - newWords.length
    setNotice(
      `${replaceMode ? '已覆盖' : '已导入'} ${newWords.length} 个单词到「${nextName}」${skipped > 0 ? `，跳过 ${skipped} 个重复单词` : ''}`,
    )
    setImportChapterId(null)
    setExpandedChapterId(importChapter.id)
    resetImportForm()
  }

  const handleToggleDefault = useCallback(
    (dict: CustomDict) => {
      setDefaultDictId(defaultDictId === dict.id ? null : dict.id)
    },
    [defaultDictId, setDefaultDictId],
  )

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        setIsOpen(open)
        if (!open) resetAll()
      }}
    >
      <DialogTrigger asChild>
        <button
          type="button"
          onClick={() => {
            setIsOpen(true)
            setActiveTab('list')
            resetAll()
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

        {manageDict ? (
          importChapter ? (
            /* ---------------- 导入单词 ---------------- */
            <form onSubmit={handleImportSubmit} className="mt-2 space-y-3">
              <div className="flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setImportChapterId(null)
                    resetImportForm()
                  }}
                  className="flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                >
                  <IconChevronLeft className="h-4 w-4" />
                  返回章节列表
                </button>
                <span className="max-w-[22rem] truncate text-xs text-slate-400">
                  {manageDict.name} / {importChapter.name}
                </span>
              </div>

              {errorMsg && (
                <div className="rounded-lg border border-rose-100 bg-rose-50 p-3 text-sm text-rose-600 dark:border-rose-950 dark:bg-rose-950/30 dark:text-rose-400">
                  {errorMsg}
                </div>
              )}

              <div className="space-y-1.5 text-left">
                <label className="text-sm font-semibold text-slate-700 dark:text-slate-300">章节名称</label>
                <input
                  type="text"
                  value={chapterName}
                  onChange={(e) => setChapterName(e.target.value)}
                  placeholder="例如：Unit 1 高频词"
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                />
              </div>

              <div className="space-y-1.5 text-left">
                <label className="flex justify-between text-sm font-semibold text-slate-700 dark:text-slate-300">
                  <span>单词内容 *</span>
                  <span className="text-xs font-normal text-slate-400">支持文本行或 Qwerty JSON</span>
                </label>
                <div className="flex flex-wrap items-center gap-3 pb-1.5 pt-1">
                  <label className="flex cursor-pointer select-none items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50/50 px-3 py-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 dark:border-indigo-800 dark:bg-indigo-950/20 dark:text-indigo-400 dark:hover:bg-indigo-950/40">
                    <IconUpload className="h-3.5 w-3.5" />
                    <span>选择导入文件 (.json / .txt)</span>
                    <input type="file" accept=".json,.txt" className="hidden" onChange={handleFileUpload} />
                  </label>
                  {fileName && <span className="text-xs text-slate-500 dark:text-slate-400">已读取: {fileName}</span>}
                  <span className="text-xs text-slate-400">已解析 {previewCount} 个单词</span>
                </div>
                <textarea
                  rows={8}
                  value={rawText}
                  onChange={(e) => setRawText(e.target.value)}
                  placeholder={
                    '每行一个单词：\napple / 苹果\nbanana / 香蕉\n\n或者粘贴 JSON：\n[\n  {"name": "apple", "trans": ["苹果"]},\n  {"name": "banana", "trans": ["香蕉"]}\n]'
                  }
                  className="w-full rounded-lg border border-slate-200 bg-white px-3 py-2 font-mono text-sm leading-relaxed focus:outline-none focus:ring-2 focus:ring-indigo-500 dark:border-slate-800 dark:bg-slate-950"
                />
              </div>

              <label className="flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
                <input
                  type="checkbox"
                  checked={replaceMode}
                  onChange={(e) => setReplaceMode(e.target.checked)}
                  className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
                />
                覆盖本章原有单词（默认是追加，重复单词会自动跳过）
              </label>

              <div className="flex items-center justify-between pt-1">
                <span className="text-xs text-slate-400">默认按 name 去重，重复的单词不会重复导入</span>
                <div className="flex gap-2.5">
                  <button
                    type="button"
                    onClick={() => {
                      setImportChapterId(null)
                      resetImportForm()
                    }}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-indigo-500 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-indigo-600 hover:shadow"
                  >
                    {replaceMode ? '覆盖导入' : '导入单词'}
                  </button>
                </div>
              </div>
            </form>
          ) : (
            /* ---------------- 章节管理 ---------------- */
            <div className="mt-2 flex h-[32rem] flex-col">
              <div className="mb-3 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setManageDictId(null)
                    setImportChapterId(null)
                    setExpandedChapterId(null)
                    setActiveTab('list')
                  }}
                  className="flex items-center gap-1 text-sm font-medium text-slate-500 transition-colors hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400"
                >
                  <IconChevronLeft className="h-4 w-4" />
                  返回我的词典
                </button>
                <button
                  type="button"
                  onClick={handleCreateChapter}
                  className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-all hover:bg-indigo-600 hover:shadow"
                >
                  <IconPlus className="h-4 w-4" />
                  新建章节
                </button>
              </div>

              <div className="mb-3 flex items-baseline justify-between gap-3">
                <h4 className="truncate text-lg font-bold text-slate-900 dark:text-white">{manageDict.name}</h4>
                <span className="shrink-0 text-xs font-semibold text-slate-500 dark:text-slate-400">
                  {chapters.length} 章 / {getDictWords(manageDict).length} 词
                </span>
              </div>

              {notice && (
                <div className="mb-3 rounded-lg border border-emerald-100 bg-emerald-50 p-2.5 text-sm text-emerald-700 dark:border-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-400">
                  {notice}
                </div>
              )}

              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {chapters.length === 0 ? (
                  <div className="flex h-48 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-slate-200 text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    <p className="text-sm">还没有章节</p>
                    <button
                      type="button"
                      onClick={handleCreateChapter}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
                    >
                      <IconPlus className="h-4 w-4" />
                      新建第一个章节
                    </button>
                  </div>
                ) : (
                  chapters.map((chapter) => (
                    <div
                      key={chapter.id}
                      className="bg-slate-50/55 rounded-xl border border-slate-100 dark:border-slate-800 dark:bg-slate-800/40"
                    >
                      <div className="flex items-center justify-between gap-2 p-3">
                        <button
                          type="button"
                          onClick={() => setExpandedChapterId(expandedChapterId === chapter.id ? null : chapter.id)}
                          className="flex min-w-0 flex-1 items-center gap-2 text-left"
                        >
                          <IconChevronDown
                            className={`h-4 w-4 shrink-0 text-slate-400 transition-transform ${
                              expandedChapterId === chapter.id ? 'rotate-180' : ''
                            }`}
                          />
                          <span className="truncate font-semibold text-slate-900 dark:text-white">{chapter.name}</span>
                          <span className="shrink-0 rounded bg-indigo-50 px-2 py-0.5 text-xs font-semibold text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                            {chapter.words.length} 词
                          </span>
                        </button>
                        <div className="flex shrink-0 items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleOpenImport(chapter)}
                            className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                          >
                            <IconUpload className="h-3.5 w-3.5" />
                            导入单词
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRenameChapter(chapter)}
                            className="rounded-lg p-1.5 text-slate-500 transition-colors hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-700"
                            title="重命名章节"
                          >
                            <IconEdit className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeleteChapter(chapter)}
                            className="rounded-lg p-1.5 text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                            title="删除章节"
                          >
                            <IconTrash className="h-4 w-4" />
                          </button>
                        </div>
                      </div>

                      {expandedChapterId === chapter.id && (
                        <div className="border-t border-slate-100 px-3 py-2 dark:border-slate-800">
                          {chapter.words.length === 0 ? (
                            <p className="py-2 text-sm text-slate-500 dark:text-slate-400">本章还没有单词，点击「导入单词」添加</p>
                          ) : (
                            <div className="max-h-48 divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
                              {chapter.words.map((word, index) => (
                                <div key={`${word.name}-${index}`} className="flex items-center gap-3 py-1.5 text-sm">
                                  <span className="w-32 shrink-0 truncate font-mono font-semibold text-slate-800 dark:text-slate-100">
                                    {word.name}
                                  </span>
                                  <span className="min-w-0 flex-1 truncate text-slate-500 dark:text-slate-400">
                                    {word.trans.join('；') || '（无释义）'}
                                  </span>
                                  <button
                                    type="button"
                                    onClick={() => handleRemoveWord(chapter.id, index)}
                                    className="shrink-0 rounded p-1 text-slate-400 transition-colors hover:bg-rose-50 hover:text-rose-600 dark:hover:bg-rose-950/30"
                                    title="删除这个单词"
                                  >
                                    <IconTrash className="h-3.5 w-3.5" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          )
        ) : (
          /* ---------------- 词典列表 / 新建编辑 ---------------- */
          <Tabs value={activeTab} onValueChange={setActiveTab} className="mt-2 w-full">
            <TabsList className="mb-4 grid w-full grid-cols-2 rounded-lg bg-slate-100 p-1 dark:bg-slate-800">
              <TabsTrigger value="list" className="py-2">
                我的词典 ({customDicts.length})
              </TabsTrigger>
              <TabsTrigger value="add" onClick={handleOpenCreate} className="py-2">
                {editingDictId ? '修改词典信息' : '新建词典'}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="list" className="h-[30rem] overflow-y-auto pr-2">
              {notice && (
                <div className="mb-3 rounded-lg border border-emerald-100 bg-emerald-50 p-2.5 text-sm text-emerald-700 dark:border-emerald-950 dark:bg-emerald-950/30 dark:text-emerald-400">
                  {notice}
                </div>
              )}
              {customDicts.length === 0 ? (
                <div className="flex h-full flex-col items-center justify-center gap-4 text-slate-500 dark:text-slate-400">
                  <p className="text-sm">暂无自定义词典，快去创建一个吧！</p>
                  <button
                    type="button"
                    onClick={handleOpenCreate}
                    className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-indigo-600"
                  >
                    <IconPlus className="h-4 w-4" />
                    新建词典
                  </button>
                </div>
              ) : (
                <div className="space-y-4">
                  {customDicts.map((dict) => {
                    const dictChapters = getDictChapters(dict)
                    const wordCount = getDictWords(dict).length
                    const isDefault = defaultDictId === dict.id
                    return (
                      <div
                        key={dict.id}
                        className="bg-slate-50/55 rounded-xl border border-slate-100 p-4 dark:border-slate-800 dark:bg-slate-800/40"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-grow text-left">
                            <h4 className="flex items-center gap-2 truncate text-lg font-bold text-slate-900 dark:text-white">
                              <span className="truncate">{dict.name}</span>
                              {isDefault && (
                                <span className="flex shrink-0 items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-600 dark:bg-amber-950/30 dark:text-amber-400">
                                  <IconStar className="h-3 w-3 fill-current" />
                                  默认
                                </span>
                              )}
                            </h4>
                            <p className="mt-1 line-clamp-2 text-sm text-slate-500 dark:text-slate-400">{dict.description}</p>
                            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs font-semibold text-slate-500">
                              <span className="rounded bg-indigo-50 px-2 py-0.5 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                                {dictChapters.length} 章
                              </span>
                              <span className="rounded bg-indigo-50 px-2 py-0.5 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400">
                                {wordCount} 单词
                              </span>
                              <span className="rounded bg-emerald-50 px-2 py-0.5 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400">
                                {getLanguageLabel(dict.languageCategory)}
                              </span>
                            </div>
                          </div>
                          <div className="flex shrink-0 items-center gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setManageDictId(dict.id)
                                setExpandedChapterId(null)
                                setImportChapterId(null)
                                setNotice('')
                              }}
                              className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-semibold text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                              title="管理章节和单词"
                            >
                              <IconBook className="h-3.5 w-3.5" />
                              管理章节
                            </button>
                            <button
                              type="button"
                              onClick={() => handleToggleDefault(dict)}
                              className={`rounded-lg p-2 transition-colors ${
                                isDefault
                                  ? 'text-amber-500 hover:bg-amber-50 dark:hover:bg-amber-950/30'
                                  : 'text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'
                              }`}
                              title={isDefault ? '取消默认词库' : '设为默认词库'}
                            >
                              <IconStar className={`h-4 w-4 ${isDefault ? 'fill-current' : ''}`} />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleOpenEdit(dict)}
                              className="rounded-lg p-2 text-indigo-600 transition-colors hover:bg-indigo-50 dark:text-indigo-400 dark:hover:bg-indigo-950/30"
                              title="修改词典信息"
                            >
                              <IconEdit className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handleDeleteDict(dict)}
                              className="rounded-lg p-2 text-rose-600 transition-colors hover:bg-rose-50 dark:text-rose-400 dark:hover:bg-rose-950/30"
                              title="删除词典"
                            >
                              <IconTrash className="h-4 w-4" />
                            </button>
                          </div>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </TabsContent>

            <TabsContent value="add" className="h-[30rem] overflow-y-auto pr-2">
              <form onSubmit={handleDictSubmit} className="space-y-4">
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
                      {LANGUAGE_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
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

                <div className="rounded-lg border border-indigo-100 bg-indigo-50/50 p-3 text-left text-xs leading-relaxed text-indigo-700 dark:border-indigo-950 dark:bg-indigo-950/20 dark:text-indigo-300">
                  {editingDictId
                    ? '这里只修改词典的基本信息，不会影响已有的章节和单词。'
                    : '创建词典只需要填写基本信息，不需要同时导入单词。创建后可以进入「管理章节」，先新建章节，再往章节里导入单词；也可以在已有章节里继续追加单词。'}
                </div>

                <div className="flex justify-end gap-2.5 pt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setEditingDictId(null)
                      setActiveTab('list')
                      setErrorMsg('')
                    }}
                    className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition-colors hover:bg-slate-50 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800"
                  >
                    取消
                  </button>
                  <button
                    type="submit"
                    className="rounded-lg bg-indigo-500 px-5 py-2 text-sm font-medium text-white transition-all hover:bg-indigo-600 hover:shadow"
                  >
                    {editingDictId ? '保存修改' : '创建词典'}
                  </button>
                </div>
              </form>
            </TabsContent>
          </Tabs>
        )}
      </DialogContent>
    </Dialog>
  )
}
