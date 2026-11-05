import { Check, MessageSquare, PenLine } from 'lucide-react'
import { useState } from 'react'
import { Button, Dialog, Field, Textarea } from '@/components/ui'
import type { Content } from '@/lib/types'
import { cn, fmtDateTime } from '@/lib/utils'
import { can } from '@/lib/workflow'
import { useApp } from '@/store/app'

/** Os três botões de decisão da diretoria: APROVAR · SOLICITAR AJUSTES · COMENTAR */
export function ApprovalActions({ content, onComment, className, stacked }: { content: Content; onComment: () => void; className?: string; stacked?: boolean }) {
  const { user, provider, run, lookup } = useApp()
  const [confirm, setConfirm] = useState(false)
  const [changes, setChanges] = useState(false)
  const [msg, setMsg] = useState('')
  const [touched, setTouched] = useState(false)
  if (!user) return null
  const pending = content.status === 'aguardando'
  const canDecide = can.approve(user.role) && pending

  if (!can.approve(user.role)) return null

  return (
    <div className={className}>
      {!pending && (
        <p className="mb-3 text-[12px] text-muted">
          {content.approvedBy && content.approvedAt && ['aprovado', 'programado', 'publicado'].includes(content.status)
            ? `Aprovado por ${lookup.profile(content.approvedBy)?.name} em ${fmtDateTime(content.approvedAt)} (v${content.approvedVersion}).`
            : 'Este conteúdo não está aguardando aprovação no momento.'}
        </p>
      )}
      <div className={cn('grid gap-2', stacked ? 'grid-cols-1' : 'grid-cols-1 sm:grid-cols-3')}>
        <Button variant="olive" size="lg" disabled={!canDecide} onClick={() => setConfirm(true)}>
          <Check className="h-4 w-4" strokeWidth={1.6} /> Aprovar
        </Button>
        <Button variant="danger" size="lg" disabled={!canDecide} onClick={() => setChanges(true)}>
          <PenLine className="h-4 w-4" strokeWidth={1.4} /> Solicitar ajustes
        </Button>
        <Button variant="outline" size="lg" onClick={onComment}>
          <MessageSquare className="h-4 w-4" strokeWidth={1.4} /> Comentar
        </Button>
      </div>

      <Dialog
        open={confirm}
        onClose={() => setConfirm(false)}
        title="Aprovar publicação"
        description="A aprovação será registrada com seu nome, data e horário."
        footer={
          <>
            <Button onClick={() => setConfirm(false)}>Cancelar</Button>
            <Button
              variant="olive"
              onClick={async () => {
                setConfirm(false)
                await run(() => provider.approve([{ id: content.id, version: content.version }]), `“${content.title}” aprovado`)
              }}
            >
              Confirmar aprovação
            </Button>
          </>
        }
      >
        <p className="text-[14px]">{content.title}</p>
        <p className="mt-1 text-[12.5px] text-muted">
          Versão {content.version} · aprovação por {user.name}
        </p>
      </Dialog>

      <Dialog
        open={changes}
        onClose={() => setChanges(false)}
        title="Solicitar ajustes"
        description="Explique o que precisa mudar. O marketing será notificado e a próxima edição gera uma nova versão."
        footer={
          <>
            <Button onClick={() => setChanges(false)}>Cancelar</Button>
            <Button
              variant="primary"
              disabled={msg.trim().length < 5}
              onClick={async () => {
                setChanges(false)
                const ok = await run(() => provider.requestChanges(content.id, content.version, msg), 'Ajustes solicitados ao marketing')
                if (ok !== undefined) setMsg('')
              }}
            >
              Enviar solicitação
            </Button>
          </>
        }
      >
        <Field label="Alterações necessárias (obrigatório)" hint={touched && msg.trim().length < 5 ? <span className="text-st-ajustes">Descreva as alterações (mín. 5 caracteres).</span> : 'Para apontar um detalhe da arte, use “Comentar na imagem” no preview.'}>
          <Textarea autoFocus value={msg} onBlur={() => setTouched(true)} onChange={(e) => setMsg(e.target.value)} placeholder="Ex.: Substituir a foto de capa por uma imagem do projeto com luz natural e revisar o CTA." className="min-h-[130px]" />
        </Field>
      </Dialog>
    </div>
  )
}
