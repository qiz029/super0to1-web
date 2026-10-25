import { LLink } from './LocaleLink'
import { thumbnail, type Video } from '../content/videos'
import { useT } from '../i18n/locale'

export function VideoCard({ video, featured }: { video: Video; featured?: boolean }) {
  const { tx } = useT()
  return (
    <LLink className={featured ? 'video-card is-featured' : 'video-card'} to={`/lens/${video.youtubeId}`}>
      <span className="video-thumb">
        <img src={video.cover || thumbnail(video.youtubeId)} alt="" loading="lazy" />
        <span className="play-button" aria-hidden="true">
          ▶
        </span>
      </span>
      <span className="meta">Super Lens</span>
      <h3>{tx(video.title)}</h3>
    </LLink>
  )
}

export function VideoGrid({ items }: { items: Video[] }) {
  return (
    <div className="grid grid-3">
      {items.map((v, i) => (
        <div data-reveal style={{ ['--i' as string]: i % 3 }} key={v.id}>
          <VideoCard video={v} />
        </div>
      ))}
    </div>
  )
}
