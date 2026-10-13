import { createFileRoute } from "@tanstack/react-router"

import { Seo } from "@/components/Seo"

import { SettingsForm } from "@/features/auth/components/SettingsForm"

export const Route = createFileRoute("/_ProtectedPages/settings")({
  component: SettingsPage,
})

function SettingsPage() {
  return (
    <>
      <Seo title="Settings" />
      <section className="mx-auto w-full max-w-xl px-4 py-8">
        <h1 className="mb-6 text-2xl font-semibold tracking-tight">Settings</h1>
        <div className="rounded-lg border bg-card p-6 shadow-xs">
          <SettingsForm />
        </div>
      </section>
    </>
  )
}

