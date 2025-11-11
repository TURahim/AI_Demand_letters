import { AppLayout } from "@/components/layout/app-layout"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"

export default function SettingsPage() {
  return (
    <AppLayout>
      <div className="flex-1 bg-background">
        <div className="container max-w-2xl mx-auto px-6 py-8">
          <div className="mb-8">
            <h1 className="text-3xl font-bold mb-2">Settings</h1>
            <p className="text-muted-foreground">Manage your account and preferences</p>
          </div>

          {/* Profile Section */}
          <Card className="p-6 border border-border mb-6">
            <h2 className="text-xl font-semibold mb-4">Profile Information</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold block mb-2">Full Name</label>
                <Input placeholder="John Doe" />
              </div>
              <div>
                <label className="text-sm font-semibold block mb-2">Email</label>
                <Input placeholder="john@example.com" type="email" />
              </div>
              <div>
                <label className="text-sm font-semibold block mb-2">Law Firm</label>
                <Input placeholder="Your Law Firm" />
              </div>
              <div>
                <label className="text-sm font-semibold block mb-2">Bar License Number</label>
                <Input placeholder="123456" />
              </div>
            </div>
          </Card>

          {/* Signature Section */}
          <Card className="p-6 border border-border mb-6">
            <h2 className="text-xl font-semibold mb-4">Default Signature</h2>
            <div className="space-y-4">
              <div>
                <label className="text-sm font-semibold block mb-2">Signature Text</label>
                <Textarea
                  placeholder="Your default closing signature"
                  rows={4}
                  defaultValue="Respectfully,

John Doe
Attorney at Law"
                />
              </div>
            </div>
          </Card>

          {/* Preferences Section */}
          <Card className="p-6 border border-border mb-6">
            <h2 className="text-xl font-semibold mb-4">Preferences</h2>
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4" />
                <span className="text-sm">Auto-save drafts</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" defaultChecked className="w-4 h-4" />
                <span className="text-sm">Email notifications</span>
              </label>
              <label className="flex items-center gap-3 cursor-pointer">
                <input type="checkbox" className="w-4 h-4" />
                <span className="text-sm">Two-factor authentication</span>
              </label>
            </div>
          </Card>

          {/* Danger Zone */}
          <Card className="p-6 border border-destructive/20 bg-destructive/5">
            <h2 className="text-xl font-semibold mb-4 text-destructive">Danger Zone</h2>
            <p className="text-sm text-muted-foreground mb-4">
              These actions cannot be undone. Please proceed with caution.
            </p>
            <div className="flex gap-3">
              <Button variant="outline" className="border-destructive/50 hover:bg-destructive/10 bg-transparent">
                Export Data
              </Button>
              <Button
                variant="outline"
                className="border-destructive text-destructive hover:bg-destructive/10 bg-transparent"
              >
                Delete Account
              </Button>
            </div>
          </Card>

          {/* Save Button */}
          <div className="flex gap-3 mt-8">
            <Button className="bg-primary hover:bg-primary/90">Save Changes</Button>
            <Button variant="outline">Cancel</Button>
          </div>
        </div>
      </div>
    </AppLayout>
  )
}
