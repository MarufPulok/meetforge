'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useMutation } from '@tanstack/react-query';
import { ArrowLeft, Download, ExternalLink, Loader2, Mail, MapPin, Phone, Plus, Search, Sparkles, Star, Users, X } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { toast } from 'sonner';

interface ScrapedLead {
  companyName: string;
  email: string;
  allEmails?: string[];
  phone: string;
  location: string;
  website?: string;
  businessCategory?: string[];
  rating?: number;
  ratingCount?: number;
  socialMedia?: {
    linkedIn?: string;
    facebook?: string;
    instagram?: string;
    twitter?: string;
  };
  notes?: string;
  placeId?: string;
}

interface ScrapeResponse {
  success: boolean;
  count: number;
  leadsWithEmails: number;
  leads: ScrapedLead[];
  source: string;
  strategy: string;
  cost: string;
  message: string;
}

// Default categories - user can add more
const DEFAULT_INDUSTRIES = [
  'HVAC & Heating',
  'Plumbing',
  'Dental & Healthcare',
  'Real Estate',
  'Fitness & Gyms',
  'Restaurants & Food',
  'Salons & Beauty',
  'Auto Services',
  'Legal Services',
  'Construction',
  'Software & VC',
  'Marketing Agency',
];

const DEFAULT_JOB_TITLES = [
  'Owner',
  'CEO',
  'Founder',
  'Manager',
  'Director',
  'President',
  'Partner',
  'Lead',
];

