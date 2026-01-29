'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { User } from 'lucide-react';
import { toast } from 'sonner';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

export default function ProfileSettingsPage() {
  const [birthYear, setBirthYear] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/user/profile');
      if (response.ok) {
        const data = await response.json();
        setBirthYear(data.birth_year);
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      toast.error('Failed to load profile settings');
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      setSaving(true);
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ birth_year: birthYear }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to save profile');
      }

      toast.success('Profile updated successfully');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast.error(error.message || 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const currentYear = new Date().getFullYear();
  const age = birthYear ? currentYear - birthYear : null;

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <User className="h-8 w-8 text-primary" />
          Profile Settings
        </h1>
        <p className="text-muted-foreground mt-1">
          Manage your personal profile information
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Personal Information</CardTitle>
          <CardDescription>
            This information is used for financial forecasting and planning
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="birth-year">Birth Year</Label>
            <Input
              id="birth-year"
              type="number"
              min="1900"
              max={currentYear}
              value={birthYear || ''}
              onChange={(e) => {
                const value = e.target.value;
                setBirthYear(value ? parseInt(value) : null);
              }}
              placeholder="e.g., 1990"
            />
            <p className="text-sm text-muted-foreground">
              {age !== null 
                ? `Your age: ${age} years old`
                : 'Enter your birth year to enable age-based forecasting'}
            </p>
            <p className="text-xs text-muted-foreground">
              This information is used to calculate forecasts and retirement planning. 
              It is stored securely and only accessible to you.
            </p>
          </div>

          <div className="flex justify-end">
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Changes'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
