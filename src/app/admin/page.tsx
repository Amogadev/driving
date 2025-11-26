
'use client';

import { useRouter } from 'next/navigation';
import { useAuth, useUser, useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { Button } from '@/components/ui/button';
import { Loader2, LogOut, PlusCircle, Trash2, Eye, KeyRound } from 'lucide-react';
import { useEffect, useState, useMemo } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
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
import { collection, query, where, orderBy, doc, deleteDoc, Timestamp, writeBatch, getDocs } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Separator } from '@/components/ui/separator';
import { resetPassword } from '@/ai/flows/reset-password-flow';


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

type PaymentDetails = {
    totalFee: number;
    paidAmount: number;
    pendingAmount: number;
    paymentDueDate: string | null;
  };
  
function TransactionHistoryDialog({ userId }: { userId: string }) {
    const firestore = useFirestore();
    const [details, setDetails] = useState<PaymentDetails | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [payments, setPayments] = useState<any[]>([]);

    const fetchPaymentDetails = async () => {
        if (!firestore) return;
        setIsLoading(true);
        setError(null);
        setPayments([]);
        
        const llrApplicationsRef = collection(firestore, 'llr_applications');
        const q = query(
            llrApplicationsRef, 
            where('applicantId', '==', userId)
        );

        try {
          const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
                const applications = querySnapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
                applications.sort((a, b) => {
                    const dateA = a.submittedAt?.toDate ? a.submittedAt.toDate().getTime() : 0;
                    const dateB = b.submittedAt?.toDate ? b.submittedAt.toDate().getTime() : 0;
                    return dateB - dateA;
                });

                const latestApplication = applications[0];
                const totalFee = latestApplication.totalFee || 0;
                const paidAmount = latestApplication.paidAmount || 0;
                const pendingAmount = totalFee - paidAmount;
                const paymentDueDate = latestApplication.paymentDueDate 
                    ? format(new Date(latestApplication.paymentDueDate), 'PPP') 
                    : "Not set";
                
                setDetails({ totalFee, paidAmount, pendingAmount, paymentDueDate });

                 // Fetch payment history subcollection
                const paymentsRef = collection(firestore, 'llr_applications', latestApplication.id, 'payments');
                const paymentsSnapshot = await getDocs(paymentsRef);
                const paymentsData = paymentsSnapshot.docs.map(doc => ({
                    ...doc.data(),
                    id: doc.id
                }));
                setPayments(paymentsData);

            } else {
                setDetails({ totalFee: 0, paidAmount: 0, pendingAmount: 0, paymentDueDate: "No application found" });
            }
        } catch (e: any) {
            const contextualError = new FirestorePermissionError({
                operation: 'list',
                path: `llr_applications`,
            });
            errorEmitter.emit('permission-error', contextualError);
            setError("Failed to fetch payment details.");
        } finally {
          setIsLoading(false);
        }
    };

    return (
        <Dialog onOpenChange={(open) => open && fetchPaymentDetails()}>
            <DialogTrigger asChild>
                <Button variant="ghost" size="icon">
                    <Eye className="h-4 w-4" />
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle>Transaction History</DialogTitle>
                    <DialogDescription>
                        Showing payment details for the user's latest application.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {isLoading && <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    {details && !isLoading && (
                        <div className="space-y-6">
                           <Card className="bg-muted/50">
                                <CardContent className="p-4 grid grid-cols-3 gap-4 text-center">
                                    <div>
                                        <p className="text-xs text-muted-foreground">Total Fee</p>
                                        <p className="text-lg font-semibold">₹{details.totalFee.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Paid</p>
                                        <p className="text-lg font-semibold text-green-600">₹{details.paidAmount.toFixed(2)}</p>
                                    </div>
                                    <div>
                                        <p className="text-xs text-muted-foreground">Pending</p>
                                        <p className="text-lg font-semibold text-destructive">₹{details.pendingAmount.toFixed(2)}</p>
                                    </div>
                                </CardContent>
                            </Card>
                            <div className="text-sm">
                                <p className="text-muted-foreground">Payment Due: <span className="font-medium text-foreground">{details.paymentDueDate}</span></p>
                            </div>
                            <Separator />
                             <div>
                                <h4 className="text-md font-semibold mb-2">Payment History</h4>
                                {payments.length > 0 ? (
                                     <div className="border rounded-md">
                                        <Table>
                                            <TableHeader>
                                                <TableRow>
                                                    <TableHead>Date</TableHead>
                                                    <TableHead className="text-right">Amount</TableHead>
                                                </TableRow>
                                            </TableHeader>
                                            <TableBody>
                                                {payments.map(payment => (
                                                    <TableRow key={payment.id}>
                                                        <TableCell>
                                                            {payment.paidAt instanceof Timestamp 
                                                                ? format(payment.paidAt.toDate(), "PP")
                                                                : "N/A"}
                                                        </TableCell>
                                                        <TableCell className="text-right font-medium">₹{payment.amount.toFixed(2)}</TableCell>
                                                    </TableRow>
                                                ))}
                                            </TableBody>
                                        </Table>
                                    </div>
                                ) : (
                                    <p className="text-sm text-center py-4 text-muted-foreground">No payment history found.</p>
                                )}
                             </div>
                        </div>
                    )}
                </div>
            </DialogContent>
        </Dialog>
    );
}

