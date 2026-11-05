import { Instagram, Linkedin, MapPin } from 'lucide-react'
import { useState } from 'react'
import type { ContentFields } from '@/lib/types'
import { cn } from '@/lib/utils'
import { defaultMode, Preview, PREVIEW_MODES, type PreviewMode } from './Previews'
import type { PinProps } from './Media'

/** Alterna entre canais/formatos e ativa o modo de comentário na imagem. */
export function PreviewStudio({ fields, pins, canAnnotate = true, className, mode: forced }: { fields: ContentFields; pins: Omit<PinProps, 'annotate'>; canAnnotate?: boolean; className?: string; mode?: PreviewMode }) {
  const [mode, setMode] = useState<PreviewMode>(forced ?? defaultMode(fields))
  const [annotate, setAnnotate] = useState(false)
  const native = defaultMode(fields)
  return (
    <div className={className}>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          {(['Instagram', 'LinkedIn'] as const).map((g) => (
            <div key={g} className="flex items-center border border-line bg-white p-0.5">
              <span className="px-2 text-muted">{g === 'Instagram' ? <Instagram className="h-3.5 w-3.5" strokeWidth={1.4} /> : <Linkedin className="h-3.5 w-3.5" strokeWidth={1.4} />}</span>
              {PREVIEW_MODES.filter((m) => m.group === g).map((m) => (
                <button key={m.id} onClick={() => setMode(m.id)} className={cn('relative px-2.5 py-1.5 text-[11.5px] transition-colors', mode === m.id ? 'bg-ink text-paper' : 'text-muted hover:text-ink')}>
                  {m.label}
                  {m.id === native && <span className={cn('absolute right-1 top-1 h-1 w-1 rounded-full', mode === m.id ? 'bg-sand' : 'bg-wood')} title="Formato do conteúdo" />}
                </button>
              ))}
            </div>
          ))}
        </div>
        {canAnnotate && fields.assets.length > 0 && (
          <button
            onClick={() => setAnnotate((a) => !a)}
            className={cn('flex items-center gap-1.5 border px-3 py-1.5 text-[11.5px] transition-colors', annotate ? 'border-ink bg-ink text-paper' : 'border-line bg-white text-muted hover:text-ink')}
          >
            <MapPin className="h-3.5 w-3.5" strokeWidth={1.4} /> {annotate ? 'Clique na arte para marcar' : 'Comentar na imagem'}
          </button>
        )}
      </div>
      <div className="grid min-h-[300px] place-items-center bg-mineral/50 px-3 py-8 sm:px-6 sm:py-10">
        <Preview
          mode={mode}
          c={fields}
          pins={{
            ...pins,
            annotate,
            onPin: (a, x, y) => {
              pins.onPin?.(a, x, y)
              setAnnotate(false)
            },
          }}
        />
      </div>
      {mode !== native && <p className="mt-2 text-center text-[11px] text-muted">Simulação em formato diferente do planejado — use para avaliar adaptações.</p>}
    </div>
  )
}
