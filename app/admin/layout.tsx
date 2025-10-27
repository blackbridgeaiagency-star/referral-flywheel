// app/admin/layout.tsx
import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Admin Dashboard - Referral Flywheel',
  description: 'Platform administration and management',
};

export default function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-950">
      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 min-h-screen bg-gray-900 border-r border-gray-800">
          <div className="p-6">
            <h2 className="text-xl font-bold text-white mb-6">Admin Panel</h2>

            <nav className="space-y-2">
              <a href="/admin" className="block px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition">
                Dashboard
              </a>
              <a href="/admin/members" className="block px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition">
                Members
              </a>
              <a href="/admin/creators" className="block px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition">
                Creators
              </a>
              <a href="/admin/commissions" className="block px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition">
                Commissions
              </a>
              <a href="/admin/fraud" className="block px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition">
                Fraud Detection
              </a>
              <a href="/admin/webhooks" className="block px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition">
                Webhooks
              </a>
              <a href="/admin/analytics" className="block px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition">
                Analytics
              </a>
              <a href="/admin/settings" className="block px-4 py-2 rounded-lg text-gray-300 hover:bg-gray-800 hover:text-white transition">
                Settings
              </a>
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 p-8">
          {children}
        </main>
      </div>
    </div>
  );
}