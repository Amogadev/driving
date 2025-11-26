
'use client';

import { useRouter } from 'next/navigation';
import { useAuth, useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut, PlusCircle, Trash2, Eye, Notebook } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { CreateAccountForm } from '@/components/create-account-form';
import { collection, query, where, orderBy, doc, deleteDoc, Timestamp, writeBatch, getDocs, updateDoc } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Separator } from '@/components/ui/separator';


export const dynamic = 'force-dynamic';

function AdminAuthWrapper({ children }: { children: React.ReactNode }) {
  const { user, isUserLoading } = useUser();
  const router = useRouter();

  useEffect(() => {
    if (!isUserLoading) {
      if (!user) {
        router.push('/login');
      } else if (user.email !== 'admin@drivewise.com') {
        router.push('/dashboard');
      }
    }
  }, [user, isUserLoading, router]);

  if (isUserLoading || !user || user.email !== 'admin@drivewise.com') {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return <>{children}</>;
}

function NotepadDialog({ user, onSave }: { user: any, onSave: (notes: string) => void }) {
    const [notes, setNotes] = useState(user.notes || '');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();
    const firestore = useFirestore();

    const handleSave = () => {
        if (!firestore) return;
        setIsSaving(true);
        const userDocRef = doc(firestore, "users", user.id);
        updateDoc(userDocRef, { notes: notes })
            .then(() => {
                toast({
                    title: "Notes Saved",
                    description: `Notes for ${user.username} have been updated.`,
                });
                onSave(notes); // This will trigger refetch and close the dialog
            })
            .catch((e: any) => {
                const contextualError = new FirestorePermissionError({
                    operation: 'update',
                    path: userDocRef.path,
                    requestResourceData: { notes },
                });
                errorEmitter.emit('permission-error', contextualError);
            })
            .finally(() => {
                setIsSaving(false);
            });
    };

    return (
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Notes for {user.username}</DialogTitle>
                <DialogDescription>
                    Add or edit private notes for this user. Only admins can see this.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Label htmlFor="notes">User Notes</Label>
                <Textarea
                    id="notes"
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    placeholder="Enter any notes here..."
                    className="min-h-[150px] mt-2"
                />
            </div>
            <DialogFooter>
                <DialogClose asChild>
                    <Button variant="outline">Cancel</Button>
                </DialogClose>
                <Button onClick={handleSave} disabled={isSaving}>
                    {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Save Notes
                </Button>
            </DialogFooter>
        </DialogContent>
    );
}

function UserList() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [userForNotes, setUserForNotes] = useState<any | null>(null);

    const usersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
          collection(firestore, 'users'),
          where('username', '!=', 'admin'),
          orderBy('username', 'asc')
        );
    }, [firestore]);

    const { data: allUsers, isLoading, error, forceRefetch } = useCollection(usersQuery);

    const users = useMemo(() => {
        if (!allUsers) return [];
        return allUsers.filter(user => user.disabled !== true);
    }, [allUsers]);

    const handleDeleteUser = async (userId: string) => {
        if (!firestore) {
            toast({ variant: "destructive", title: "Error", description: "Firestore is not available." });
            return;
        }
        setIsDeleting(userId);
        
        try {
            const batch = writeBatch(firestore);
            const userDocRef = doc(firestore, "users", userId);

            const appsQuery = query(collection(firestore, 'llr_applications'), where('applicantId', '==', userId));
            const appsSnapshot = await getDocs(appsQuery);
            appsSnapshot.forEach((appDoc) => {
                batch.delete(appDoc.ref);
            });

            batch.update(userDocRef, { disabled: true });
            
            await batch.commit();

            toast({ title: "User Account Disabled", description: "The user account has been disabled and all their data has been removed." });
            forceRefetch();
        } catch (e: any) {
            const contextualError = new FirestorePermissionError({
                operation: 'delete',
                path: `user (${userId}) and their applications`, 
            });
            errorEmitter.emit('permission-error', contextualError);
        } finally {
            setIsDeleting(null);
        }
    };
    
    const handleNotesSaved = () => {
        setUserForNotes(null);
        forceRefetch();
    }


    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-20">
                <Loader2 className="h-10 w-10 animate-spin text-primary" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="text-center py-20 text-destructive">
                <p>Error loading users: {error.message}</p>
                <p className="text-sm text-muted-foreground">
                    Please check your internet connection or security rules.
                </p>
            </div>
        );
    }
    
    return (
        <Card>
            <CardHeader>
                <CardTitle>Created Accounts</CardTitle>
                <CardDescription>A list of all non-admin user accounts.</CardDescription>
            </CardHeader>
            <CardContent>
                <div className="border rounded-md">
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Username</TableHead>
                                <TableHead>Company Name</TableHead>
                                <TableHead>Last Login</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users && users.length > 0 ? (
                                users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.username}</TableCell>
                                        <TableCell>{user.companyName || 'N/A'}</TableCell>
                                        <TableCell>
                                            {user.lastLogin instanceof Timestamp
                                                ? format(user.lastLogin.toDate(), "PPpp")
                                                : "Never"}
                                        </TableCell>
                                        <TableCell className="text-right space-x-1">
                                             <Dialog open={userForNotes?.id === user.id} onOpenChange={(open) => !open && setUserForNotes(null)}>
                                                <DialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" onClick={() => setUserForNotes(user)}>
                                                        <Notebook className="h-4 w-4" />
                                                    </Button>
                                                </DialogTrigger>
                                                {userForNotes && userForNotes.id === user.id && <NotepadDialog user={userForNotes} onSave={handleNotesSaved} />}
                                            </Dialog>
                                            <AlertDialog>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" disabled={isDeleting === user.id}>
                                                        {isDeleting === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <Trash2 className="h-4 w-4 text-destructive/70" />}
                                                    </Button>
                                                </AlertDialogTrigger>
                                                <AlertDialogContent>
                                                    <AlertDialogHeader>
                                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                                    <AlertDialogDescription>
                                                        This action cannot be undone. This will permanently disable the user's account
                                                        and delete all their associated application data.
                                                    </AlertDialogDescription>
                                                    </AlertDialogHeader>
                                                    <AlertDialogFooter>
                                                    <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                    <AlertDialogAction onClick={() => handleDeleteUser(user.id)} className="bg-destructive hover:bg-destructive/90">
                                                        Disable Account
                                                    </AlertDialogAction>
                                                    </AlertDialogFooter>
                                                </AlertDialogContent>
                                            </AlertDialog>
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} className="h-24 text-center">
                                        No user accounts found.
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </div>
            </CardContent>
        </Card>
    );
}

export default function AdminPage() {
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
    <AdminAuthWrapper>
      <div className="min-h-screen bg-background">
        <header className="border-b">
          <div className="container mx-auto flex h-16 items-center justify-between px-4">
            <h1 className="text-xl font-bold text-primary">Admin Dashboard</h1>
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
          <div className="flex justify-between items-center mb-8">
            <h2 className="text-3xl font-bold">
              Manage Accounts
            </h2>
            <Dialog>
              <DialogTrigger asChild>
                <Button>
                  <PlusCircle className="mr-2 h-4 w-4" />
                  Add Account
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-md">
                <DialogHeader>
                  <DialogTitle>Create Company Account</DialogTitle>
                </DialogHeader>
                <CreateAccountForm />
              </DialogContent>
            </Dialog>
          </div>
          <UserList />
        </main>
      </div>
    </AdminAuthWrapper>
  );
}
