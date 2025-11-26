
'use client';

import { useState, useMemo, useEffect } from 'react';
import { collection, query, where, getDocs, Timestamp, doc, deleteDoc, updateDoc, writeBatch, serverTimestamp, arrayUnion } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase, useUser, useDoc } from '@/firebase';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
    DialogFooter,
    DialogClose
  } from "@/components/ui/dialog"
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowLeft, Search, ArrowUpDown, Eye, Trash2, CreditCard } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';
import { errorEmitter } from '@/firebase/error-emitter';
import { FirestorePermissionError } from '@/firebase/errors';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { Label } from '@/components/ui/label';

export const dynamic = 'force-dynamic';

type SortConfig = {
  key: string;
  direction: 'ascending' | 'descending';
};

// =====================================================================
//   Admin-Specific View and Components
// =====================================================================

function AdminUserList() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'username', direction: 'ascending' });

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    return query(collection(firestore, 'users'));
  }, [firestore]);

  const { data: allUsers, isLoading, error } = useCollection(usersQuery);

  const filteredUsers = useMemo(() => {
    if (!allUsers) return [];
    if (!searchTerm) return allUsers;

    const searchTermLower = searchTerm.toLowerCase();
    return allUsers.filter((user) =>
      user.username?.toLowerCase().includes(searchTermLower) ||
      user.email?.toLowerCase().includes(searchTermLower)
    );
  }, [allUsers, searchTerm]);

  const sortedUsers = useMemo(() => {
    if (!filteredUsers) return [];
    if (!sortConfig) return filteredUsers;

    return [...filteredUsers].sort((a, b) => {
        const key = sortConfig.key as keyof typeof a;
        if (a[key] < b[key]) {
            return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (a[key] > b[key]) {
            return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
    });
  }, [filteredUsers, sortConfig]);
  
  const requestSort = (key: string) => {
    let direction: 'ascending' | 'descending' = 'ascending';
    if (sortConfig && sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key: string) => {
    if (!sortConfig || sortConfig.key !== key) {
      return <ArrowUpDown className="ml-2 h-4 w-4 opacity-30" />;
    }
    return sortConfig.direction === 'ascending' ? '▲' : '▼';
  };

  // --- Start of nested Admin-only components ---

  type PaymentDetails = {
    totalFee: number;
    paidAmount: number;
    pendingAmount: number;
    paymentDueDate: string | null;
  };
  
  function UserDetailsDialog({ userId }: { userId: string }) {
      const firestore = useFirestore();
      const [details, setDetails] = useState<PaymentDetails | null>(null);
      const [isLoading, setIsLoading] = useState(false);
      const [error, setError] = useState<string | null>(null);
  
      const fetchPaymentDetails = async () => {
          if (!firestore) return;
          setIsLoading(true);
          setError(null);
          
          const llrApplicationsRef = collection(firestore, 'llr_applications');
          const q = query(
              llrApplicationsRef, 
              where('applicantId', '==', userId)
          );
  
          try {
            const querySnapshot = await getDocs(q);
              if (!querySnapshot.empty) {
                  const applications = querySnapshot.docs.map(doc => doc.data());
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
              <DialogContent className="sm:max-w-[425px]">
                  <DialogHeader>
                      <DialogTitle>User Payment Details</DialogTitle>
                      <DialogDescription>
                          Showing payment details for the latest application.
                      </DialogDescription>
                  </DialogHeader>
                  <div className="py-4">
                      {isLoading && <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}
                      {error && <p className="text-sm text-destructive">{error}</p>}
                      {details && !isLoading && (
                          <div className="space-y-4">
                              <div className="flex justify-between items-center">
                                  <p className="text-sm text-muted-foreground">Total Fee (Rate)</p>
                                  <p className="text-lg font-medium">₹{details.totalFee.toFixed(2)}</p>
                              </div>
                               <div className="flex justify-between items-center">
                                  <p className="text-sm text-muted-foreground">Amount Paid</p>
                                  <p className="text-lg font-medium text-green-600">₹{details.paidAmount.toFixed(2)}</p>
                              </div>
                              <Separator />
                              <div className="flex justify-between items-center">
                                  <p className="text-sm font-medium">Pending Amount</p>
                                  <p className="text-xl font-bold">₹{details.pendingAmount.toFixed(2)}</p>
                              </div>
                              <Separator />
                              <div>
                                  <p className="text-sm font-medium text-muted-foreground">Payment Due Date</p>
                                  <p className="text-lg font-semibold">{details.paymentDueDate}</p>
                              </div>
                          </div>
                      )}
                  </div>
              </DialogContent>
          </Dialog>
      );
  }
  
  function UserApplicationId({ userId }: { userId: string }) {
      const firestore = useFirestore();
      const [applicationId, setApplicationId] = useState<string | null>(null);
      const [isLoading, setIsLoading] = useState(true);
  
      useEffect(() => {
          if (!firestore || !userId) return;
  
          const fetchAppId = async () => {
              setIsLoading(true);
              const llrApplicationsRef = collection(firestore, 'llr_applications');
              const q = query(
                  llrApplicationsRef,
                  where('applicantId', '==', userId)
              );
  
              try {
                  const querySnapshot = await getDocs(q);
                  if (!querySnapshot.empty) {
                      const applications = querySnapshot.docs.map(doc => {
                          const data = doc.data();
                          return {
                              ...data,
                              submittedAt: data.submittedAt instanceof Timestamp ? data.submittedAt.toDate() : new Date(0)
                          };
                      });
  
                      applications.sort((a, b) => b.submittedAt.getTime() - a.submittedAt.getTime());
                      
                      const latestApplication = applications[0];
                      setApplicationId(latestApplication.applicationId);
                  } else {
                      setApplicationId("N/A");
                  }
              } catch (e) {
                  const contextualError = new FirestorePermissionError({
                      operation: 'list',
                      path: `llr_applications`,
                  });
                  errorEmitter.emit('permission-error', contextualError);
                  setApplicationId(null);
              } finally {
                  setIsLoading(false);
              }
          };
  
          fetchAppId();
      }, [firestore, userId]);
  
      if (isLoading) {
          return <Loader2 className="h-4 w-4 animate-spin" />;
      }
  
      if (applicationId === null) {
          return <span className="text-destructive">Error</span>;
      }
  
      return <span>{applicationId}</span>;
  }
  
  function UserPendingAmount({ userId }: { userId: string }) {
      const firestore = useFirestore();
      const [pendingAmount, setPendingAmount] = useState<number | null>(null);
      const [isLoading, setIsLoading] = useState(true);
    
      useEffect(() => {
        if (!firestore || !userId) return;
    
        const fetchAmount = async () => {
          setIsLoading(true);
          const llrApplicationsRef = collection(firestore, 'llr_applications');
          const q = query(
            llrApplicationsRef,
            where('applicantId', '==', userId)
          );
    
          try {
            const querySnapshot = await getDocs(q);
            if (!querySnapshot.empty) {
              const applications = querySnapshot.docs.map(doc => doc.data());
              applications.sort((a, b) => {
                  const dateA = a.submittedAt?.toDate ? a.submittedAt.toDate().getTime() : 0;
                  const dateB = b.submittedAt?.toDate ? b.submittedAt.toDate().getTime() : 0;
                  return dateB - dateA;
              });
              const latestApplication = applications[0];
              const totalFee = latestApplication.totalFee || 0;
              const paidAmount = latestApplication.paidAmount || 0;
              setPendingAmount(totalFee - paidAmount);
            } else {
              setPendingAmount(0);
            }
          } catch (e) {
              const contextualError = new FirestorePermissionError({
                  operation: 'list',
                  path: `llr_applications`,
              });
              errorEmitter.emit('permission-error', contextualError);
              setPendingAmount(null);
          } finally {
            setIsLoading(false);
          }
        };
    
        fetchAmount();
      }, [firestore, userId]);
    
      if (isLoading) {
        return <Loader2 className="h-4 w-4 animate-spin" />;
      }
    
      if (pendingAmount === null) {
        return <span className="text-destructive">Error</span>;
      }
    
      return <span>₹{pendingAmount.toFixed(2)}</span>;
  }

  // --- End of nested Admin-only components ---

  return (
    <Card>
      <CardHeader>
        <CardTitle>User Records</CardTitle>
        <CardDescription>Browse and manage all registered users.</CardDescription>
        <div className="relative pt-4">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
          <Input
            placeholder="Search by username..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 max-w-sm"
          />
        </div>
      </CardHeader>
      <CardContent>
        {isLoading && (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        )}
        {error && (
          <div className="text-center py-20 text-destructive">
            <p>Error loading users: {error.message}</p>
            <p className="text-sm text-muted-foreground">Please check your internet connection or security rules.</p>
          </div>
        )}
        {!isLoading && !error && (
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>User ID</TableHead>
                  <TableHead className="cursor-pointer" onClick={() => requestSort('username')}>
                    <div className="flex items-center">Username {getSortIndicator('username')}</div>
                  </TableHead>
                  <TableHead>Application ID</TableHead>
                  <TableHead>Pending Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedUsers.length > 0 ? (
                  sortedUsers.map((user, index) => (
                    <TableRow key={user.id}>
                      <TableCell>{String(index + 1).padStart(3, '0')}</TableCell>
                      <TableCell className="font-medium">{user.username}</TableCell>
                      <TableCell>
                        <UserApplicationId userId={user.id} />
                      </TableCell>
                      <TableCell>
                        <UserPendingAmount userId={user.id} />
                      </TableCell>
                      <TableCell className="text-right">
                        <UserDetailsDialog userId={user.id} />
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      No users found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}


// =====================================================================
//   Regular User-Specific View
// =====================================================================

function ApplicationDetailsDialog({ application }: { application: any }) {
    const firestore = useFirestore();
    const [payments, setPayments] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);

    const fetchPayments = async () => {
        if (!firestore || !application.id) return;
        setIsLoading(true);
        const paymentsRef = collection(firestore, 'llr_applications', application.id, 'payments');
        const q = query(paymentsRef);

        try {
            const snapshot = await getDocs(q);
            const paymentsData = snapshot.docs.map(doc => ({
                ...doc.data(),
                id: doc.id
            }));
            setPayments(paymentsData);
        } catch (e: any) {
            console.error("Failed to fetch payment history:", e);
        } finally {
            setIsLoading(false);
        }
    };
    
    const details = {
      totalFee: application.totalFee || 0,
      paidAmount: application.paidAmount || 0,
      pendingAmount: (application.totalFee || 0) - (application.paidAmount || 0),
      paymentDueDate: application.paymentDueDate ? format(new Date(application.paymentDueDate), 'PPP') : "Not set",
    };
  
    return (
      <Dialog onOpenChange={(open) => open && fetchPayments()}>
          <DialogTrigger asChild>
              <Button variant="ghost" size="icon">
                  <Eye className="h-4 w-4" />
              </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-md">
              <DialogHeader>
                  <DialogTitle>Application Details</DialogTitle>
                  <DialogDescription>
                      Review your payment status and transaction history.
                  </DialogDescription>
              </DialogHeader>
              <div className="py-4 space-y-6">
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
                
                <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Application ID:</span>
                        <span className="font-medium">{application.applicationId}</span>
                    </div>
                    <div className="flex justify-between">
                        <span className="text-muted-foreground">Payment Due:</span>
                        <span className="font-medium">{details.paymentDueDate}</span>
                    </div>
                </div>

                  <Separator />

                  <div>
                    <h4 className="text-md font-semibold mb-2">Transaction History</h4>
                    {isLoading ? (
                         <div className="flex justify-center"><Loader2 className="h-5 w-5 animate-spin" /></div>
                    ) : payments.length > 0 ? (
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
          </DialogContent>
      </Dialog>
    );
  }


function PaymentDialog({ application, onPaymentSuccess }: { application: any, onPaymentSuccess: () => void }) {
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isProcessing, setIsProcessing] = useState(false);
  const pendingAmount = (application.totalFee || 0) - (application.paidAmount || 0);
  const [amountToPay, setAmountToPay] = useState(pendingAmount);

  const handlePayment = async () => {
    if (!firestore || !application.id) return;
    setIsProcessing(true);

    const appRef = doc(firestore, 'llr_applications', application.id);
    const paymentRef = doc(collection(firestore, 'llr_applications', application.id, 'payments'));
    
    const newPaidAmount = (application.paidAmount || 0) + amountToPay;
    const isFullyPaid = newPaidAmount >= (application.totalFee || 0);

    const batch = writeBatch(firestore);

    // 1. Update the main application document
    batch.update(appRef, {
      paidAmount: newPaidAmount,
      paymentStatus: isFullyPaid ? "Paid" : "Partially Paid",
    });

    // 2. Add a new document to the payments subcollection
    batch.set(paymentRef, {
        amount: amountToPay,
        paidAt: serverTimestamp(),
    });


    batch.commit()
      .then(() => {
        toast({
          title: "Payment Successful",
          description: `₹${amountToPay.toFixed(2)} has been paid for application ${application.applicationId}.`,
        });
        onPaymentSuccess();
      })
      .catch((e: any) => {
        const contextualError = new FirestorePermissionError({
          path: appRef.path, // or could be paymentRef.path
          operation: 'write',
          requestResourceData: { paidAmount: newPaidAmount },
        });
        errorEmitter.emit('permission-error', contextualError);
      })
      .finally(() => {
        setIsProcessing(false);
      });
  };

  return (
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Make a Payment</DialogTitle>
        <DialogDescription>
          You are paying for application ID: {application.applicationId}
        </DialogDescription>
      </DialogHeader>
      <div className="py-4 space-y-4">
        <div className="flex justify-between items-baseline">
          <Label>Total Fee:</Label>
          <span className="font-semibold">₹{(application.totalFee || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <Label>Already Paid:</Label>
          <span className="font-semibold text-green-600">₹{(application.paidAmount || 0).toFixed(2)}</span>
        </div>
        <div className="flex justify-between items-baseline">
          <Label className="font-bold">Pending Amount:</Label>
          <span className="font-bold text-lg">₹{pendingAmount.toFixed(2)}</span>
        </div>
        <Separator />
        <div className="space-y-2">
            <Label htmlFor="amount" className="font-semibold">Amount to Pay</Label>
            <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                <Input
                    id="amount"
                    type="number"
                    value={amountToPay}
                    onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setAmountToPay(val > pendingAmount ? pendingAmount : val);
                    }}
                    max={pendingAmount}
                    className="pl-8 font-bold text-lg"
                />
            </div>
        </div>
      </div>
      <DialogFooter>
        <DialogClose asChild>
            <Button variant="outline" disabled={isProcessing}>Cancel</Button>
        </DialogClose>
        <Button onClick={handlePayment} disabled={isProcessing || amountToPay <= 0}>
          {isProcessing ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <CreditCard className="mr-2 h-4 w-4" />}
          Pay ₹{amountToPay.toFixed(2)}
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}


function UserApplicationsList() {
  const { user, isUserLoading } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [isDeleting, setIsDeleting] = useState<string | null>(null);
  const [selectedApp, setSelectedApp] = useState<any | null>(null);
  const [isPaymentDialogOpen, setIsPaymentDialogOpen] = useState(false);


  const applicationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(collection(firestore, 'llr_applications'), where('applicantId', '==', user.uid));
  }, [firestore, user]);

  const { data: applications, isLoading, error, forceRefetch } = useCollection(applicationsQuery);
  
  const userDocRef = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return doc(firestore, 'users', user.uid);
  }, [firestore, user]);

  const { data: currentUser, isLoading: isUserDocLoading } = useDoc(userDocRef);
  
  const handleDeleteApplication = async (appId: string) => {
    if (!firestore) {
      toast({ variant: 'destructive', title: 'Error', description: 'Firestore is not available.' });
      return;
    }
    setIsDeleting(appId);
    try {
      const appRef = doc(firestore, 'llr_applications', appId);
      await deleteDoc(appRef);
      toast({ title: 'Application Deleted', description: 'The application has been successfully removed.' });
    } catch (e: any) {
      console.error('Error deleting application:', e);
      const contextualError = new FirestorePermissionError({
        operation: 'delete',
        path: `llr_applications/${appId}`,
      });
      errorEmitter.emit('permission-error', contextualError);
      toast({ variant: 'destructive', title: 'Deletion Failed', description: 'Could not delete application.' });
    } finally {
      setIsDeleting(null);
    }
  };
  
  const handleOpenPaymentDialog = (app: any) => {
    setSelectedApp(app);
    setIsPaymentDialogOpen(true);
  };


  return (
    <Card>
      <CardHeader>
        <CardTitle>My Application History</CardTitle>
        <CardDescription>Here are the details of all your submitted applications.</CardDescription>
      </CardHeader>
      <CardContent>
        {(isLoading || isUserLoading || isUserDocLoading) && (
          <div className="flex justify-center items-center py-20">
            <Loader2 className="h-10 w-10 animate-spin text-primary" />
          </div>
        )}
        {error && (
          <div className="text-center py-20 text-destructive">
            <p>Error loading applications: {error.message}</p>
            <p className="text-sm text-muted-foreground">Please check your connection or security rules.</p>
          </div>
        )}
        {!isLoading && !isUserLoading && !error && (
          <Dialog open={isPaymentDialogOpen} onOpenChange={setIsPaymentDialogOpen}>
          <div className="border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Applicant Name</TableHead>
                  <TableHead>Application ID</TableHead>
                  <TableHead>Submitted On</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Pending Amount</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {applications && applications.length > 0 ? (
                  applications.map((app) => {
                    const pendingAmount = (app.totalFee || 0) - (app.paidAmount || 0);
                    return (
                      <TableRow key={app.id}>
                         <TableCell>{app.fullName || 'N/A'}</TableCell>
                        <TableCell className="font-medium">{app.applicationId}</TableCell>
                        <TableCell>
                          {app.submittedAt instanceof Timestamp 
                            ? format(app.submittedAt.toDate(), "PP") 
                            : "N/A"}
                        </TableCell>
                        <TableCell>{app.paymentStatus}</TableCell>
                        <TableCell>₹{pendingAmount.toFixed(2)}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <ApplicationDetailsDialog application={app} />
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm" disabled={pendingAmount <= 0} onClick={() => handleOpenPaymentDialog(app)}>
                                <CreditCard className="mr-2 h-4 w-4"/>
                                Pay Now
                            </Button>
                          </DialogTrigger>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" disabled={isDeleting === app.id}>
                                {isDeleting === app.id ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  <Trash2 className="h-4 w-4 text-destructive/70" />
                                )}
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  This action cannot be undone. This will permanently delete this application.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction
                                  onClick={() => handleDeleteApplication(app.id)}
                                  className="bg-destructive hover:bg-destructive/90"
                                >
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </TableCell>
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-24 text-center">
                      You have not submitted any applications yet.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
           {selectedApp && (
              <PaymentDialog 
                application={selectedApp} 
                onPaymentSuccess={() => {
                  setIsPaymentDialogOpen(false);
                  setSelectedApp(null);
                  forceRefetch(); // Force a refetch of the applications list
                }} 
              />
            )}
          </Dialog>
        )}
      </CardContent>
    </Card>
  );
}


// =====================================================================
//   Main Page Component - Renders Admin or User View
// =====================================================================

export default function UsersListPage() {
  const { user: currentUser, isUserLoading } = useUser();
  const isAdmin = currentUser?.email === 'admin@drivewise.com';
  
  if (isUserLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/dashboard" passHref>
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">{isAdmin ? 'Users' : 'My Applications'}</h1>
        </div>

        {isAdmin ? <AdminUserList /> : <UserApplicationsList />}
        
      </div>
    </div>
  );
}
