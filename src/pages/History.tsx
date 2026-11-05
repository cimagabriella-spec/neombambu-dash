import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { ChannelIcon, Thumb } from '@/components/content/bits'
import { Avatar, Empty, PageHeader, Segmented } from '@/components/ui'
import { formatLabel, statusLabel } from '@/lib/constants'
import { cn, fmtDate, fmtDateTime } from '@/lib/utils'
import { useApp } from '@/store/app'

const LABEL: Record<string, string> = {
  created: 'criou', submitted: 'enviou para aprovação', approved: 'aprovou', changes_requested: 'solicitou ajustes em',
  new_version: 'gerou nova versão de', status_changed: 'alterou o status de', rescheduled: 'reagendou',
}

export default function HistoryPage() {
  const { ws, lookup } = useApp()
  const [tab, setTab] = useState<'publicados' | 'atividade'>('publicados')
  const published = useMemo(() => ws.contents.filter((c) => c.status === 'publicado').sort((a, b) => b.publishDate.localeCompare(a.publishDate)), [ws])
  const events = useMemo(() => [...ws.approvals].sort((a, b) => b.createdAt.localeCompare(a.createdAt)).slice(0, 150), [ws])
  const content = (id: string) => ws.contents.find((c) => c.id === id)

  return (
    <div>
      <PageHeader kicker="Registro" title="Histórico de publicações" subtitle="O que foi ao ar, quem aprovou e toda a trilha de decisões." />
      <Segmented value={tab} onChange={setTab} items={[{ id: 'publicados', label: `Publicados · ${published.length}` }, { id: 'atividade', label: 'Atividade de aprovação' }]} className="mb-6" />
      {tab === 'publicados' ? (
        published.length === 0 ? (
          <Empty title="Nenhuma publicação registrada" />
        ) : (
          <div className="border border-line bg-white">
            {published.map((c) => (
              <Link key={c.id} to={`/conteudos/${c.id}`} className="grid grid-cols-[48px_1fr] items-center gap-4 border-b border-line px-5 py-3.5 last:border-b-0 hover:bg-paper md:grid-cols-[56px_110px_1fr_200px_220px]">
                <Thumb content={c} className="h-14 w-12" />
                <span className="hidden text-[12.5px] tabular-nums text-muted md:block">
                  {fmtDate(c.publishDate, 'dd/MM/yyyy')}
                  <br />
                  {c.publishTime}
                </span>
                <span className="min-w-0">
                  <span className="block truncate text-[13.5px]">{c.title}</span>
                  <span className="mt-0.5 flex items-center gap-1.5 text-[11.5px] text-muted">
                    <ChannelIcon channel={c.channel} /> {formatLabel(c.format)} · v{c.version}
                  </span>
                </span>
                <span className="hidden truncate text-[12px] text-wood md:block">{lookup.campaign(c.campaignId)?.name ?? '—'}</span>
                <span className="hidden text-[12px] text-muted md:block">{c.approvedBy ? `Aprovado por ${lookup.profile(c.approvedBy)?.name}` : '—'}</span>
              </Link>
            ))}
          </div>
        )
      ) : (
        <ol className="border border-line bg-white">
          {events.map((e) => {
            const c = content(e.contentId)
            return (
              <li key={e.id} className="flex items-start gap-4 border-b border-line px-5 py-3.5 last:border-b-0">
                <Avatar name={lookup.profile(e.userId)?.name} />
                <div className="min-w-0 flex-1 text-[13px]">
                  <p>
                    <span>{lookup.profile(e.userId)?.name ?? 'Sistema'}</span> <span className="text-muted">{LABEL[e.action]}</span>{' '}
                    {c ? (
                      <Link to={`/conteudos/${c.id}`} className="underline-offset-2 hover:underline">
                        {c.title}
                      </Link>
                    ) : (
                      'conteúdo excluído'
                    )}{' '}
                    <span className="text-muted">· v{e.version}</span>
                  </p>
                  {e.action === 'status_changed' && e.fromStatus && e.toStatus && (
                    <p className="text-[11.5px] text-muted">
                      {statusLabel(e.fromStatus)} → {statusLabel(e.toStatus)}
                    </p>
                  )}
                  {e.message && <p className={cn('mt-1 text-[12.5px]', e.action === 'changes_requested' ? 'text-st-ajustes' : 'text-ink/75')}>{e.message}</p>}
                </div>
                <span className="shrink-0 text-[11px] text-muted">{fmtDateTime(e.createdAt)}</span>
              </li>
            )
          })}
        </ol>
      )}
    </div>
  )
}
