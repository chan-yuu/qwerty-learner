import { useDeleteWordRecord } from '../../../utils/db'
import Chapter from '../Chapter'
import { ErrorTable } from '../ErrorTable'
import { getRowsFromErrorWordData } from '../ErrorTable/columns'
import { ReviewDetail } from '../ReviewDetail'
import useErrorWordData from '../hooks/useErrorWords'
import { ScrollArea } from '@/components/ui/scroll-area'
import { Tabs, TabsContent } from '@/components/ui/tabs'
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group'
import {
  currentChapterAtom,
  currentDictIdAtom,
  customDictManagerRequestAtom,
  customDictsAtom,
  defaultDictIdAtom,
  reviewModeInfoAtom,
} from '@/store'
import type { Dictionary } from '@/typings'
import { getDictChapters } from '@/utils/customDict'
import range from '@/utils/range'
import { useAtom, useAtomValue, useSetAtom } from 'jotai'
import { useCallback, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import IcOutlineCollectionsBookmark from '~icons/ic/outline-collections-bookmark'
import MajesticonsPaperFoldTextLine from '~icons/majesticons/paper-fold-text-line'
import PajamasReviewList from '~icons/pajamas/review-list'
import IconBook from '~icons/tabler/book'
import IconStar from '~icons/tabler/star'
import IconTrash from '~icons/tabler/trash'

enum Tab {
  Chapters = 'chapters',
  Errors = 'errors',
  Review = 'review',
}

export default function DictDetail({ dictionary: dict }: { dictionary: Dictionary }) {
  const [currentChapter, setCurrentChapter] = useAtom(currentChapterAtom)
  const [currentDictId, setCurrentDictId] = useAtom(currentDictIdAtom)
  const [defaultDictId, setDefaultDictId] = useAtom(defaultDictIdAtom)
  const setCustomDicts = useSetAtom(customDictsAtom)
  const customDicts = useAtomValue(customDictsAtom)
  const setManagerRequest = useSetAtom(customDictManagerRequestAtom)
  const [curTab, setCurTab] = useState<Tab>(Tab.Chapters)
  const setReviewModeInfo = useSetAtom(reviewModeInfoAtom)
  const navigate = useNavigate()
  const { deleteWordRecord } = useDeleteWordRecord()
  const [reload, setReload] = useState(false)

  const chapter = useMemo(() => (dict.id === currentDictId ? currentChapter : 0), [currentChapter, currentDictId, dict.id])
  const customChapters = useMemo(() => {
    const customDict = customDicts.find((item) => item.id === dict.id)
    return customDict ? getDictChapters(customDict) : undefined
  }, [customDicts, dict.id])
  const isDefault = defaultDictId === dict.id
  const { errorWordData, isLoading, error } = useErrorWordData(dict, reload)

  const tableData = useMemo(() => {
    return getRowsFromErrorWordData(errorWordData)
  }, [errorWordData])

  const onDelete = useCallback(
    async (word: string) => {
      await deleteWordRecord(word, dict.id)
      setReload((old) => !old)
    },
    [deleteWordRecord, dict.id],
  )

  const onChangeChapter = useCallback(
    (index: number) => {
      setCurrentDictId(dict.id)
      setCurrentChapter(index)
      setReviewModeInfo((old) => ({ ...old, isReviewMode: false }))
      navigate('/')
    },
    [dict.id, navigate, setCurrentChapter, setCurrentDictId, setReviewModeInfo],
  )

  const handleTabChange = useCallback(
    (value: Tab) => {
      if (value !== curTab) {
        setCurTab(value)
      }
    },
    [curTab],
  )

  return (
    <div className="flex flex-col rounded-[4rem] px-4 py-3 pl-5 text-gray-800 dark:text-gray-300">
      <div className="text relative flex h-40 flex-col gap-2 text-left">
        <h3 className="text-2xl font-semibold">{dict.name}</h3>
        <p className="mt-1">{dict.chapterCount} 章节</p>
        <p>共 {dict.length} 词</p>
        <p>{dict.description}</p>
        <div className="absolute right-4 top-0 flex items-center gap-2">
          <button
            type="button"
            onClick={() => setDefaultDictId(isDefault ? null : dict.id)}
            title={isDefault ? '取消默认词库' : '设为默认词库，刷新后自动回到这个词库'}
            className={`flex items-center gap-1 rounded-lg px-3 py-1.5 text-sm font-medium transition-colors ${
              isDefault
                ? 'bg-amber-50 text-amber-600 hover:bg-amber-100 dark:bg-amber-950/30 dark:text-amber-400 dark:hover:bg-amber-900/30'
                : 'bg-slate-100 text-slate-600 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
            }`}
          >
            <IconStar className={`h-3.5 w-3.5 ${isDefault ? 'fill-current' : ''}`} />
            {isDefault ? '默认词库' : '设为默认'}
          </button>
          {dict.id.startsWith('custom_') && (
            <>
              <button
                type="button"
                onClick={() => setManagerRequest({ dictId: dict.id })}
                className="flex items-center gap-1 rounded-lg bg-indigo-50 px-3 py-1.5 text-sm font-medium text-indigo-600 transition-colors hover:bg-indigo-100 dark:bg-indigo-950/30 dark:text-indigo-400 dark:hover:bg-indigo-900/30"
              >
                <IconBook className="h-3.5 w-3.5" />
                管理章节
              </button>
              <button
                onClick={() => {
                  if (window.confirm('确定要删除这个自定义词库吗？此操作不可恢复。')) {
                    setCustomDicts((prev) => prev.filter((d) => d.id !== dict.id))
                    if (defaultDictId === dict.id) {
                      setDefaultDictId(null)
                    }
                    if (currentDictId === dict.id) {
                      setCurrentDictId('cet4')
                      setCurrentChapter(0)
                    }
                  }
                }}
                className="flex items-center gap-1 rounded-lg bg-rose-50 px-3 py-1.5 text-sm font-medium text-rose-600 transition-colors hover:bg-rose-100 dark:bg-rose-950/30 dark:text-rose-400 dark:hover:bg-rose-900/30"
              >
                <IconTrash className="h-3.5 w-3.5" />
                删除词库
              </button>
            </>
          )}
        </div>
        <div className="absolute bottom-5 right-4">
          <ToggleGroup type="single" value={curTab} onValueChange={handleTabChange}>
            <ToggleGroupItem
              value={Tab.Chapters}
              disabled={curTab === Tab.Chapters}
              className={`${curTab === Tab.Chapters ? 'text-primary-foreground bg-primary' : ''} disabled:opacity-100`}
            >
              <MajesticonsPaperFoldTextLine className="mr-1.5 text-gray-500" />
              章节选择
            </ToggleGroupItem>
            {errorWordData.length > 0 && (
              <>
                <ToggleGroupItem
                  value={Tab.Errors}
                  disabled={curTab === Tab.Errors}
                  className={`${curTab === Tab.Errors ? 'text-primary-foreground bg-primary' : ''} disabled:opacity-100`}
                >
                  <IcOutlineCollectionsBookmark className="mr-1.5 text-gray-500" />
                  查看错题
                </ToggleGroupItem>
                <ToggleGroupItem
                  value={Tab.Review}
                  disabled={curTab === Tab.Review}
                  className={`${curTab === Tab.Review ? 'text-primary-foreground bg-primary' : ''} disabled:opacity-100`}
                >
                  <PajamasReviewList className="mr-1.5 text-gray-500" />
                  错题回顾
                </ToggleGroupItem>
              </>
            )}
          </ToggleGroup>
        </div>
      </div>
      <div className="flex pl-0">
        <Tabs value={curTab} className="h-[30rem] w-full ">
          <TabsContent value={Tab.Chapters} className="h-full ">
            <ScrollArea className="h-[30rem] ">
              <div className="flex w-full flex-wrap gap-3">
                {range(0, dict.chapterCount, 1).map((index) => (
                  <Chapter
                    key={`${dict.id}-${index}`}
                    index={index}
                    label={customChapters?.[index]?.name}
                    checked={chapter === index}
                    dictID={dict.id}
                    onChange={onChangeChapter}
                  />
                ))}
                {dict.chapterCount === 0 && (
                  <div className="flex h-32 w-full flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-slate-200 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                    <p>该词库还没有章节和单词</p>
                    <button
                      type="button"
                      onClick={() => setManagerRequest({ dictId: dict.id })}
                      className="flex items-center gap-1.5 rounded-lg bg-indigo-500 px-3 py-1.5 text-xs font-medium text-white transition-colors hover:bg-indigo-600"
                    >
                      <IconBook className="h-3.5 w-3.5" />
                      新建章节并导入单词
                    </button>
                  </div>
                )}
              </div>
            </ScrollArea>
          </TabsContent>
          <TabsContent value={Tab.Errors} className="h-full">
            <ErrorTable data={tableData} isLoading={isLoading} error={error} onDelete={onDelete} />
          </TabsContent>
          <TabsContent value={Tab.Review} className="h-full">
            <ReviewDetail errorData={errorWordData} dict={dict} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
