import { createContext, useContext } from 'react'
import snapshot from '../../content/published/site.json'
import type { Snapshot } from '../../shared/content'

export const published = snapshot as Snapshot
export const ContentContext = createContext<Snapshot>(published)
export const useContent = () => useContext(ContentContext)
