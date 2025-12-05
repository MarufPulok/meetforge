'use client';

import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Building2,
  Calendar,
  CheckCircle2,
  Info,
  Lightbulb,
  Mail,
  MessageSquare,
  Sparkles,
  Target,
  User,
  Users
} from 'lucide-react';
import { useEffect } from 'react';
import { useForm, useWatch } from 'react-hook-form';
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
    control,
    formState: { errors, isDirty },
  } = useForm<OfferConfigFormData>({
    resolver: zodResolver(offerConfigSchema),
  });

  // Watch form values for live preview
  const watchedValues = useWatch({ control });

  useEffect(() => {
    if (data?.config) {
      reset(data.config);
    }
  }, [data, reset]);

  const onSubmit = async (values: OfferConfigFormData) => {
    mutation.mutate(values);
  };

  // Calculate completion percentage
  const fields = ['nicheName', 'icpDescription', 'offerDescription', 'fromName', 'fromEmail', 'calendlyUrl'];
  const filledFields = fields.filter(field => {
    const value = watchedValues[field as keyof OfferConfigFormData];
    return value !== undefined && value.length > 0;
  });
  const completionPercent = Math.round((filledFields.length / fields.length) * 100);

  return (
    <div className="max-w-4xl space-y-6">
      {/* Header with Progress */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-8 w-8 text-purple-500" />
            Offer Settings
          </h1>
          <p className="text-gray-600 mt-1">
            Configure your MaaS offering • These settings power AI email generation
          </p>
        </div>
        <div className="text-right">
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <CheckCircle2 className={`h-4 w-4 ${completionPercent === 100 ? 'text-green-500' : 'text-gray-300'}`} />
            {completionPercent}% Complete
          </div>
          <div className="w-32 h-2 bg-gray-200 rounded-full mt-1 overflow-hidden">
            <div 
              className="h-full bg-gradient-to-r from-purple-500 to-pink-500 transition-all duration-300"
              style={{ width: `${completionPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Info Banner */}
      <div className="bg-gradient-to-r from-purple-50 to-pink-50 border border-purple-100 rounded-lg p-4 flex items-start gap-3">
        <Info className="h-5 w-5 text-purple-500 flex-shrink-0 mt-0.5" />
        <div className="text-sm text-purple-900">
          <p className="font-medium">How this works</p>
          <p className="text-purple-700 mt-1">
            The AI uses your niche, ICP, and offer description to write personalized cold emails. 
            Your sender details and Calendly link are automatically inserted into every outreach message.
          </p>
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        {/* Main Form */}
        <div className="md:col-span-2 space-y-6">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Section 1: Target Market */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Target className="h-5 w-5 text-orange-500" />
                  Target Market
                </CardTitle>
                <CardDescription>
                  Define WHO you're reaching out to
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="nicheName" className="flex items-center gap-2">
                    <Building2 className="h-4 w-4 text-gray-400" />
                    Niche Name
                    <Badge variant="outline" className="ml-auto text-xs">Required</Badge>
                  </Label>
                  <Input
                    id="nicheName"
                    placeholder="e.g., Qualified Meetings for HVAC Contractors in Texas"
                    className={errors.nicheName ? 'border-red-300' : ''}
                    {...register('nicheName')}
                  />
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" />
                    This becomes your service headline
                  </p>
                  {errors.nicheName && (
                    <p className="text-sm text-red-600">{errors.nicheName.message}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="icpDescription" className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-gray-400" />
                    Ideal Customer Profile (ICP)
                    <Badge variant="outline" className="ml-auto text-xs">Required</Badge>
                  </Label>
                  <Textarea
                    id="icpDescription"
                    placeholder="Owner-operators and small teams (3–20 techs) running residential HVAC businesses in Texas who want more booked estimate appointments..."
                    rows={3}
                    className={errors.icpDescription ? 'border-red-300' : ''}
                    {...register('icpDescription')}
                  />
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" />
                    Describe your ideal customer in detail — the AI uses this to personalize emails
                  </p>
                  {errors.icpDescription && (
                    <p className="text-sm text-red-600">{errors.icpDescription.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Section 2: Value Proposition */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MessageSquare className="h-5 w-5 text-blue-500" />
                  Value Proposition
                </CardTitle>
                <CardDescription>
                  Define WHAT you're offering
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="offerDescription" className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-gray-400" />
                    Your Offer
                    <Badge variant="outline" className="ml-auto text-xs">Required</Badge>
                  </Label>
                  <Textarea
                    id="offerDescription"
                    placeholder="We book qualified HVAC service and replacement appointments directly onto your calendar using done-for-you outbound email and SMS..."
                    rows={4}
                    className={errors.offerDescription ? 'border-red-300' : ''}
                    {...register('offerDescription')}
                  />
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" />
                    Explain the outcome you deliver and how it benefits the customer
                  </p>
                  {errors.offerDescription && (
                    <p className="text-sm text-red-600">{errors.offerDescription.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Section 3: Email Identity */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Mail className="h-5 w-5 text-green-500" />
                  Email Identity
                </CardTitle>
                <CardDescription>
                  How your emails appear to recipients
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="fromName" className="flex items-center gap-2">
                      <User className="h-4 w-4 text-gray-400" />
                      Sender Name
                    </Label>
                    <Input
                      id="fromName"
                      placeholder="e.g., Maruf from MeetForge"
                      className={errors.fromName ? 'border-red-300' : ''}
                      {...register('fromName')}
                    />
                    {errors.fromName && (
                      <p className="text-sm text-red-600">{errors.fromName.message}</p>
                    )}
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="fromEmail" className="flex items-center gap-2">
                      <Mail className="h-4 w-4 text-gray-400" />
                      Reply-To Email
                    </Label>
                    <Input
                      id="fromEmail"
                      type="email"
                      placeholder="e.g., hello@yourdomain.com"
                      className={errors.fromEmail ? 'border-red-300' : ''}
                      {...register('fromEmail')}
                    />
                    {errors.fromEmail && (
                      <p className="text-sm text-red-600">{errors.fromEmail.message}</p>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Section 4: Booking */}
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Calendar className="h-5 w-5 text-pink-500" />
                  Meeting Booking
                </CardTitle>
                <CardDescription>
                  Where leads book meetings with you
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor="calendlyUrl" className="flex items-center gap-2">
                    <Calendar className="h-4 w-4 text-gray-400" />
                    Calendly URL
                  </Label>
                  <Input
                    id="calendlyUrl"
                    type="url"
                    placeholder="https://calendly.com/your-username/meeting"
                    className={errors.calendlyUrl ? 'border-red-300' : ''}
                    {...register('calendlyUrl')}
                  />
                  <p className="text-xs text-gray-500 flex items-center gap-1">
                    <Lightbulb className="h-3 w-3" />
                    Used as <code className="bg-gray-100 px-1 rounded">{'{{calendlyUrl}}'}</code> in email templates
                  </p>
                  {errors.calendlyUrl && (
                    <p className="text-sm text-red-600">{errors.calendlyUrl.message}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex items-center justify-between">
              {isDirty && (
                <p className="text-sm text-amber-600 flex items-center gap-1">
                  <Info className="h-4 w-4" />
                  You have unsaved changes
                </p>
              )}
              <Button 
                type="submit" 
                disabled={isLoading || mutation.isPending}
                className="ml-auto bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600"
              >
                {mutation.isPending ? 'Saving...' : 'Save Settings'}
              </Button>
            </div>
          </form>
        </div>

        {/* Live Preview Sidebar */}
        <div className="space-y-6">
          <Card className="sticky top-6">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Mail className="h-5 w-5 text-purple-500" />
                Email Preview
              </CardTitle>
              <CardDescription>
                How your outreach will appear
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="bg-white border rounded-lg overflow-hidden shadow-sm">
                {/* Email Header */}
                <div className="bg-gray-50 border-b px-3 py-2 text-xs">
                  <div className="flex items-center gap-2">
                    <span className="text-gray-500">From:</span>
                    <span className="font-medium">
                      {watchedValues.fromName || 'Your Name'}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-gray-500">Reply:</span>
                    <span className="text-blue-600">
                      {watchedValues.fromEmail || 'email@example.com'}
                    </span>
                  </div>
                </div>
                {/* Email Body Preview */}
                <div className="p-3 text-sm space-y-2">
                  <p className="text-gray-600">
                    Hi <span className="bg-yellow-100 px-1 rounded">{'{{firstName}}'}</span>,
                  </p>
                  <p className="text-gray-500 italic text-xs">
                    [AI-generated personalized message based on your niche, ICP, and offer...]
                  </p>
                  <p className="text-gray-600 mt-2">
                    Book a quick call:
                  </p>
                  <p className="text-blue-600 text-xs truncate">
                    {watchedValues.calendlyUrl || 'https://calendly.com/...'}
                  </p>
                  <p className="text-gray-600 mt-2">
                    Best,<br />
                    <span className="font-medium">
                      {watchedValues.fromName?.split(' ')[0] || 'Your Name'}
                    </span>
                  </p>
                </div>
              </div>

              {/* Template Variables Reference */}
              <div className="mt-4 p-3 bg-gray-50 rounded-lg">
                <p className="text-xs font-medium text-gray-700 mb-2">Available Variables</p>
                <div className="flex flex-wrap gap-1">
                  {['{{firstName}}', '{{lastName}}', '{{companyName}}', '{{calendlyUrl}}'].map(v => (
                    <code key={v} className="text-xs bg-white border px-1.5 py-0.5 rounded">
                      {v}
                    </code>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
