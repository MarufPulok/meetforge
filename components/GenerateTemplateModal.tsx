'use client';

import { Button } from '@/components/ui/button';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
} from '@/components/ui/dialog';
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
import { Loader2, Sparkles } from 'lucide-react';
import { useState } from 'react';
import { toast } from 'sonner';

interface GenerateTemplateModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onTemplateGenerated: (subject: string, body: string) => void;
}

export function GenerateTemplateModal({
  open,
  onOpenChange,
  onTemplateGenerated,
}: GenerateTemplateModalProps) {
  const [goal, setGoal] = useState('');
  const [tone, setTone] = useState<'Professional' | 'Friendly' | 'Casual'>('Professional');
  const [keyPoints, setKeyPoints] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedSubject, setGeneratedSubject] = useState('');
  const [generatedBody, setGeneratedBody] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  const handleGenerate = async () => {
    if (!goal.trim()) {
      toast.error('Goal Required', {
        description: 'Please enter a goal for your email template.',
      });
      return;
    }

    setIsGenerating(true);
    setShowPreview(false);

    try {
      const response = await fetch('/api/templates/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          goal: goal.trim(),
          tone,
          keyPoints: keyPoints.trim() || undefined,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to generate template');
      }

      setGeneratedSubject(data.subject);
      setGeneratedBody(data.body);
      setShowPreview(true);

      toast.success('Template Generated', {
        description: 'Your AI-powered email template is ready!',
      });
    } catch (error: any) {
      console.error('Generation error:', error);
      toast.error('Generation Failed', {
        description: error.message || 'Failed to generate template. Please try again.',
      });
    } finally {
      setIsGenerating(false);
    }
  };

  const handleRegenerate = () => {
    handleGenerate();
  };

  const handleUseTemplate = () => {
    onTemplateGenerated(generatedSubject, generatedBody);
    handleClose();
  };

  const handleClose = () => {
    // Reset form when closing
    setGoal('');
    setTone('Professional');
    setKeyPoints('');
    setGeneratedSubject('');
    setGeneratedBody('');
    setShowPreview(false);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5 text-purple-600" />
            Generate Template with AI
          </DialogTitle>
          <DialogDescription>
            Describe your email goal and let AI create a professional template for you
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {!showPreview ? (
            <>
              <div className="space-y-2">
                <Label htmlFor="goal">
                  Email Goal <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="goal"
                  placeholder="e.g., Schedule a discovery call with HVAC contractors"
                  value={goal}
                  onChange={(e) => setGoal(e.target.value)}
                  disabled={isGenerating}
                />
                <p className="text-xs text-gray-500">
                  What do you want to achieve with this email?
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="tone">Tone</Label>
                <Select
                  value={tone}
                  onValueChange={(value: 'Professional' | 'Friendly' | 'Casual') =>
                    setTone(value)
                  }
                  disabled={isGenerating}
                >
                  <SelectTrigger id="tone">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Professional">Professional</SelectItem>
                    <SelectItem value="Friendly">Friendly</SelectItem>
                    <SelectItem value="Casual">Casual</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="keyPoints">Key Points (Optional)</Label>
                <Textarea
                  id="keyPoints"
                  placeholder="e.g., We help increase bookings by 30%, Free consultation available"
                  rows={4}
                  value={keyPoints}
                  onChange={(e) => setKeyPoints(e.target.value)}
                  disabled={isGenerating}
                />
                <p className="text-xs text-gray-500">
                  Specific points or benefits you want to highlight in the email
                </p>
              </div>

              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleClose}
                  disabled={isGenerating}
                >
                  Cancel
                </Button>
                <Button onClick={handleGenerate} disabled={isGenerating}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="mr-2 h-4 w-4" />
                      Generate
                    </>
                  )}
                </Button>
              </div>
            </>
          ) : (
            <>
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-md p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="h-4 w-4 text-green-600" />
                    <h4 className="font-medium text-sm text-green-900">
                      Generated Template Preview
                    </h4>
                  </div>
                  <p className="text-xs text-green-700">
                    Review your AI-generated template below. You can use it as-is or regenerate
                    for a different variation.
                  </p>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700">Subject Line</Label>
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3">
                    <p className="text-sm font-medium">{generatedSubject}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label className="text-gray-700">Email Body</Label>
                  <div className="bg-gray-50 border border-gray-200 rounded-md p-3 max-h-[300px] overflow-y-auto">
                    <pre className="text-sm whitespace-pre-wrap font-sans">
                      {generatedBody}
                    </pre>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                  <p className="text-xs text-blue-800">
                    <strong>Tip:</strong> Template variables like{' '}
                    <code className="bg-blue-100 px-1 rounded">{'{{firstName}}'}</code> will be
                    automatically replaced with actual lead data when you send emails.
                  </p>
                </div>
              </div>

              <div className="flex justify-between gap-3">
                <Button type="button" variant="outline" onClick={handleRegenerate}>
                  <Sparkles className="mr-2 h-4 w-4" />
                  Regenerate
                </Button>
                <div className="flex gap-3">
                  <Button type="button" variant="outline" onClick={handleClose}>
                    Cancel
                  </Button>
                  <Button onClick={handleUseTemplate}>Use Template</Button>
                </div>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
