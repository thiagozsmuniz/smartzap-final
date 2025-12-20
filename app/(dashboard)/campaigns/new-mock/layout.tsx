import { PageLayoutScope } from '@/components/providers/PageLayoutProvider'

export default function NewCampaignMockLayout({ children }: { children: React.ReactNode }) {
  return (
    <PageLayoutScope
      value={{
        width: 'wide',
        padded: true,
        overflow: 'auto',
        height: 'auto',
        showAccountAlerts: false,
      }}
    >
      {children}
    </PageLayoutScope>
  )
}
