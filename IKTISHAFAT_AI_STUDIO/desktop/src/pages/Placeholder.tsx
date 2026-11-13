import { Lang, t } from '../i18n'
import { Card } from '../components/ui'
export default function Placeholder({ lang, id, phase }: { lang: Lang; id: string; phase: number | null }) {
  return (
    <Card title={t(lang, id)}>
      <p>{t(lang, 'notImpl')}{phase ? ` — ${t(lang, 'plannedIn')} ${phase}` : ''}</p>
    </Card>
  )
}
