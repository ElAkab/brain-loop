'use client';

import React, { useState, useEffect } from 'react';
import { 
  Card, 
  CardContent, 
  CardHeader, 
  CardTitle, 
  CardDescription 
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
  Select, 
  SelectContent, 
  SelectItem, 
  SelectTrigger, 
  SelectValue 
} from '@/components/ui/select';
import { ThumbsUp, ThumbsDown, Minus, MessageSquare } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface FeedbackItem {
  id: number;
  rating: 'helpful' | 'neutral' | 'not_helpful';
  comment?: string;
  created_at: string;
}

export default function FeedbackPage() {
  const [feedback, setFeedback] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('all');

  useEffect(() => {
    fetchFeedback();
  }, [filter]);

  const fetchFeedback = async () => {
    setLoading(true);
    try {
      const url = filter && filter !== 'all' 
        ? `/api/feedback?rating=${filter}` 
        : '/api/feedback';
      
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setFeedback(data);
      }
    } catch (error) {
      console.error('Failed to fetch feedback', error);
    } finally {
      setLoading(false);
    }
  };

  const getIcon = (rating: string) => {
    switch (rating) {
      case 'helpful': return <ThumbsUp className="h-4 w-4 text-green-500" />;
      case 'neutral': return <Minus className="h-4 w-4 text-yellow-500" />;
      case 'not_helpful': return <ThumbsDown className="h-4 w-4 text-red-500" />;
      default: return null;
    }
  };

  const getLabel = (rating: string) => {
     switch (rating) {
      case 'helpful': return 'Helpful';
      case 'neutral': return 'Neutral';
      case 'not_helpful': return 'Not Helpful';
      default: return rating;
    }
  };

  return (
    <div className="container mx-auto py-8 max-w-5xl">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">User Feedback</h1>
          <p className="text-muted-foreground">
            Anonymous feedback from our community.
          </p>
        </div>
        
        <Select value={filter} onValueChange={setFilter}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Filter by rating" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Ratings</SelectItem>
            <SelectItem value="helpful">Helpful</SelectItem>
            <SelectItem value="neutral">Neutral</SelectItem>
            <SelectItem value="not_helpful">Not Helpful</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i} className="opacity-50 animate-pulse h-40">
              <CardHeader><div className="h-4 bg-muted rounded w-1/3"></div></CardHeader>
              <CardContent><div className="h-4 bg-muted rounded w-full"></div></CardContent>
            </Card>
          ))}
        </div>
      ) : feedback.length === 0 ? (
        <div className="text-center py-20 text-muted-foreground">
          No feedback found matching your criteria.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {feedback.map((item) => (
            <Card key={item.id} className="overflow-hidden hover:shadow-md transition-shadow">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="font-mono text-sm text-muted-foreground">
                  User #{item.id}
                </div>
                {getIcon(item.rating)}
              </CardHeader>
              <CardContent>
                <div className="mb-2 font-medium text-sm">
                  {getLabel(item.rating)}
                </div>
                {item.comment ? (
                  <p className="text-sm text-foreground bg-muted/50 p-3 rounded-md italic">
                    "{item.comment}"
                  </p>
                ) : (
                  <p className="text-sm text-muted-foreground italic">
                    No additional comment.
                  </p>
                )}
                <div className="mt-4 text-xs text-muted-foreground">
                  {formatDistanceToNow(new Date(item.created_at), { addSuffix: true })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
