'use client';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

const offerConfigSchema = z.object({
  nicheName: z.string().min(1, 'Niche name is required'),
  icpDescription: z.string().min(1, 'ICP description is required'),
  offerDescription: z.string().min(1, 'Offer description is required'),
  fromName: z.string().min(1, 'From name is required'),
  fromEmail: z.string().email('Invalid email address'),
  calendlyUrl: z.string().url('Invalid URL'),
});

type OfferConfigFormData = z.infer<typeof offerConfigSchema>;

export default function OfferSettingsPage() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ['offerConfig'],
    queryFn: async () => {
      const res = await fetch('/api/offer-config');
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to fetch config');
      }
      return res.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async (values: OfferConfigFormData) => {
      const res = await fetch('/api/offer-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(values),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to save config');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['offerConfig'] });
      toast.success('Settings Saved', {
        description: 'Your offer configuration has been updated successfully.',
      });
    },
    onError: (error: Error) => {
      toast.error('Save Failed', {
        description: error.message || 'Failed to save settings. Please try again.',
      });
    },
  });

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<OfferConfigFormData>({
    resolver: zodResolver(offerConfigSchema),
  });

  useEffect(() => {
    if (data?.config) {
      reset(data.config);
    }
  }, [data, reset]);

  const onSubmit = async (values: OfferConfigFormData) => {
    mutation.mutate(values);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Offer Settings</h1>
        <p className="text-gray-600 mt-1">
          Configure your service offering and email settings
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Service Configuration</CardTitle>
          <CardDescription>
            Define your target niche, ICP, and value proposition
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="nicheName">Niche Name</Label>
              <Input
                id="nicheName"
                placeholder="e.g., HVAC contractors in Texas"
                {...register('nicheName')}
              />
              {errors.nicheName && (
                <p className="text-sm text-red-600">{errors.nicheName.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="icpDescription">ICP Description</Label>
              <Textarea
                id="icpDescription"
                placeholder="Describe your ideal customer profile..."
                rows={4}
                {...register('icpDescription')}
              />
              {errors.icpDescription && (
                <p className="text-sm text-red-600">{errors.icpDescription.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="offerDescription">Offer Description</Label>
              <Textarea
                id="offerDescription"
                placeholder="What are you offering..."
                rows={4}
                {...register('offerDescription')}
              />
              {errors.offerDescription && (
                <p className="text-sm text-red-600">{errors.offerDescription.message}</p>
              )}
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="fromName">From Name</Label>
                <Input
                  id="fromName"
                  placeholder="Your Name"
                  {...register('fromName')}
                />
                {errors.fromName && (
                  <p className="text-sm text-red-600">{errors.fromName.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="fromEmail">From Email</Label>
                <Input
                  id="fromEmail"
                  type="email"
                  placeholder="you@example.com"
                  {...register('fromEmail')}
                />
                {errors.fromEmail && (
                  <p className="text-sm text-red-600">{errors.fromEmail.message}</p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="calendlyUrl">Calendly Booking URL</Label>
              <Input
                id="calendlyUrl"
                type="url"
                placeholder="https://calendly.com/your-link"
                {...register('calendlyUrl')}
              />
              {errors.calendlyUrl && (
                <p className="text-sm text-red-600">{errors.calendlyUrl.message}</p>
              )}
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={isLoading || mutation.isPending}>
                {mutation.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
