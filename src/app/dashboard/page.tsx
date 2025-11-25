
'use client';

import { useRouter } from 'next/navigation';
import { useAuth, useUser } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut, Users } from 'lucide-react';
import { useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { FilePlus } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import { LLRForm } from '@/components/llr-form';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

function AuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

export default function DashboardPage() {
  const auth = useAuth();
  const { user } = useUser();
  const router = useRouter();

  const handleLogout = async () => {
    if (auth) {
      await auth.signOut();
    }
    router.push('/login');
  };

  return (
    <AuthWrapper>
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <h1 className="text-xl font-bold text-primary">Dashboard</h1>
            <div className="flex items-center gap-4">
              <span className="text-sm text-muted-foreground hidden sm:inline">
                {user?.email?.split('@')[0]}
              </span>
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Logout</span>
              </Button>
            </div>
          </div>
        </header>

        <main className="container mx-auto px-4 py-8">
          <h2 className="text-3xl font-bold mb-8">
            Welcome, {user?.displayName || user?.email?.split('@')[0]}!
          </h2>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 justify-center">
            <Dialog>
              <DialogTrigger asChild>
                <Card className="w-full cursor-pointer hover:shadow-lg transition-shadow hover:border-primary/50">
                  <CardHeader className="items-center text-center">
                    <div className="p-3 bg-primary/10 rounded-full">
                      <FilePlus className="h-8 w-8 text-primary" />
                    </div>
                  </CardHeader>
                  <CardContent className="text-center">
                    <CardTitle>New LLR Application</CardTitle>
                    <CardDescription className="mt-2">
                      Click here to start your application for a new
                      Learner&apos;s License.
                    </CardDescription>
                  </CardContent>
                </Card>
              </DialogTrigger>
              <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                <DialogHeader>
                  <DialogTitle>Learner's License Application</DialogTitle>
                </DialogHeader>
                <LLRForm />
              </DialogContent>
            </Dialog>
            
            <Link href="/dashboard/users" className="block w-full h-full">
              <Card className="w-full h-full cursor-pointer hover:shadow-lg transition-shadow hover:border-primary/50">
                  <CardHeader className="items-center text-center">
                      <div className="p-3 bg-primary/10 rounded-full">
                          <Users className="h-8 w-8 text-primary" />
                      </div>
                  </CardHeader>
                  <CardContent className="text-center">
                      <CardTitle>User List</CardTitle>
                      <CardDescription className="mt-2">
                          View and manage all registered users.
                      </CardDescription>
                  </CardContent>
              </Card>
            </Link>
          </div>
        </main>
      </div>
    </AuthWrapper>
  );
}
