'use client';

import React from "react"

import { useState } from 'react';
import { AdminSidebar } from '@/components/admin-sidebar';
import { AdminHeader } from '@/components/admin-header';
import { Save, AlertCircle } from 'lucide-react';

export default function AdminSettingsPage() {
  const [activeTab, setActiveTab] = useState<'general' | 'system' | 'notifications'>('general');
  const [settings, setSettings] = useState({
    platformName: 'BookMyDoctor',
    supportEmail: 'support@bookmydoctor.com',
    contactPhone: '+1 (555) 123-4567',
    location: 'New York, USA',
    timezone: 'EST',
    currency: 'USD',
    appointmentDuration: '30',
    cancellationWindow: '24',
    consultationFeeMin: '25',
    consultationFeeMax: '250',
    emailNotifications: true,
    smsNotifications: false,
    appointmentReminders: true,
    maintenanceMode: false,
    debugMode: false,
    apiRateLimit: '1000',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value, type } = e.target;
    const val = type === 'checkbox' ? (e.target as HTMLInputElement).checked : value;
    setSettings((prev) => ({ ...prev, [name]: val }));
  };

  const handleSave = () => {
    console.log('Settings saved:', settings);
    alert('Settings saved successfully!');
  };

  return (
    <div className="flex h-screen bg-background">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-hidden lg:ml-64 pt-14 lg:pt-0">
        <AdminHeader />
        <main className="flex-1 overflow-auto">
          <div className="p-8">
            {/* Header */}
            <div className="mb-8">
              <h1 className="text-4xl font-bold text-foreground mb-2">Settings</h1>
              <p className="text-foreground/60">Manage platform configuration and preferences</p>
            </div>

            {/* Tabs */}
            <div className="flex gap-4 border-b border-border mb-8">
              {[
                { id: 'general', label: 'General Settings' },
                { id: 'system', label: 'System Configuration' },
                { id: 'notifications', label: 'Notifications' },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id as any)}
                  className={`px-6 py-4 font-medium border-b-2 transition-colors ${
                    activeTab === tab.id
                      ? 'border-primary text-primary'
                      : 'border-transparent text-foreground/60 hover:text-foreground'
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            <div className="max-w-4xl">
              {/* General Settings */}
              {activeTab === 'general' && (
                <div className="bg-card rounded-xl border border-border p-8 space-y-6">
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Platform Name
                    </label>
                    <input
                      type="text"
                      name="platformName"
                      value={settings.platformName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Support Email
                      </label>
                      <input
                        type="email"
                        name="supportEmail"
                        value={settings.supportEmail}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Contact Phone
                      </label>
                      <input
                        type="tel"
                        name="contactPhone"
                        value={settings.contactPhone}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Location
                      </label>
                      <input
                        type="text"
                        name="location"
                        value={settings.location}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Timezone
                      </label>
                      <select
                        name="timezone"
                        value={settings.timezone}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      >
                        <option>EST</option>
                        <option>CST</option>
                        <option>MST</option>
                        <option>PST</option>
                        <option>GMT</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      Currency
                    </label>
                    <select
                      name="currency"
                      value={settings.currency}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    >
                      <option>USD</option>
                      <option>EUR</option>
                      <option>GBP</option>
                      <option>CAD</option>
                    </select>
                  </div>
                </div>
              )}

              {/* System Configuration */}
              {activeTab === 'system' && (
                <div className="bg-card rounded-xl border border-border p-8 space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Appointment Duration (minutes)
                      </label>
                      <input
                        type="number"
                        name="appointmentDuration"
                        value={settings.appointmentDuration}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Cancellation Window (hours)
                      </label>
                      <input
                        type="number"
                        name="cancellationWindow"
                        value={settings.cancellationWindow}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-6">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Min. Consultation Fee ($)
                      </label>
                      <input
                        type="number"
                        name="consultationFeeMin"
                        value={settings.consultationFeeMin}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-2">
                        Max. Consultation Fee ($)
                      </label>
                      <input
                        type="number"
                        name="consultationFeeMax"
                        value={settings.consultationFeeMax}
                        onChange={handleChange}
                        className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-foreground mb-2">
                      API Rate Limit (requests/hour)
                    </label>
                    <input
                      type="number"
                      name="apiRateLimit"
                      value={settings.apiRateLimit}
                      onChange={handleChange}
                      className="w-full px-4 py-3 rounded-lg border border-border bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary"
                    />
                  </div>

                  <div className="space-y-3 p-4 bg-muted rounded-lg">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="maintenanceMode"
                        checked={settings.maintenanceMode}
                        onChange={handleChange}
                        className="w-4 h-4 accent-primary"
                      />
                      <div>
                        <p className="font-medium text-foreground">Maintenance Mode</p>
                        <p className="text-xs text-foreground/60">Put platform in maintenance mode</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="debugMode"
                        checked={settings.debugMode}
                        onChange={handleChange}
                        className="w-4 h-4 accent-primary"
                      />
                      <div>
                        <p className="font-medium text-foreground">Debug Mode</p>
                        <p className="text-xs text-foreground/60">Enable detailed error logging</p>
                      </div>
                    </label>
                  </div>
                </div>
              )}

              {/* Notifications */}
              {activeTab === 'notifications' && (
                <div className="bg-card rounded-xl border border-border p-8 space-y-6">
                  <div className="space-y-3 p-4 bg-muted rounded-lg">
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="emailNotifications"
                        checked={settings.emailNotifications}
                        onChange={handleChange}
                        className="w-4 h-4 accent-primary"
                      />
                      <div>
                        <p className="font-medium text-foreground">Email Notifications</p>
                        <p className="text-xs text-foreground/60">Send email notifications for appointments</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="smsNotifications"
                        checked={settings.smsNotifications}
                        onChange={handleChange}
                        className="w-4 h-4 accent-primary"
                      />
                      <div>
                        <p className="font-medium text-foreground">SMS Notifications</p>
                        <p className="text-xs text-foreground/60">Send SMS reminders to users</p>
                      </div>
                    </label>
                    <label className="flex items-center gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        name="appointmentReminders"
                        checked={settings.appointmentReminders}
                        onChange={handleChange}
                        className="w-4 h-4 accent-primary"
                      />
                      <div>
                        <p className="font-medium text-foreground">Appointment Reminders</p>
                        <p className="text-xs text-foreground/60">Send reminders before appointments</p>
                      </div>
                    </label>
                  </div>

                  <div className="p-4 border border-yellow-200 bg-yellow-50 rounded-lg flex gap-3">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div>
                      <p className="text-sm font-medium text-yellow-900">Note</p>
                      <p className="text-sm text-yellow-800">Changes to notification settings will take effect within 5 minutes.</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Save Button */}
              <div className="mt-8 flex gap-4">
                <button
                  onClick={handleSave}
                  className="flex items-center gap-2 bg-primary text-primary-foreground px-8 py-3 rounded-lg font-semibold hover:bg-primary/90 transition-colors"
                >
                  <Save className="w-5 h-5" />
                  Save Settings
                </button>
                <button className="px-8 py-3 rounded-lg border-2 border-border text-foreground font-semibold hover:bg-muted transition-colors">
                  Reset
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
