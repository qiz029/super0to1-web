import { LLink } from './LocaleLink'
import { thumbnail, type Video } from '../content/videos'

export function VideoCard({ video, featured }: { video: Video; featured?: boolean }) {
  return (
    <LLink className={featured ? 'video-card is-featured' : 'video-card'} to={`/lens/${video.id}`}>
      <span className="video-thumb">
        <img src={thumbnail(video.id)} alt="" loading="lazy" />
        <span className="play-button" aria-hidden="true">
          ▶
        </span>
      </span>
      <span className="meta">Super Lens</span>
      <h3>{video.title}</h3>
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
