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
import { AlertCircle, Eye, FileText, Mail, PlusCircle, Send, Sparkles, User } from 'lucide-react';
import Link from 'next/link';
import { useMemo, useState } from 'react';
import { toast } from 'sonner';

interface Template {
  _id: string;
  name: string;
  subject: string;
  body: string;
  createdAt: string;
}

interface Lead {
  _id: string;
  firstName: string;
  lastName: string;
  email: string;
  companyName?: string;
  location?: string;
  status: string;
}

interface OfferConfig {
  nicheName: string;
  icpDescription: string;
  offerDescription: string;
  fromName: string;
  fromEmail: string;
  calendlyUrl: string;
}

/**
 * Replace template variables with lead and offer config data for preview
 */
function personalizeContent(
  text: string, 
  lead: Lead | null, 
  offerConfig: OfferConfig | null
): string {
  let result = text;
  
  // Replace lead variables
  if (lead) {
    result = result
      .replace(/\{\{firstName\}\}/g, lead.firstName || '')
      .replace(/\{\{lastName\}\}/g, lead.lastName || '')
      .replace(/\{\{companyName\}\}/g, lead.companyName || 'Company')
      .replace(/\{\{location\}\}/g, lead.location || 'Location')
      .replace(/\{\{email\}\}/g, lead.email || '');
  }
  
  // Replace offer config variables
  if (offerConfig) {
    result = result
      .replace(/\{\{calendlyUrl\}\}/g, offerConfig.calendlyUrl || '')
      .replace(/\{\{fromName\}\}/g, offerConfig.fromName || '')
      .replace(/\{\{nicheName\}\}/g, offerConfig.nicheName || '')
      .replace(/\{\{icpDescription\}\}/g, offerConfig.icpDescription || '')
      .replace(/\{\{offerDescription\}\}/g, offerConfig.offerDescription || '');
  }
  
  return result;
}

/**
 * Highlight template variables in content for display
 */
function highlightVariables(text: string): React.ReactNode[] {
  const parts = text.split(/(\{\{[^}]+\}\})/g);
  return parts.map((part, i) => {
    if (part.match(/\{\{[^}]+\}\}/)) {
      return (
        <span key={i} className="bg-purple-100 text-purple-700 px-1 rounded font-medium">
          {part}
        </span>
      );
    }
    return part;
  });
}

