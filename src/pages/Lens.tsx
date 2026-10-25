import { useParams } from 'react-router'
import { VideoGrid } from '../components/VideoCard'
import { LLink } from '../components/LocaleLink'
import { useContent } from '../content/context'
import { useT } from '../i18n/locale'
import { NotFound } from './NotFound'

export function Lens() {
  const { site, videos } = useContent()
  const { t } = useT()
  return (
    <>
      <section className="page-hero container">
        <p className="eyebrow">{t.lens.eyebrow}</p>
        <h1>Super Lens</h1>
        <p className="lede">{t.lens.lede}</p>
        <a className="text-link" href={site.youtube} target="_blank" rel="noopener noreferrer">
          {t.lens.subscribe}
        </a>
      </section>
      <section className="section container">
        <VideoGrid items={videos} />
      </section>
    </>
  )
}

export function Episode() {
  const { videos } = useContent()
  const { t, tx } = useT()
  const { id } = useParams()
  const video = videos.find((v) => v.youtubeId === id)
  if (!video) return <NotFound />

  return (
    <>
      <section className="page-hero container">
        <LLink className="back-link" to="/lens">
          {t.lens.back}
        </LLink>
        <p className="eyebrow">Super Lens</p>
        <h1 className="episode-title">{tx(video.title)}</h1>
        {(video.guestName || video.publishedDate) && <p className="meta">{[video.guestName, video.publishedDate].filter(Boolean).join(' · ')}</p>}
        {tx(video.summary) && <p className="lede">{tx(video.summary)}</p>}
      </section>
      <section className="section container">
        <div className="player">
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${video.youtubeId}`}
            title={tx(video.title)}
            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
            referrerPolicy="strict-origin-when-cross-origin"
            allowFullScreen
          />
        </div>
        <div className="actions">
          <a
            className="button button-secondary"
            href={`https://www.youtube.com/watch?v=${video.youtubeId}`}
            target="_blank"
            rel="noopener noreferrer"
          >
            {t.lens.watchOnYoutube}
          </a>
        </div>
      </section>
      <section className="section container">
        <div className="section-head">
          <h2>{t.lens.keepWatching}</h2>
        </div>
        <VideoGrid items={videos.filter((v) => v.id !== video.id).slice(0, 3)} />
      </section>
    </>
  )
}
