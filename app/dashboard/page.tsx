import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { connectDB } from '@/lib/db';
import { Lead } from '@/models/Lead';
import { OutreachMessage } from '@/models/OutreachMessage';
import { CheckCircle, Clock, Mail, Users, XCircle } from 'lucide-react';

async function getDashboardStats() {
  await connectDB();

  const [
    totalLeads,
    newLeads,
    contactedLeads,
    repliedLeads,
    bookedLeads,
    lostLeads,
    recentMessages,
  ] = await Promise.all([
    Lead.countDocuments(),
    Lead.countDocuments({ status: 'NEW' }),
    Lead.countDocuments({ status: 'CONTACTED' }),
    Lead.countDocuments({ status: 'REPLIED' }),
    Lead.countDocuments({ status: 'MEETING_BOOKED' }),
    Lead.countDocuments({ status: 'LOST' }),
    OutreachMessage.countDocuments({
      sentAt: { $gte: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000) },
      status: 'SENT',
    }),
  ]);

  const recentlyContacted = await Lead.find({ status: { $ne: 'NEW' } })
    .sort({ lastContactedAt: -1 })
    .limit(5)
    .lean();

  return {
    totalLeads,
    newLeads,
    contactedLeads,
    repliedLeads,
    bookedLeads,
    lostLeads,
    recentMessages,
    recentlyContacted,
  };
}

export default async function DashboardPage() {
  const stats = await getDashboardStats();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-gray-600 mt-1">
          Overview of your leads and outreach campaigns
        </p>
      </div>

      {/* Stats Grid */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Leads</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalLeads}</div>
            <p className="text-xs text-muted-foreground">
              {stats.newLeads} new
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Contacted</CardTitle>
            <Mail className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.contactedLeads}</div>
            <p className="text-xs text-muted-foreground">
              awaiting response
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Meetings Booked</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.bookedLeads}</div>
            <p className="text-xs text-muted-foreground">
              {stats.repliedLeads} replied
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Last 7 Days</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.recentMessages}</div>
            <p className="text-xs text-muted-foreground">
              emails sent
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Status Breakdown */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lead Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-blue-500" />
                  <span className="text-sm">New</span>
                </div>
                <span className="text-sm font-medium">{stats.newLeads}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-yellow-500" />
                  <span className="text-sm">Contacted</span>
                </div>
                <span className="text-sm font-medium">{stats.contactedLeads}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-purple-500" />
                  <span className="text-sm">Replied</span>
                </div>
                <span className="text-sm font-medium">{stats.repliedLeads}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-green-500" />
                  <span className="text-sm">Meeting Booked</span>
                </div>
                <span className="text-sm font-medium">{stats.bookedLeads}</span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="h-3 w-3 rounded-full bg-red-500" />
                  <span className="text-sm">Lost</span>
                </div>
                <span className="text-sm font-medium">{stats.lostLeads}</span>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Recently Contacted */}
        <Card>
          <CardHeader>
            <CardTitle>Recently Contacted</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentlyContacted.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recently contacted leads</p>
            ) : (
              <div className="space-y-4">
                {stats.recentlyContacted.map((lead) => (
                  <div key={lead._id.toString()} className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium">
                        {lead.firstName} {lead.lastName}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {lead.companyName || lead.email}
                      </p>
                    </div>
                    <span
                      className={`text-xs rounded-full px-2 py-1 ${
                        lead.status === 'MEETING_BOOKED'
                          ? 'bg-green-100 text-green-700'
                          : lead.status === 'REPLIED'
                          ? 'bg-purple-100 text-purple-700'
                          : lead.status === 'CONTACTED'
                          ? 'bg-yellow-100 text-yellow-700'
                          : 'bg-red-100 text-red-700'
                      }`}
                    >
                      {lead.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
