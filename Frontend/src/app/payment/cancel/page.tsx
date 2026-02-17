'use client';

import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { XCircle } from 'lucide-react';

export default function PaymentCancelPage() {
  return (
    <div className="container mx-auto flex items-center justify-center min-h-[60vh] px-4">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="flex flex-col items-center gap-4 pb-2">
          <div className="rounded-full bg-red-100 p-3 dark:bg-red-900/30">
            <XCircle className="h-10 w-10 text-red-600 dark:text-red-400" />
          </div>
          <CardTitle className="text-2xl">Payment Cancelled</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground">
            You have not been charged. If you experienced any issues during checkout, please try again.
          </p>
        </CardContent>
        <CardFooter className="flex justify-center gap-4 pt-2">
          <Button variant="outline" asChild>
            <Link href="/payment">
              Try Again
            </Link>
          </Button>
          <Button asChild>
            <Link href="/dashboard">
              Return to Dashboard
            </Link>
          </Button>
        </CardFooter>
      </Card>
    </div>
  );
}
