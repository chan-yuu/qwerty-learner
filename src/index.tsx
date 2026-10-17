import Loading from './components/Loading'
import './index.css'
import { ErrorBook } from './pages/ErrorBook'
import { FriendLinks } from './pages/FriendLinks'
import MobilePage from './pages/Mobile'
import TypingPage from './pages/Typing'
import { idDictionaryMap } from '@/resources/dictionary'
import { currentChapterAtom, currentDictIdAtom, customDictsAtom, defaultDictIdAtom, isOpenDarkModeAtom } from '@/store'
import { normalizeCustomDict } from '@/utils/customDict'
import { Analytics } from '@vercel/analytics/react'
import 'animate.css'
import { useAtomValue, useSetAtom } from 'jotai'
import mixpanel from 'mixpanel-browser'
import process from 'process'
import React, { Suspense, lazy, useEffect, useRef, useState } from 'react'
import 'react-app-polyfill/stable'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'

const AnalysisPage = lazy(() => import('./pages/Analysis'))
const GalleryPage = lazy(() => import('./pages/Gallery-N'))

if (process.env.NODE_ENV === 'production') {
  // for prod
  mixpanel.init('bdc492847e9340eeebd53cc35f321691')
} else {
  // for dev
  mixpanel.init('5474177127e4767124c123b2d7846e2a', { debug: true })
}

function Root() {
  const darkMode = useAtomValue(isOpenDarkModeAtom)
  useEffect(() => {
    darkMode ? document.documentElement.classList.add('dark') : document.documentElement.classList.remove('dark')
  }, [darkMode])

  const customDicts = useAtomValue(customDictsAtom)
  const setCustomDicts = useSetAtom(customDictsAtom)
  const defaultDictId = useAtomValue(defaultDictIdAtom)
  const currentDictId = useAtomValue(currentDictIdAtom)
  const setCurrentDictId = useSetAtom(currentDictIdAtom)
  const setCurrentChapter = useSetAtom(currentChapterAtom)
  const didApplyDefault = useRef(false)

  // 兼容旧版数据：把只有 words 字段的自定义词典迁移成显式章节
  useEffect(() => {
    if (customDicts.some((dict) => !Array.isArray(dict.chapters))) {
      setCustomDicts((prev) => prev.map((dict) => (Array.isArray(dict.chapters) ? dict : normalizeCustomDict(dict))))
    }
  }, [customDicts, setCustomDicts])

  // 应用默认词典：每次页面加载只执行一次，保证刷新后回到默认词库
  useEffect(() => {
    if (didApplyDefault.current) return
    didApplyDefault.current = true

    if (!defaultDictId) return
    const exists = defaultDictId in idDictionaryMap || customDicts.some((dict) => dict.id === defaultDictId)
    if (!exists) return
    if (currentDictId !== defaultDictId) {
      setCurrentDictId(defaultDictId)
      setCurrentChapter(0)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 600)

  useEffect(() => {
    const handleResize = () => {
      const isMobile = window.innerWidth <= 600
      if (!isMobile) {
        window.location.href = '/'
      }
      setIsMobile(isMobile)
    }

    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  return (
    <React.StrictMode>
      <BrowserRouter basename={REACT_APP_DEPLOY_ENV === 'pages' ? '/qwerty-learner' : ''}>
        <Suspense fallback={<Loading />}>
          <Routes>
            {isMobile ? (
              <Route path="/*" element={<Navigate to="/mobile" />} />
            ) : (
              <>
                <Route index element={<TypingPage />} />
                <Route path="/gallery" element={<GalleryPage />} />
                <Route path="/analysis" element={<AnalysisPage />} />
                <Route path="/error-book" element={<ErrorBook />} />
                <Route path="/friend-links" element={<FriendLinks />} />
                <Route path="/*" element={<Navigate to="/" />} />
              </>
            )}
            <Route path="/mobile" element={<MobilePage />} />
          </Routes>
        </Suspense>
      </BrowserRouter>
      <Analytics />
    </React.StrictMode>
  )
}

const container = document.getElementById('root')

container && createRoot(container).render(<Root />)