export default function OutreachPage() {
  const queryClient = useQueryClient();
  const [selectedTemplate, setSelectedTemplate] = useState<string>('');
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [statusFilter, setStatusFilter] = useState<string>('NEW');
  const [showPersonalized, setShowPersonalized] = useState(false);

  const { data: templatesData } = useQuery({
    queryKey: ['templates'],
    queryFn: async () => {
      const res = await fetch('/api/templates');
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch templates');
      }
      return res.json();
    },
  });

  const { data: leadsData, isLoading } = useQuery({
    queryKey: ['leads', statusFilter],
    queryFn: async () => {
      const url = `/api/leads?status=${statusFilter}`;
      const res = await fetch(url);
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch leads');
      }
      return res.json();
    },
  });

  // Fetch offer config for personalization
  const { data: offerConfigData } = useQuery({
    queryKey: ['offerConfig'],
    queryFn: async () => {
      const res = await fetch('/api/offer-config');
      if (!res.ok) return null;
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
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to send outreach');
      }
      return res.json();
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['leads'] });
      setSelectedLeads(new Set());
      
      if (data.failed > 0) {
        toast.warning('Emails Partially Sent', {
          description: `Successfully sent ${data.sent} email(s). ${data.failed} failed to send.`,
        });
      } else {
        toast.success('Emails Sent Successfully', {
          description: `Successfully sent ${data.sent} email(s) to your leads.`,
        });
      }
    },
    onError: (error: Error) => {
      toast.error('Send Failed', {
        description: error.message || 'Failed to send outreach emails. Please try again.',
      });
    },
  });

  const templates: Template[] = templatesData?.templates || [];
  const leads: Lead[] = leadsData?.leads || [];
  const offerConfig: OfferConfig | null = offerConfigData?.config || null;

  // Get the selected template object
  const currentTemplate = useMemo(() => {
    return templates.find(t => t._id === selectedTemplate) || null;
  }, [templates, selectedTemplate]);

  // Get the first selected lead for preview
  const previewLead = useMemo(() => {
    const firstSelectedId = Array.from(selectedLeads)[0];
    return leads.find(l => l._id === firstSelectedId) || null;
  }, [leads, selectedLeads]);

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedLeads(new Set(leads.map((lead: Lead) => lead._id)));
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
      toast.error('Template Required', {
        description: 'Please select an email template before sending.',
      });
      return;
    }
    if (selectedLeads.size === 0) {
      toast.error('No Leads Selected', {
        description: 'Please select at least one lead to send emails to.',
      });
      return;
    }
    
    toast.promise(
      sendMutation.mutateAsync({
        leadIds: Array.from(selectedLeads),
        templateId: selectedTemplate,
      }),
      {
        loading: `Sending emails to ${selectedLeads.size} lead(s)...`,
      }
    );
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <Send className="h-8 w-8 text-blue-500" />
          Send Outreach
        </h1>
        <p className="text-gray-600 mt-1">
          Select a template and leads, preview your email, then send
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left Column - Configuration */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-purple-500" />
                Outreach Configuration
              </CardTitle>
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
                      {templates.length === 0 ? (
                        <div className="p-4 text-center text-gray-500 text-sm">
                          No templates found
                        </div>
                      ) : (
                        templates.map((template: Template) => (
                          <SelectItem key={template._id} value={template._id}>
                            {template.name}
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  {templates.length === 0 && (
                    <Link 
                      href="/templates/new" 
                      className="inline-flex items-center gap-1 text-sm text-purple-600 hover:text-purple-700"
                    >
                      <PlusCircle className="h-4 w-4" />
                      Create your first template
                    </Link>
                  )}
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
                <div className="flex items-center gap-4">
                  <p className="text-sm text-gray-600">
                    <span className="font-semibold text-gray-900">{selectedLeads.size}</span> lead(s) selected
                  </p>
                  {currentTemplate && (
                    <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                      <Sparkles className="h-3 w-3 mr-1" />
                      {currentTemplate.name}
                    </Badge>
                  )}
                </div>
                <Button
                  onClick={handleSend}
                  disabled={selectedLeads.size === 0 || !selectedTemplate || sendMutation.isPending}
                  className="bg-gradient-to-r from-blue-500 to-purple-500 hover:from-blue-600 hover:to-purple-600"
                >
                  <Send className="mr-2 h-4 w-4" />
                  {sendMutation.isPending ? 'Sending...' : `Send to ${selectedLeads.size} Lead(s)`}
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Select Leads ({leads.length} {statusFilter.toLowerCase()} leads)</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-500"></div>
                </div>
              ) : leads.length === 0 ? (
                <div className="text-center py-12">
                  <AlertCircle className="h-12 w-12 text-gray-300 mx-auto mb-3" />
                  <p className="text-gray-500 font-medium">No {statusFilter.toLowerCase()} leads found</p>
                  <p className="text-gray-400 text-sm mt-1">
                    Try changing the status filter or{' '}
                    <Link href="/leads/scrape" className="text-purple-600 hover:underline">
                      scrape new leads
                    </Link>
                  </p>
                </div>
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
                    {leads.map((lead: Lead) => (
                      <TableRow 
                        key={lead._id}
                        className={selectedLeads.has(lead._id) ? 'bg-purple-50' : ''}
                      >
                        <TableCell>
                          <Checkbox
                            checked={selectedLeads.has(lead._id)}
                            onCheckedChange={(checked) =>
                              handleSelectLead(lead._id, checked as boolean)
                            }
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {lead.firstName} {lead.lastName}
                        </TableCell>
                        <TableCell>{lead.companyName || '-'}</TableCell>
                        <TableCell className="text-gray-600">{lead.email}</TableCell>
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

        {/* Right Column - Email Preview */}
        <div className="space-y-4">
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <Eye className="h-5 w-5 text-blue-500" />
                  Email Preview
                </span>
                {currentTemplate && previewLead && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setShowPersonalized(!showPersonalized)}
                    className="text-xs"
                  >
                    {showPersonalized ? 'Show Variables' : 'Show Personalized'}
                  </Button>
                )}
              </CardTitle>
              <CardDescription>
                {currentTemplate 
                  ? previewLead 
                    ? `Preview for ${previewLead.firstName} ${previewLead.lastName}`
                    : 'Select a lead to see personalized preview'
                  : 'Select a template to preview'
                }
              </CardDescription>
            </CardHeader>
            <CardContent>
              {!currentTemplate ? (
                <div className="text-center py-8">
                  <Mail className="h-12 w-12 text-gray-200 mx-auto mb-3" />
                  <p className="text-gray-400 text-sm">
                    Select a template to preview your email
                  </p>
                </div>
              ) : (
                <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                  {/* Email Header */}
                  <div className="bg-gradient-to-r from-gray-50 to-gray-100 border-b px-4 py-3">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-gray-500 font-medium">Subject:</span>
                      <span className="font-semibold text-gray-900">
                        {showPersonalized && previewLead
                          ? personalizeContent(currentTemplate.subject, previewLead, offerConfig)
                          : highlightVariables(currentTemplate.subject)
                        }
                      </span>
                    </div>
                  </div>
                  
                  {/* Email Body */}
                  <div className="p-4 text-sm space-y-3 max-h-[400px] overflow-y-auto">
                    {(showPersonalized && previewLead
                      ? personalizeContent(currentTemplate.body, previewLead, offerConfig)
                      : currentTemplate.body
                    ).split('\n').map((line, i) => (
                      <p key={i} className="text-gray-700 leading-relaxed">
                        {showPersonalized && previewLead ? line : highlightVariables(line)}
                      </p>
                    ))}
                  </div>

                  {/* Template Info Footer */}
                  <div className="bg-gray-50 border-t px-4 py-2">
                    <div className="flex items-center justify-between text-xs text-gray-500">
                      <span className="flex items-center gap-1">
                        <FileText className="h-3 w-3" />
                        {currentTemplate.name}
                      </span>
                      <span>
                        Created {new Date(currentTemplate.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Preview Legend */}
              {currentTemplate && !showPersonalized && (
                <div className="mt-4 p-3 bg-purple-50 rounded-lg border border-purple-100">
                  <p className="text-xs text-purple-700 font-medium mb-2">
                    Variable Legend
                  </p>
                  <div className="flex flex-wrap gap-2">
                    <span className="text-xs bg-white px-2 py-1 rounded border border-purple-200">
                      <span className="bg-purple-100 text-purple-700 px-1 rounded">{'{{firstName}}'}</span> = Lead's first name
                    </span>
                    <span className="text-xs bg-white px-2 py-1 rounded border border-purple-200">
                      <span className="bg-purple-100 text-purple-700 px-1 rounded">{'{{companyName}}'}</span> = Company
                    </span>
                  </div>
                </div>
              )}

              {/* Personalization Preview Info */}
              {currentTemplate && previewLead && showPersonalized && (
                <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-100">
                  <p className="text-xs text-green-700 flex items-center gap-1">
                    <User className="h-3 w-3" />
                    Showing preview for: <span className="font-semibold">{previewLead.firstName} {previewLead.lastName}</span>
                    {previewLead.companyName && <span className="text-green-600">at {previewLead.companyName}</span>}
                  </p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Quick Stats */}
          {currentTemplate && selectedLeads.size > 0 && (
            <Card className="bg-gradient-to-br from-blue-50 to-purple-50 border-blue-100">
              <CardContent className="pt-4">
                <p className="text-sm font-medium text-gray-700 mb-2">Ready to Send</p>
                <div className="grid grid-cols-2 gap-3 text-center">
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-2xl font-bold text-blue-600">{selectedLeads.size}</p>
                    <p className="text-xs text-gray-500">Recipients</p>
                  </div>
                  <div className="bg-white rounded-lg p-3 shadow-sm">
                    <p className="text-2xl font-bold text-purple-600">1</p>
                    <p className="text-xs text-gray-500">Template</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
