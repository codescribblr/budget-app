'use client';

import { useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { LoadingSpinner } from '@/components/ui/loading-spinner';
import GoalDialog from '@/components/goals/GoalDialog';
import GoalProgressCard from '@/components/goals/GoalProgressCard';
import type { GoalWithDetails } from '@/lib/types';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'sonner';
import { Plus, Target, Calendar, TrendingUp } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export default function GoalsPage() {
  const [goals, setGoals] = useState<GoalWithDetails[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingGoal, setEditingGoal] = useState<GoalWithDetails | null>(null);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [goalToDelete, setGoalToDelete] = useState<GoalWithDetails | null>(null);
  const [categoryDeleteDialogOpen, setCategoryDeleteDialogOpen] = useState(false);
  const [deleteCategory, setDeleteCategory] = useState(false);

  const fetchGoals = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/goals');
      if (!response.ok) throw new Error('Failed to fetch goals');
      const data = await response.json();
      setGoals(data);
    } catch (error) {
      console.error('Error fetching goals:', error);
      toast.error('Failed to load goals');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchGoals();
  }, []);

  const handleCreateGoal = () => {
    setEditingGoal(null);
    setIsDialogOpen(true);
  };

  const handleEditGoal = (goal: GoalWithDetails) => {
    setEditingGoal(goal);
    setIsDialogOpen(true);
  };

  const handleDeleteGoal = (goal: GoalWithDetails) => {
    setGoalToDelete(goal);
    setDeleteDialogOpen(true);
  };

  const confirmDeleteGoal = async () => {
    if (!goalToDelete) return;

    // If it's an envelope goal with a linked category, ask about category deletion
    if (goalToDelete.goal_type === 'envelope' && goalToDelete.linked_category_id) {
      setDeleteDialogOpen(false);
      setCategoryDeleteDialogOpen(true);
      return;
    }

    // For non-envelope goals or envelope goals without categories, proceed with deletion
    await performDeleteGoal(false);
  };

  const performDeleteGoal = async (shouldDeleteCategory: boolean) => {
    if (!goalToDelete) return;

    try {
      const response = await fetch(`/api/goals/${goalToDelete.id}?deleteCategory=${shouldDeleteCategory}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        
        // Handle partial success (goal deleted but category deletion failed)
        if (response.status === 207 && errorData.partialSuccess) {
          toast.success('Goal deleted successfully', {
            description: `However, the category "${errorData.categoryName}" could not be deleted. You may need to delete it manually from the categories page.`,
            duration: 8000,
          });
          setDeleteDialogOpen(false);
          setCategoryDeleteDialogOpen(false);
          setGoalToDelete(null);
          setDeleteCategory(false);
          fetchGoals();
          return;
        }
        
        throw new Error(errorData.error || 'Failed to delete goal');
      }
      
      toast.success('Goal deleted successfully');
      setDeleteDialogOpen(false);
      setCategoryDeleteDialogOpen(false);
      setGoalToDelete(null);
      setDeleteCategory(false);
      fetchGoals();
    } catch (error: any) {
      console.error('Error deleting goal:', error);
      toast.error(error.message || 'Failed to delete goal');
    }
  };

  const handleCategoryDeleteChoice = async () => {
    await performDeleteGoal(deleteCategory);
  };

  const handleStatusChange = async (goal: GoalWithDetails, newStatus: GoalWithDetails['status']) => {
    try {
      const response = await fetch(`/api/goals/${goal.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (!response.ok) throw new Error('Failed to update goal status');
      toast.success('Goal status updated');
      fetchGoals();
    } catch (error) {
      console.error('Error updating goal status:', error);
      toast.error('Failed to update goal status');
    }
  };

  const filteredGoals = statusFilter === 'all' 
    ? goals 
    : goals.filter(g => g.status === statusFilter);

  const activeGoals = goals.filter(g => g.status === 'active');
  const totalTargetAmount = activeGoals.reduce((sum, g) => sum + g.target_amount, 0);
  const totalCurrentBalance = activeGoals.reduce((sum, g) => sum + (g.current_balance || 0), 0);
  const totalProgress = totalTargetAmount > 0 
    ? (totalCurrentBalance / totalTargetAmount) * 100 
    : 0;

  if (loading) {
    return <LoadingSpinner />;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl md:text-3xl font-bold">Goals</h1>
        <p className="text-muted-foreground mt-1">Track your savings goals and stay on target</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Goals
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activeGoals.length}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Target
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalTargetAmount)}</div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overall Progress
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{formatCurrency(totalCurrentBalance)}</div>
            <Progress value={totalProgress} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">
              {totalProgress.toFixed(1)}% complete
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Actions Bar */}
      <div className="flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Goals</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="completed">Completed</SelectItem>
              <SelectItem value="overdue">Overdue</SelectItem>
              <SelectItem value="paused">Paused</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Button onClick={handleCreateGoal}>
          <Plus className="mr-2 h-4 w-4" />
          Add Goal
        </Button>
      </div>

      {/* Goals List */}
      {filteredGoals.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center">
            <Target className="mx-auto h-12 w-12 text-muted-foreground mb-4" />
            <h3 className="text-lg font-semibold mb-2">No goals yet</h3>
            <p className="text-muted-foreground mb-4">
              Create your first savings goal to start tracking your progress
            </p>
            <Button onClick={handleCreateGoal}>
              <Plus className="mr-2 h-4 w-4" />
              Add Goal
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredGoals.map((goal) => (
            <GoalProgressCard
              key={goal.id}
              goal={goal}
              onEdit={() => handleEditGoal(goal)}
              onDelete={() => handleDeleteGoal(goal)}
              onStatusChange={(newStatus) => handleStatusChange(goal, newStatus)}
            />
          ))}
        </div>
      )}

      {/* Goal Dialog */}
      <GoalDialog
        isOpen={isDialogOpen}
        onClose={() => {
          setIsDialogOpen(false);
          setEditingGoal(null);
        }}
        goal={editingGoal}
        onSuccess={fetchGoals}
      />

      {/* Delete Goal Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Goal?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                Are you sure you want to delete <strong>"{goalToDelete?.name}"</strong>?
                {goalToDelete?.goal_type === 'debt-paydown' && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    This will remove the goal but will not affect the linked credit card.
                  </div>
                )}
                {goalToDelete?.goal_type === 'account-linked' && (
                  <div className="mt-2 text-sm text-muted-foreground">
                    This will unlink the goal from the account. The account will be included in totals again.
                  </div>
                )}
                <div className="mt-2 text-destructive font-semibold">
                  This action cannot be undone.
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setDeleteDialogOpen(false);
              setGoalToDelete(null);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDeleteGoal}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Goal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Category Deletion Confirmation Dialog (for envelope goals) */}
      <AlertDialog open={categoryDeleteDialogOpen} onOpenChange={setCategoryDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Linked Category?</AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div>
                <div className="mb-4">
                  This goal is linked to a category. What would you like to do with the linked category?
                </div>
                <div className="space-y-2">
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="categoryAction"
                      checked={deleteCategory}
                      onChange={() => setDeleteCategory(true)}
                      className="h-4 w-4"
                    />
                    <span>
                      <strong>Delete the category</strong> - This will permanently delete the category and all its data.
                    </span>
                  </label>
                  <label className="flex items-center space-x-2 cursor-pointer">
                    <input
                      type="radio"
                      name="categoryAction"
                      checked={!deleteCategory}
                      onChange={() => setDeleteCategory(false)}
                      className="h-4 w-4"
                    />
                    <span>
                      <strong>Keep the category</strong> - Convert it to a regular category (recommended).
                    </span>
                  </label>
                </div>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setCategoryDeleteDialogOpen(false);
              setGoalToDelete(null);
              setDeleteCategory(false);
            }}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={handleCategoryDeleteChoice}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete Goal
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

