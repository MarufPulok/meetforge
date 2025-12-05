'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import {
    Table,
    TableBody,
    TableCell,
    TableHead,
    TableHeader,
    TableRow,
} from '@/components/ui/table';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Send } from 'lucide-react';
import { useState } from 'react';

export default function OutreachPage() {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('NEW');

  const { data: templatesData } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await fetch('/api/templates');
      if (!res.ok) throw new Error('Failed to fetch templates');
      return res.json();
    },
  });

  const { data: leadsData, isLoading } = useQuery({
    queryKey: ['leads', statusFilter],
    queryFn: async () => {
      const url = `/api/leads?status=${statusFilter}`;
      const res = await fetch(url);
      if (!res.ok) throw new Error('Failed to fetch leads');
      return res.json();
    },
  });

  const sendMutation = useMutation({
    mutationFn: async (data: { leadIds: string[]; templateId: string }) => {
      const res = await fetch('/api/outreach/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) throw new Error('Failed to send outreach');
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setSelectedLeads(new Set());
      alert(`✅ Successfully sent ${data.sent} emails. ${data.failed} failed.`);
    },
  });

  const templates = templatesData?.templates || [];
  const leads = leadsData?.leads || [];

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(new Set(leads.map((lead: any) => lead._id)));
    } else {
      setSelectedLeads(new Set());
    }
  };

  const handleSelectLead = (leadId: string, checked: boolean) => {
    const newSelected = new Set(selectedLeads);
    if (checked) {
      newSelected.add(leadId);
    } else {
      newSelected.delete(leadId);
    }
    setSelectedLeads(newSelected);
  };

  const handleSend = () => {
    if (!selectedTemplate) {
      alert('Please select a template');
      return;
    }
    if (selectedLeads.size === 0) {
      alert('Please select at least one lead');
      return;
    }
    if (confirm(`Are you sure you want to send emails to ${selectedLeads.size} lead(s)?`)) {
      sendMutation.mutate({
        leadIds: Array.from(selectedLeads),
        templateId: selectedTemplate,
      });
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Send Outreach</h1>
        <p className="text-gray-600 mt-1">
          Select leads and a template to send batch outreach emails
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Outreach Configuration</CardTitle>
          <CardDescription>
            Choose a template and filter leads to contact
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <label className="text-sm font-medium">Email Template</label>
              <Select value={selectedTemplate} onValueChange={setSelectedTemplate}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a template" />
                </SelectTrigger>
                <SelectContent>
                  {templates.map((template: any) => (
                    <SelectItem key={template._id} value={template._id}>
                      {template.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Lead Status Filter</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="NEW">New Leads Only</SelectItem>
                  <SelectItem value="CONTACTED">Contacted</SelectItem>
                  <SelectItem value="REPLIED">Replied</SelectItem>
                  <SelectItem value="LOST">Lost</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="flex items-center justify-between pt-4 border-t">
            <p className="text-sm text-gray-600">
              {selectedLeads.size} lead(s) selected
            </p>
            <Button
              onClick={handleSend}
              disabled={selectedLeads.size === 0 || !selectedTemplate || sendMutation.isPending}
            >
              <Send className="mr-2 h-4 w-4" />
              {sendMutation.isPending ? 'Sending...' : `Send to ${selectedLeads.size} Lead(s)`}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Select Leads ({leads.length} {statusFilter} leads)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-center py-8 text-gray-500">Loading...</p>
          ) : leads.length === 0 ? (
            <p className="text-center py-8 text-gray-500">
              No {statusFilter.toLowerCase()} leads found
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">
                    <Checkbox
                      checked={selectedLeads.size === leads.length && leads.length > 0}
                      onCheckedChange={handleSelectAll}
                    />
                  </TableHead>
                  <TableHead>Name</TableHead>
                  <TableHead>Company</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {leads.map((lead: any) => (
                  <TableRow key={lead._id}>
                    <TableCell>
                      <Checkbox
                        checked={selectedLeads.has(lead._id)}
                        onCheckedChange={(checked) =>
                          handleSelectLead(lead._id, checked as boolean)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      {lead.firstName} {lead.lastName}
                    </TableCell>
                    <TableCell>{lead.companyName || '-'}</TableCell>
                    <TableCell>{lead.email}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          lead.status === 'NEW'
                            ? 'bg-blue-100 text-blue-700'
                            : lead.status === 'CONTACTED'
                            ? 'bg-yellow-100 text-yellow-700'
                            : lead.status === 'REPLIED'
                            ? 'bg-purple-100 text-purple-700'
                            : 'bg-red-100 text-red-700'
                        }
                      >
                        {lead.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
