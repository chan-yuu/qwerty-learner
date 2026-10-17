import Tooltip from '@/components/Tooltip'
import { currentChapterAtom, currentDictInfoAtom, customDictsAtom, isReviewModeAtom } from '@/store'
import { getDictChapters } from '@/utils/customDict'
import range from '@/utils/range'
import { Listbox, Transition } from '@headlessui/react'
import { useAtom, useAtomValue } from 'jotai'
import { Fragment } from 'react'
import { NavLink } from 'react-router-dom'
import IconCheck from '~icons/tabler/check'

export const DictChapterButton = () => {
  const currentDictInfo = useAtomValue(currentDictInfoAtom)
  const customDicts = useAtomValue(customDictsAtom)
  const [currentChapter, setCurrentChapter] = useAtom(currentChapterAtom)
  const chapterCount = currentDictInfo.chapterCount
  const isReviewMode = useAtomValue(isReviewModeAtom)
  const customDict = customDicts.find((dict) => dict.id === currentDictInfo.id)
  const customChapters = customDict ? getDictChapters(customDict) : undefined
  const getChapterLabel = (index: number) => customChapters?.[index]?.name || `第 ${index + 1} 章`
  const noChapter = chapterCount === 0

  const handleKeyDown: React.KeyboardEventHandler<HTMLButtonElement> = (event) => {
    if (event.key === ' ') {
      event.preventDefault()
    }
  }
  return (
    <>
      <Tooltip content="词典切换">
        <NavLink
          className="block rounded-lg px-3 py-1 text-lg transition-colors duration-300 ease-in-out hover:bg-indigo-400 hover:text-white focus:outline-none dark:text-white dark:text-opacity-60 dark:hover:text-opacity-100"
          to="/gallery"
        >
          {currentDictInfo.name} {isReviewMode && '错题复习'}
        </NavLink>
      </Tooltip>
      {!isReviewMode && (
        <Tooltip content={noChapter ? '该词库还没有章节' : '章节切换'}>
          <Listbox value={currentChapter} onChange={setCurrentChapter} disabled={noChapter}>
            <Listbox.Button
              onKeyDown={handleKeyDown}
              className={`rounded-lg px-3 py-1 text-lg transition-colors duration-300 ease-in-out focus:outline-none dark:text-white dark:text-opacity-60 ${
                noChapter ? 'cursor-default opacity-60' : 'hover:bg-indigo-400 hover:text-white dark:hover:text-opacity-100'
              }`}
            >
              {noChapter ? '暂无章节' : getChapterLabel(currentChapter)}
            </Listbox.Button>
            <Transition as={Fragment} leave="transition ease-in duration-100" leaveFrom="opacity-100" leaveTo="opacity-0">
              <Listbox.Options className="listbox-options z-10 w-32">
                {range(0, chapterCount, 1).map((index) => (
                  <Listbox.Option key={index} value={index}>
                    {({ selected }) => (
                      <div className="group flex cursor-pointer items-center justify-between">
                        {selected ? (
                          <span className="listbox-options-icon">
                            <IconCheck className="focus:outline-none" />
                          </span>
                        ) : null}
                        <span>{getChapterLabel(index)}</span>
                      </div>
                    )}
                  </Listbox.Option>
                ))}
              </Listbox.Options>
            </Transition>
          </Listbox>
        </Tooltip>
      )}
    </>
  )
}
