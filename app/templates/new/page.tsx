'use client';

import { GenerateTemplateModal } from '@/components/GenerateTemplateModal';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { zodResolver } from '@hookform/resolvers/zod';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { toast } from 'sonner';
import * as z from 'zod';

const templateSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  subject: z.string().min(1, 'Subject is required'),
  body: z.string().min(1, 'Body is required'),
});

type TemplateFormData = z.infer<typeof templateSchema>;

export default function NewTemplatePage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const createMutation = useMutation({
    mutationFn: async (data: TemplateFormData) => {
      const res = await fetch('/api/templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to create template');
      }
      return res.json();
    },
    onSuccess: () => {
      toast.success('Template Created', {
        description: 'Your email template has been created successfully.',
      });
      queryClient.invalidateQueries({ queryKey: ['templates'] });
      router.push('/templates');
    },
    onError: (error: Error) => {
      toast.error('Creation Failed', {
        description: error.message || 'Failed to create template. Please try again.',
      });
    },
  });

  const {
    register,
    handleSubmit,
    setValue,
    formState: { errors },
  } = useForm<TemplateFormData>({
    resolver: zodResolver(templateSchema),
  });

  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleTemplateGenerated = (subject: string, body: string) => {
    setValue('subject', subject);
    setValue('body', body);
  };

  const onSubmit = (data: TemplateFormData) => {
    createMutation.mutate(data);
  };

  return (
    <div className="max-w-3xl space-y-6">
      <Link href="/templates" className="inline-flex items-center text-sm text-gray-600 hover:text-gray-900">
        <ArrowLeft className="mr-2 h-4 w-4" />
        Back to Templates
      </Link>

      <div>
        <h1 className="text-3xl font-bold">Create New Template</h1>
        <p className="text-gray-600 mt-1">
          Design a new email template for your outreach campaigns
        </p>
      </div>

      <div className="flex justify-end">
        <Button
          type="button"
          variant="outline"
          onClick={() => setIsModalOpen(true)}
          className="gap-2"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="16"
            height="16"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M12 3v6l4-4-4-4" />
            <path d="M12 3v6l-4-4 4-4" />
            <path d="M12 21v-6l4 4-4 4" />
            <path d="M12 21v-6l-4 4 4 4" />
            <circle cx="12" cy="12" r="1" />
          </svg>
          Generate with AI
        </Button>
      </div>

      <GenerateTemplateModal
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
        onTemplateGenerated={handleTemplateGenerated}
      />

      <Card>
        <CardHeader>
          <CardTitle>Template Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
              <h4 className="font-medium text-sm text-gray-900 mb-2">Available Variables:</h4>
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <strong className="text-gray-700">Lead Info:</strong>
                  <ul className="ml-4 mt-1 space-y-0.5 text-gray-600">
                    <li>• {'{firstName}'} - Lead's first name</li>
                    <li>• {'{lastName}'} - Lead's last name</li>
                    <li>• {'{companyName}'} - Company name</li>
                    <li>• {'{location}'} - Location</li>
                  </ul>
                </div>
                <div>
                  <strong className="text-gray-700">Your Offer:</strong>
                  <ul className="ml-4 mt-1 space-y-0.5 text-gray-600">
                    <li>• {'{calendlyUrl}'} - Your booking link</li>
                    <li>• {'{fromName}'} - Your name</li>
                    <li>• {'{nicheName}'} - Target niche</li>
                    <li>• {'{offerDescription}'} - Your offer</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="name">Template Name</Label>
              <Input
                id="name"
                placeholder="e.g., HVAC cold email v1"
                {...register('name')}
              />
              {errors.name && (
                <p className="text-sm text-red-600">{errors.name.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Email Subject</Label>
              <Input
                id="subject"
                placeholder="Quick question about {{companyName}}"
                {...register('subject')}
              />
              {errors.subject && (
                <p className="text-sm text-red-600">{errors.subject.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="body">Email Body</Label>
              <Textarea
                id="body"
                rows={12}
                placeholder="Use {{firstName}}, {{lastName}}, {{companyName}}, {{location}}"
                {...register('body')}
              />
              {errors.body && (
                <p className="text-sm text-red-600">{errors.body.message}</p>
              )}
              <p className="text-xs text-gray-500">
                Available variables: {'{firstName}'}, {'{lastName}'}, {'{companyName}'}, {'{location}'}
              </p>
            </div>

            <div className="flex justify-end gap-3">
              <Link href="/templates">
                <Button type="button" variant="outline">
                  Cancel
                </Button>
              </Link>
              <Button type="submit" disabled={createMutation.isPending}>
                {createMutation.isPending ? 'Creating...' : 'Create Template'}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