function ResetPasswordDialog({ user, onReset }: { user: any, onReset: (email: string) => void }) {
    const [email, setEmail] = useState(user.email || '');

    return (
        <AlertDialogContent>
            <AlertDialogHeader>
                <AlertDialogTitle>Reset Password for {user.username}?</AlertDialogTitle>
                <AlertDialogDescription>
                    Enter the email address to send the password reset link to. It has been pre-filled with the user's registered email.
                </AlertDialogDescription>
            </AlertDialogHeader>
            <div className="py-4">
                <Label htmlFor="email-reset">Email Address</Label>
                <Input
                    id="email-reset"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="Enter email address"
                />
            </div>
            <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction onClick={() => onReset(email)}>
                    Send Reset Email
                </AlertDialogAction>
            </AlertDialogFooter>
        </AlertDialogContent>
    );
}


function UserList() {
    const firestore = useFirestore();
    const { toast } = useToast();
    const [isDeleting, setIsDeleting] = useState<string | null>(null);
    const [isResetting, setIsResetting] = useState<string | null>(null);
    const [userToReset, setUserToReset] = useState<any | null>(null);

    const usersQuery = useMemoFirebase(() => {
        if (!firestore) return null;
        return query(
          collection(firestore, 'users'),
          where('username', '!=', 'admin'),
          orderBy('username', 'asc')
        );
    }, [firestore]);

    const { data: allUsers, isLoading, error } = useCollection(usersQuery);

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

    const handleResetPassword = async (email: string) => {
        if (!email) {
            toast({
                variant: "destructive",
                title: "Missing Email",
                description: "Please enter an email address to send the reset link to.",
            });
            return;
        }
        if (!userToReset) return;

        setIsResetting(userToReset.id);
        try {
            const result = await resetPassword(email);
            if (result.success) {
                toast({
                    title: "Password Reset Email Sent",
                    description: `An email has been sent to ${email} with instructions.`,
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Password Reset Failed",
                    description: result.message,
                });
            }
        } catch (error) {
            console.error("Failed to trigger password reset flow:", error);
            toast({
                variant: "destructive",
                title: "Error",
                description: "An unexpected error occurred while trying to reset the password.",
            });
        } finally {
            setIsResetting(null);
            setUserToReset(null);
        }
    };


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
                                <TableHead>Last Login</TableHead>
                                <TableHead className="text-right">Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {users && users.length > 0 ? (
                                users.map((user) => (
                                    <TableRow key={user.id}>
                                        <TableCell className="font-medium">{user.username}</TableCell>
                                        <TableCell>
                                            {user.lastLogin instanceof Timestamp
                                                ? format(user.lastLogin.toDate(), "PPpp")
                                                : "Never"}
                                        </TableCell>
                                        <TableCell className="text-right space-x-1">
                                            <TransactionHistoryDialog userId={user.id} />
                                             <AlertDialog onOpenChange={(open) => !open && setUserToReset(null)}>
                                                <AlertDialogTrigger asChild>
                                                    <Button variant="ghost" size="icon" disabled={isResetting === user.id} onClick={() => setUserToReset(user)}>
                                                        {isResetting === user.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}
                                                    </Button>
                                                </AlertDialogTrigger>
                                                {userToReset && userToReset.id === user.id && <ResetPasswordDialog user={userToReset} onReset={handleResetPassword} />}
                                            </AlertDialog>
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
                                    <TableCell colSpan={3} className="h-24 text-center">
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

    

    