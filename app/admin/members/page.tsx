// app/admin/members/page.tsx
'use client';

import { useState, useEffect } from 'react';
import { Card } from '../../../components/ui/card';
import {
  Search,
  Filter,
  Download,
  UserCheck,
  UserX,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  Eye,
  Ban,
  CheckCircle,
  XCircle
} from 'lucide-react';

interface Member {
  id: string;
  username: string;
  email: string;
  referralCode: string;
  lifetimeEarnings: number;
  totalReferred: number;
  memberOrigin: 'organic' | 'referred';
  createdAt: string;
  lastActive: string;
  status: 'active' | 'suspended' | 'banned';
  riskLevel?: 'low' | 'medium' | 'high' | 'critical';
}

export default function AdminMembers() {
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterRisk, setFilterRisk] = useState<string>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selectedMember, setSelectedMember] = useState<Member | null>(null);

  useEffect(() => {
    fetchMembers();
  }, [page, filterStatus, filterRisk]);

  const fetchMembers = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '20',
        status: filterStatus,
        risk: filterRisk,
      });

      const response = await fetch(`/api/admin/members?${params}`);
      const data = await response.json();
      setMembers(data.members);
      setTotalPages(data.totalPages);
    } catch (error) {
      console.error('Failed to fetch members:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    // Implement search logic
    console.log('Searching for:', searchTerm);
  };

  const exportData = async () => {
    try {
      const response = await fetch('/api/admin/members/export');
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `members-export-${new Date().toISOString()}.csv`;
      a.click();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleMemberAction = async (memberId: string, action: 'suspend' | 'ban' | 'activate') => {
    try {
      const response = await fetch(`/api/admin/members/${memberId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action })
      });

      if (response.ok) {
        fetchMembers(); // Refresh the list
      }
    } catch (error) {
      console.error('Action failed:', error);
    }
  };

  const filteredMembers = members.filter(member =>
    member.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
    member.referralCode.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">Member Management</h1>
          <p className="text-gray-400 mt-1">Manage and monitor platform members</p>
        </div>

        <button
          onClick={exportData}
          className="flex items-center gap-2 px-4 py-2 bg-purple-600 hover:bg-purple-700 rounded-lg text-white transition"
        >
          <Download className="w-4 h-4" />
          Export CSV
        </button>
      </div>

      {/* Filters and Search */}
      <Card className="p-4 bg-gray-900 border-gray-800">
        <div className="flex flex-col lg:flex-row gap-4">
          {/* Search */}
          <form onSubmit={handleSearch} className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by username, email, or referral code..."
                className="w-full pl-10 pr-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-purple-500"
              />
            </div>
          </form>

          {/* Status Filter */}
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="suspended">Suspended</option>
            <option value="banned">Banned</option>
          </select>

          {/* Risk Filter */}
          <select
            value={filterRisk}
            onChange={(e) => setFilterRisk(e.target.value)}
            className="px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
          >
            <option value="all">All Risk Levels</option>
            <option value="low">Low Risk</option>
            <option value="medium">Medium Risk</option>
            <option value="high">High Risk</option>
            <option value="critical">Critical Risk</option>
          </select>
        </div>
      </Card>

      {/* Members Table */}
      <Card className="bg-gray-900 border-gray-800 overflow-hidden">
        {loading ? (
          <div className="p-8 flex justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-gray-800 border-b border-gray-700">
                <tr>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Member</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Origin</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Earnings</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Referrals</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Risk</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Status</th>
                  <th className="text-left px-4 py-3 text-gray-400 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredMembers.map((member) => (
                  <tr key={member.id} className="border-b border-gray-800 hover:bg-gray-800/50">
                    <td className="px-4 py-4">
                      <div>
                        <p className="text-white font-medium">{member.username}</p>
                        <p className="text-gray-400 text-sm">{member.email}</p>
                        <p className="text-gray-500 text-xs">{member.referralCode}</p>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center px-2 py-1 rounded text-xs ${
                        member.memberOrigin === 'referred'
                          ? 'bg-purple-500/20 text-purple-400'
                          : 'bg-gray-700 text-gray-400'
                      }`}>
                        {member.memberOrigin}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-white">
                      ${member.lifetimeEarnings.toFixed(2)}
                    </td>
                    <td className="px-4 py-4 text-white">
                      {member.totalReferred}
                    </td>
                    <td className="px-4 py-4">
                      {member.riskLevel && (
                        <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                          member.riskLevel === 'low'
                            ? 'bg-green-500/20 text-green-400'
                            : member.riskLevel === 'medium'
                            ? 'bg-yellow-500/20 text-yellow-400'
                            : member.riskLevel === 'high'
                            ? 'bg-orange-500/20 text-orange-400'
                            : 'bg-red-500/20 text-red-400'
                        }`}>
                          {member.riskLevel === 'critical' && <AlertTriangle className="w-3 h-3" />}
                          {member.riskLevel}
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-4">
                      <span className={`inline-flex items-center gap-1 px-2 py-1 rounded text-xs ${
                        member.status === 'active'
                          ? 'bg-green-500/20 text-green-400'
                          : member.status === 'suspended'
                          ? 'bg-yellow-500/20 text-yellow-400'
                          : 'bg-red-500/20 text-red-400'
                      }`}>
                        {member.status === 'active' && <CheckCircle className="w-3 h-3" />}
                        {member.status === 'suspended' && <AlertTriangle className="w-3 h-3" />}
                        {member.status === 'banned' && <XCircle className="w-3 h-3" />}
                        {member.status}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex gap-2">
                        <button
                          onClick={() => setSelectedMember(member)}
                          className="p-1.5 rounded hover:bg-gray-700 text-gray-400 hover:text-white transition"
                          title="View Details"
                        >
                          <Eye className="w-4 h-4" />
                        </button>
                        {member.status === 'active' ? (
                          <button
                            onClick={() => handleMemberAction(member.id, 'suspend')}
                            className="p-1.5 rounded hover:bg-gray-700 text-yellow-400 hover:text-yellow-300 transition"
                            title="Suspend"
                          >
                            <UserX className="w-4 h-4" />
                          </button>
                        ) : (
                          <button
                            onClick={() => handleMemberAction(member.id, 'activate')}
                            className="p-1.5 rounded hover:bg-gray-700 text-green-400 hover:text-green-300 transition"
                            title="Activate"
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleMemberAction(member.id, 'ban')}
                          className="p-1.5 rounded hover:bg-gray-700 text-red-400 hover:text-red-300 transition"
                          title="Ban"
                        >
                          <Ban className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="p-4 border-t border-gray-800 flex items-center justify-between">
          <p className="text-gray-400 text-sm">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              onClick={() => setPage(Math.max(1, page - 1))}
              disabled={page === 1}
              className="p-2 rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-gray-400 hover:text-white transition"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setPage(Math.min(totalPages, page + 1))}
              disabled={page === totalPages}
              className="p-2 rounded hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed text-gray-400 hover:text-white transition"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </Card>

      {/* Member Detail Modal */}
      {selectedMember && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <Card className="bg-gray-900 border-gray-800 p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-start mb-4">
              <h2 className="text-xl font-semibold text-white">Member Details</h2>
              <button
                onClick={() => setSelectedMember(null)}
                className="text-gray-400 hover:text-white"
              >
                <XCircle className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-gray-400 text-sm">Username</p>
                  <p className="text-white">{selectedMember.username}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Email</p>
                  <p className="text-white">{selectedMember.email}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Referral Code</p>
                  <p className="text-white font-mono">{selectedMember.referralCode}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Member Since</p>
                  <p className="text-white">
                    {new Date(selectedMember.createdAt).toLocaleDateString()}
                  </p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Lifetime Earnings</p>
                  <p className="text-white">${selectedMember.lifetimeEarnings.toFixed(2)}</p>
                </div>
                <div>
                  <p className="text-gray-400 text-sm">Total Referrals</p>
                  <p className="text-white">{selectedMember.totalReferred}</p>
                </div>
              </div>

              <div className="pt-4 border-t border-gray-800 flex gap-3">
                <button
                  onClick={() => {
                    handleMemberAction(selectedMember.id, 'suspend');
                    setSelectedMember(null);
                  }}
                  className="px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-lg hover:bg-yellow-500/30 transition"
                >
                  Suspend Account
                </button>
                <button
                  onClick={() => {
                    handleMemberAction(selectedMember.id, 'ban');
                    setSelectedMember(null);
                  }}
                  className="px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition"
                >
                  Ban Account
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}