export default function ScrapeLeadsPage() {
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState('');
  const [location, setLocation] = useState('');
  const [limit, setLimit] = useState(50);
  const [strategy, setStrategy] = useState<'budget' | 'premium'>('budget');
  
  // Customizable categories
  const [industries, setIndustries] = useState<string[]>(DEFAULT_INDUSTRIES);
  const [jobTitles, setJobTitles] = useState<string[]>(DEFAULT_JOB_TITLES);
  const [selectedIndustry, setSelectedIndustry] = useState('');
  const [selectedJobTitle, setSelectedJobTitle] = useState('');
  const [newIndustry, setNewIndustry] = useState('');
  const [newJobTitle, setNewJobTitle] = useState('');
  
  // Results
  const [scrapedLeads, setScrapedLeads] = useState<ScrapedLead[]>([]);
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [scrapeInfo, setScrapeInfo] = useState<{ source: string; cost: string; message: string } | null>(null);

  const scrapeMutation = useMutation({
    mutationFn: async () => {
      const requestBody = {
        keywords: searchQuery ? [searchQuery] : undefined,
        industries: selectedIndustry ? [selectedIndustry] : undefined,
        jobTitles: selectedJobTitle ? [selectedJobTitle] : undefined,
        locations: location ? [location] : undefined,
        limit,
        strategy,
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
      
      return res.json() as Promise<ScrapeResponse>;
    },
    onSuccess: (data) => {
      setScrapedLeads(data.leads || []);
      // Use unique key (index) for selection instead of email
      const validEmails = data.leads?.filter((l: ScrapedLead) => l.email).map((l: ScrapedLead) => l.email) || [];
      setSelectedLeads(new Set(validEmails));
      setScrapeInfo({ source: data.source, cost: data.cost, message: data.message });
      toast.success(`Found ${data.count} leads!`, {
        description: data.message,
      });
    },
    onError: (error: Error) => {
      toast.error('Scraping Failed', { description: error.message });
    },
  });

  const importMutation = useMutation({
    mutationFn: async (leads: ScrapedLead[]) => {
      const res = await fetch('/api/leads/scrape', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ leads, source: scrapeInfo?.source }),
      });
      
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to import leads');
      }
      
      return res.json();
    },
    onSuccess: (data) => {
      toast.success('Leads Imported!', {
        description: `Imported ${data.imported} leads. ${data.duplicates > 0 ? `${data.duplicates} duplicates skipped.` : ''}`,
      });
      router.push('/leads');
    },
    onError: (error: Error) => {
      toast.error('Import Failed', { description: error.message });
    },
  });

  const handleScrape = () => scrapeMutation.mutate();

  const handleImport = () => {
    const leadsToImport = scrapedLeads.filter(lead => selectedLeads.has(lead.email));
    if (leadsToImport.length === 0) {
      toast.error('No leads selected', { description: 'Please select leads with emails to import.' });
      return;
    }
    importMutation.mutate(leadsToImport);
  };

  const toggleSelectAll = () => {
    const validEmails = scrapedLeads.filter(l => l.email).map(l => l.email);
    if (selectedLeads.size === validEmails.length) {
      setSelectedLeads(new Set());
    } else {
      setSelectedLeads(new Set(validEmails));
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

  const addIndustry = () => {
    if (newIndustry.trim() && !industries.includes(newIndustry.trim())) {
      setIndustries([...industries, newIndustry.trim()]);
      setSelectedIndustry(newIndustry.trim());
      setNewIndustry('');
    }
  };

  const addJobTitle = () => {
    if (newJobTitle.trim() && !jobTitles.includes(newJobTitle.trim())) {
      setJobTitles([...jobTitles, newJobTitle.trim()]);
      setSelectedJobTitle(newJobTitle.trim());
      setNewJobTitle('');
    }
  };

  const leadsWithEmails = scrapedLeads.filter(l => l.email);

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
            Find businesses from Google Maps with contact details
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
            {/* Keywords */}
            <div className="space-y-2">
              <Label htmlFor="keywords">Business Keywords</Label>
              <Input
                id="keywords"
                placeholder="e.g., dental clinic, HVAC contractor"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            {/* Industry - Customizable */}
            <div className="space-y-2">
              <Label>Industry</Label>
              <div className="flex gap-2">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedIndustry}
                  onChange={(e) => setSelectedIndustry(e.target.value)}
                >
                  <option value="">Select industry...</option>
                  {industries.map((ind) => (
                    <option key={ind} value={ind}>{ind}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom industry..."
                  value={newIndustry}
                  onChange={(e) => setNewIndustry(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addIndustry()}
                  className="text-sm"
                />
                <Button size="sm" variant="outline" onClick={addIndustry}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Job Title - Customizable */}
            <div className="space-y-2">
              <Label>Job Title (optional)</Label>
              <div className="flex gap-2">
                <select
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                  value={selectedJobTitle}
                  onChange={(e) => setSelectedJobTitle(e.target.value)}
                >
                  <option value="">Select job title...</option>
                  {jobTitles.map((title) => (
                    <option key={title} value={title}>{title}</option>
                  ))}
                </select>
              </div>
              <div className="flex gap-2">
                <Input
                  placeholder="Add custom title..."
                  value={newJobTitle}
                  onChange={(e) => setNewJobTitle(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addJobTitle()}
                  className="text-sm"
                />
                <Button size="sm" variant="outline" onClick={addJobTitle}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {/* Location */}
            <div className="space-y-2">
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                placeholder="e.g., Dallas TX, New York, USA"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
              />
            </div>

            {/* Limit */}
            <div className="space-y-2">
              <Label htmlFor="limit">Max Results</Label>
              <Input
                id="limit"
                type="number"
                min={10}
                max={100}
                value={limit}
                onChange={(e) => setLimit(Number(e.target.value))}
              />
            </div>

            {/* Strategy */}
            <div className="space-y-2">
              <Label>Scraping Strategy</Label>
              <div className="flex gap-2">
                <Button
                  variant={strategy === 'budget' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStrategy('budget')}
                  className="flex-1"
                >
                  💰 Budget
                </Button>
                <Button
                  variant={strategy === 'premium' ? 'default' : 'outline'}
                  size="sm"
                  onClick={() => setStrategy('premium')}
                  className="flex-1"
                >
                  💎 Premium
                </Button>
              </div>
              <p className="text-xs text-gray-500">
                Budget: ~$0.50/1K | Premium: ~$10/1K (more emails)
              </p>
            </div>

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
                <CardDescription className="flex items-center gap-4">
                  <span>{selectedLeads.size} selected</span>
                  <span className="text-green-600">{leadsWithEmails.length} with emails</span>
                  {scrapeInfo && (
                    <Badge variant="outline">{scrapeInfo.source} • {scrapeInfo.cost}</Badge>
                  )}
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
                      Import ({selectedLeads.size})
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
                      <TableHead className="w-10">
                        <Checkbox
                          checked={selectedLeads.size === leadsWithEmails.length && leadsWithEmails.length > 0}
                          onCheckedChange={toggleSelectAll}
                        />
                      </TableHead>
                      <TableHead>Business</TableHead>
                      <TableHead>Contact</TableHead>
                      <TableHead>Location</TableHead>
                      <TableHead>Rating</TableHead>
                      <TableHead>Links</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {scrapedLeads.map((lead, index) => (
                      // Use index + placeId for unique key to avoid duplicate email issue
                      <TableRow key={`${index}-${lead.placeId || lead.companyName}`}>
                        <TableCell>
                          <Checkbox
                            checked={selectedLeads.has(lead.email)}
                            onCheckedChange={() => toggleSelectLead(lead.email)}
                            disabled={!lead.email}
                          />
                        </TableCell>
                        {/* Business Column */}
                        <TableCell>
                          <div className="space-y-1">
                            <div className="font-medium">{lead.companyName || 'Unknown'}</div>
                            {lead.businessCategory && lead.businessCategory.length > 0 && (
                              <div className="flex flex-wrap gap-1">
                                {lead.businessCategory.slice(0, 2).map((cat, i) => (
                                  <Badge key={i} variant="secondary" className="text-xs">
                                    {cat}
                                  </Badge>
                                ))}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        {/* Contact Column */}
                        <TableCell>
                          <div className="space-y-1">
                            {lead.email ? (
                              <div className="flex items-center gap-1 text-sm">
                                <Mail className="h-3 w-3 text-green-500" />
                                <span className="truncate max-w-[180px]">{lead.email}</span>
                              </div>
                            ) : (
                              <Badge variant="outline" className="text-gray-400 text-xs">
                                <X className="h-3 w-3 mr-1" /> No email
                              </Badge>
                            )}
                            {lead.phone && (
                              <div className="flex items-center gap-1 text-sm text-gray-600">
                                <Phone className="h-3 w-3" />
                                {lead.phone}
                              </div>
                            )}
                          </div>
                        </TableCell>
                        {/* Location Column */}
                        <TableCell>
                          <div className="flex items-start gap-1 text-sm text-gray-600 max-w-[200px]">
                            <MapPin className="h-3 w-3 mt-0.5 flex-shrink-0" />
                            <span className="truncate">{lead.location || '-'}</span>
                          </div>
                        </TableCell>
                        {/* Rating Column */}
                        <TableCell>
                          {lead.rating ? (
                            <div className="flex items-center gap-1">
                              <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                              <span className="font-medium">{lead.rating.toFixed(1)}</span>
                              {lead.ratingCount && (
                                <span className="text-xs text-gray-500">({lead.ratingCount})</span>
                              )}
                            </div>
                          ) : (
                            <span className="text-gray-400">-</span>
                          )}
                        </TableCell>
                        {/* Links Column */}
                        <TableCell>
                          <div className="flex gap-2">
                            {lead.website && (
                              <a
                                href={lead.website}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-500 hover:text-blue-700"
                                title="Website"
                              >
                                <ExternalLink className="h-4 w-4" />
                              </a>
                            )}
                            {lead.socialMedia?.facebook && (
                              <a
                                href={lead.socialMedia.facebook}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:text-blue-800"
                                title="Facebook"
                              >
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z"/>
                                </svg>
                              </a>
                            )}
                            {lead.socialMedia?.instagram && (
                              <a
                                href={lead.socialMedia.instagram}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-pink-500 hover:text-pink-700"
                                title="Instagram"
                              >
                                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 24 24">
                                  <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                                </svg>
                              </a>
                            )}
                          </div>
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
