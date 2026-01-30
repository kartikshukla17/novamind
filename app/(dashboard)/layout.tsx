import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { Sidebar } from '@/components/Sidebar'
import { Header } from '@/components/Header'
import { DashboardWrapper } from '@/components/DashboardWrapper'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return (
    <DashboardWrapper>
      <div className="min-h-screen bg-warm-50 dark:bg-warm-900">
        <Sidebar />
        <div className="lg:pl-72">
          <Header user={user} />
          <main className="p-4 md:p-6 lg:p-8 min-h-[calc(100vh-4rem)]">
            <div className="max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </div>
    </DashboardWrapper>
  )
}
