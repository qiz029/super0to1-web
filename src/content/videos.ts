import { published } from './context'
export type { Video } from '../../shared/content'
export const videos = published.videos
export const thumbnail = (id: string) => `https://i.ytimg.com/vi/${id}/hqdefault.jpg`
