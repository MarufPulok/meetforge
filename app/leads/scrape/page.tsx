'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
import { Textarea } from '@/components/ui/textarea';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Download, Loader2, Search, Sparkles, Users } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface ScrapedLead {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  companyName: string;
  location: string;
  notes: string;
  linkedinUrl?: string;
  selected?: boolean;
}

const INDUSTRIES = [
  { value: 'hvac', label: 'HVAC & Heating' },
  { value: 'plumbing', label: 'Plumbing' },
  { value: 'dental', label: 'Dental & Healthcare' },
  { value: 'real_estate', label: 'Real Estate' },
  { value: 'fitness', label: 'Fitness & Gyms' },
  { value: 'restaurant', label: 'Restaurants & Food' },
  { value: 'salon', label: 'Salons & Beauty' },
  { value: 'auto', label: 'Auto Services' },
  { value: 'legal', label: 'Legal Services' },
  { value: 'construction', label: 'Construction' },
];

const JOB_TITLES = [
  { value: 'owner', label: 'Owner' },
  { value: 'ceo', label: 'CEO' },
  { value: 'founder', label: 'Founder' },
  { value: 'manager', label: 'Manager' },
  { value: 'director', label: 'Director' },
  { value: 'president', label: 'President' },
];

export default function ScrapeLeadsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [industry, setIndustry] = useState('');
  const [jobTitle, setJobTitle] = useState('');
  const [location, setLocation] = useState('');
  const [apolloUrl, setApolloUrl] = useState('');
  const [useApolloUrl, setUseApolloUrl] = useState(false);
  const [scrapedLeads, setScrapedLeads] = useState<ScrapedLead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());

  const scrapeMutation = useMutation({
    mutationFn: async () => {
      const requestBody = useApolloUrl
        ? { searchUrl: apolloUrl }
        : {
            keywords: searchQuery ? [searchQuery] : undefined,
            industries: industry ? [industry] : undefined,
            jobTitles: jobTitle ? [jobTitle] : undefined,
            locations: location ? [location] : undefined,
            limit: 50,
          };

      const res = await fetch('/api/leads/scrape', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to scrape leads');
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      setScrapedLeads(data.leads || []);
      setSelectedLeads(new Set(data.leads?.map((l: ScrapedLead) => l.email) || []));
      toast.success('Leads Found!', {
        description: `Found ${data.count} leads matching your criteria.`,
      });
    },
    onError: (error: Error) => {
      toast.error('Scraping Failed', {
        description: error.message,
      });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (leads: ScrapedLead[]) => {
      const res = await fetch('/api/leads/scrape', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to import leads');
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      toast.success('Leads Imported!', {
        description: `Successfully imported ${data.imported} leads. ${data.duplicates > 0 ? `${data.duplicates} duplicates skipped.` : ''}`,
      });
      router.push('/leads');
    },
    onError: (error: Error) => {
      toast.error('Import Failed', {
        description: error.message,
      });
    },
  });

  const handleScrape = () => {
    scrapeMutation.mutate();
  };

  const handleImport = () => {
    const leadsToImport = scrapedLeads.filter(lead => selectedLeads.has(lead.email));
    if (leadsToImport.length === 0) {
      toast.error('No leads selected', {
        description: 'Please select at least one lead to import.',
      });
      return;
    }
    importMutation.mutate(leadsToImport);
  };

  const toggleSelectAll = () => {
    if (selectedLeads.size === scrapedLeads.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(scrapedLeads.map(l => l.email)));
    }
  };

  const toggleSelectLead = (email: string) => {
    const newSelected = new Set(selectedLeads);
    if (newSelected.has(email)) {
      newSelected.delete(email);
    } else {
      newSelected.add(email);
    }
    setSelectedLeads(newSelected);
  };

  return (
    <div className="space-y-6">
      <Link href="/leads" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Leads
      </Link>

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-purple-500" />
            Scrape Leads
          </h1>
          <p className="text-gray-600 mt-1">
            Find and import leads from Apollo.io based on your criteria
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Search Filters */}
        <Card className="md:col-span-1">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Search Criteria
            </CardTitle>
            <CardDescription>
              Define your ideal customer profile
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="useUrl"
                checked={useApolloUrl}
                onCheckedChange={(checked) => setUseApolloUrl(checked as boolean)}
              />
              <Label htmlFor="useUrl" className="text-sm">
                Use Apollo.io URL directly
              </Label>
            </div>

            {useApolloUrl ? (
              <div className="space-y-2">
                <Label htmlFor="apolloUrl">Apollo.io Search URL</Label>
                <Textarea
                  id="apolloUrl"
                  placeholder="https://app.apollo.io/#/people?..."
                  value={apolloUrl}
                  onChange={(e) => setApolloUrl(e.target.value)}
                  rows={3}
                />
                <p className="text-xs text-gray-500">
                  Paste your Apollo.io search URL for exact results
                </p>
              </div>
            ) : (
              <>
                <div className="space-y-2">
                  <Label htmlFor="keywords">Business Keywords</Label>
                  <Input
                    id="keywords"
                    placeholder="e.g., HVAC contractor, dental clinic"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="industry">Industry</Label>
                  <Select value={industry} onValueChange={setIndustry}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select industry" />
                    </SelectTrigger>
                    <SelectContent>
                      {INDUSTRIES.map((ind) => (
                        <SelectItem key={ind.value} value={ind.value}>
                          {ind.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="jobTitle">Job Title</Label>
                  <Select value={jobTitle} onValueChange={setJobTitle}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select job title" />
                    </SelectTrigger>
                    <SelectContent>
                      {JOB_TITLES.map((title) => (
                        <SelectItem key={title.value} value={title.value}>
                          {title.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    placeholder="e.g., Texas, Dallas, United States"
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                  />
                </div>
              </>
            )}

            <Button
              className="w-full"
              onClick={handleScrape}
              disabled={scrapeMutation.isPending}
            >
              {scrapeMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Searching...
                </>
              ) : (
                <>
                  <Search className="mr-2 h-4 w-4" />
                  Find Leads
                </>
              )}
            </Button>
          </CardContent>
        </Card>

        {/* Results */}
        <Card className="md:col-span-2">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Found Leads ({scrapedLeads.length})
                </CardTitle>
                <CardDescription>
                  {selectedLeads.size} selected for import
                </CardDescription>
              </div>
              {scrapedLeads.length > 0 && (
                <Button
                  onClick={handleImport}
                  disabled={importMutation.isPending || selectedLeads.size === 0}
                >
                  {importMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Importing...
                    </>
                  ) : (
                    <>
                      <Download className="mr-2 h-4 w-4" />
                      Import Selected ({selectedLeads.size})
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {scrapedLeads.length === 0 ? (
              <div className="text-center py-12">
                <Users className="mx-auto h-12 w-12 text-gray-300" />
                <h3 className="mt-4 text-lg font-medium text-gray-900">No leads yet</h3>
                <p className="mt-2 text-sm text-gray-500">
                  Configure your search criteria and click &quot;Find Leads&quot; to start
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-12">
                        <Checkbox
                          checked={selectedLeads.size === scrapedLeads.length}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead>Company</TableHead>
                      <TableHead>Email</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Title</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scrapedLeads.map((lead, index) => (
                      <TableRow key={lead.email || index}>
                        <TableCell>
                          <Checkbox
                            checked={selectedLeads.has(lead.email)}
                            onCheckedChange={() => toggleSelectLead(lead.email)}
                            disabled={!lead.email}
                          />
                        </TableCell>
                        <TableCell className="font-medium">
                          {lead.firstName} {lead.lastName}
                        </TableCell>
                        <TableCell>{lead.companyName || '-'}</TableCell>
                        <TableCell>
                          {lead.email ? (
                            <span className="text-sm">{lead.email}</span>
                          ) : (
                            <Badge variant="outline" className="text-gray-400">
                              No email
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>{lead.location || '-'}</TableCell>
                        <TableCell className="text-sm text-gray-600">
                          {lead.notes?.replace('Job Title: ', '') || '-'}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
