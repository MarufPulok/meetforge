'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { use } from 'react';
import { useForm } from 'react-hook-form';
import * as z from 'zod';

const leadSchema = z.object({
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  companyName: z.string().optional(),
  email: z.string().email(),
  phone: z.string().optional(),
  location: z.string().optional(),
  notes: z.string().optional(),
  status: z.enum(['NEW', 'CONTACTED', 'REPLIED', 'MEETING_BOOKED', 'LOST']),
});

type LeadFormData = z.infer<typeof leadSchema>;

export default function LeadDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const resolvedParams = use(params);
  const router = useRouter();
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['lead', resolvedParams.id],
    queryFn: async () => {
      const res = await fetch(`/api/leads/${resolvedParams.id}`);
      if (!res.ok) throw new Error('Failed to fetch lead');
      return res.json();
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (values: LeadFormData) => {
      const res = await fetch(`/api/leads/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) throw new Error('Failed to update lead');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', resolvedParams.id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/leads/${resolvedParams.id}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error('Failed to delete lead');
      return res.json();
    },
    onSuccess: () => {
      router.push('/leads');
    },
  });

  const updateStatusMutation = useMutation({
    mutationFn: async (status: string) => {
      const res = await fetch(`/api/leads/${resolvedParams.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update status');
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['lead', resolvedParams.id] });
      queryClient.invalidateQueries({ queryKey: ['leads'] });
    },
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<LeadFormData>({
    resolver: zodResolver(leadSchema),
    values: data?.lead,
  });

  const onSubmit = (values: LeadFormData) => {
    updateMutation.mutate(values);
  };

  if (isLoading) {
    return <div className="text-center py-8">Loading...</div>;
  }

  const lead = data?.lead;
  const messages = data?.messages || [];

  return (
    <div className="space-y-6">
      <Link href="/leads" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Leads
      </Link>

      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Lead Details</h1>
        <Button
          variant="destructive"
          onClick={() => {
            if (confirm('Are you sure you want to delete this lead?')) {
              deleteMutation.mutate();
            }
          }}
          disabled={deleteMutation.isPending}
        >
          {deleteMutation.isPending ? 'Deleting...' : 'Delete Lead'}
        </Button>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Lead Information</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input id="firstName" {...register('firstName')} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input id="lastName" {...register('lastName')} />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="companyName">Company Name</Label>
                <Input id="companyName" {...register('companyName')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email">Email *</Label>
                <Input id="email" type="email" {...register('email')} />
                {errors.email && (
                  <p className="text-sm text-red-600">{errors.email.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" {...register('phone')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="location">Location</Label>
                <Input id="location" {...register('location')} />
              </div>

              <div className="space-y-2">
                <Label htmlFor="status">Status</Label>
                <Select
                  value={watch('status')}
                  onValueChange={(value) => setValue('status', value as any)}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NEW">New</SelectItem>
                    <SelectItem value="CONTACTED">Contacted</SelectItem>
                    <SelectItem value="REPLIED">Replied</SelectItem>
                    <SelectItem value="MEETING_BOOKED">Meeting Booked</SelectItem>
                    <SelectItem value="LOST">Lost</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes">Notes</Label>
                <Textarea id="notes" rows={4} {...register('notes')} />
              </div>

              <Button type="submit" className="w-full" disabled={updateMutation.isPending}>
                {updateMutation.isPending ? 'Saving...' : 'Save Changes'}
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Outreach History ({messages.length})</CardTitle>
            </CardHeader>
            <CardContent>
              {messages.length === 0 ? (
                <p className="text-sm text-gray-500">No outreach messages sent yet</p>
              ) : (
                <div className="space-y-4">
                  {messages.map((message: any) => (
                    <div key={message._id} className="border-l-2 border-gray-300 pl-4">
                      <div className="flex items-center justify-between">
                        <p className="font-medium text-sm">{message.subject}</p>
                        <Badge
                          className={
                            message.status === 'SENT'
                              ? 'bg-green-100 text-green-700'
                              : 'bg-red-100 text-red-700'
                          }
                        >
                          {message.status}
                        </Badge>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(message.sentAt).toLocaleString()}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              <p className="text-sm text-gray-600 mb-3">
                Quickly update lead status
              </p>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  updateStatusMutation.mutate('REPLIED');
                }}
                disabled={updateStatusMutation.isPending || data?.lead?.status === 'REPLIED'}
              >
                ✉️ Mark as Replied
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  updateStatusMutation.mutate('MEETING_BOOKED');
                }}
                disabled={updateStatusMutation.isPending || data?.lead?.status === 'MEETING_BOOKED'}
              >
                📅 Mark as Meeting Booked
              </Button>
              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  updateStatusMutation.mutate('LOST');
                }}
                disabled={updateStatusMutation.isPending || data?.lead?.status === 'LOST'}
              >
                ❌ Mark as Lost
              </Button>
              <div className="pt-3 border-t mt-3">
                <p className="text-sm text-gray-600 mb-2">
                  Schedule a meeting
                </p>
                <Button
                  variant="default"
                  className="w-full"
                  onClick={() => {
                    window.open('https://calendly.com', '_blank');
                  }}
                >
                  🔗 Open Calendly Booking
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
