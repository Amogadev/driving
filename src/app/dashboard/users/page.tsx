
'use client';

import { useState, useMemo, useEffect } from 'react';
import { collection, query, where, orderBy, limit, getDocs } from 'firebase/firestore';
import { useFirestore, useCollection, useMemoFirebase } from '@/firebase';
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
  } from "@/components/ui/dialog"
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Loader2, ArrowLeft, Search, ArrowUpDown, Eye } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

type SortConfig = {
  key: string;
  direction: 'ascending' | 'descending';
};

type PaymentDetails = {
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
        try {
            const llrApplicationsRef = collection(firestore, 'llr_applications');
            const q = query(
                llrApplicationsRef, 
                where('applicantId', '==', userId),
                orderBy('submittedAt', 'desc'),
                limit(1)
            );
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                const latestApplication = querySnapshot.docs[0].data();
                const totalFee = latestApplication.totalFee || 0;
                const paidAmount = latestApplication.paidAmount || 0;
                const pendingAmount = totalFee - paidAmount;
                const paymentDueDate = latestApplication.paymentDueDate 
                    ? format(new Date(latestApplication.paymentDueDate), 'PPP') 
                    : "Not set";
                
                setDetails({ pendingAmount, paymentDueDate });
            } else {
                setDetails({ pendingAmount: 0, paymentDueDate: "No application found" });
            }
        } catch (e: any) {
            setError("Failed to fetch payment details.");
            console.error(e);
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
                        Showing pending amount and due date for the latest application.
                    </DialogDescription>
                </DialogHeader>
                <div className="py-4">
                    {isLoading && <div className="flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>}
                    {error && <p className="text-sm text-destructive">{error}</p>}
                    {details && !isLoading && (
                        <div className="space-y-4">
                            <div>
                                <p className="text-sm font-medium text-muted-foreground">Pending Amount</p>
                                <p className="text-xl font-bold">₹{details.pendingAmount.toFixed(2)}</p>
                            </div>
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

export default function UsersListPage() {
  const firestore = useFirestore();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'username', direction: 'ascending' });

  const usersQuery = useMemoFirebase(() => {
    if (!firestore) return null;
    const key = sortConfig?.key || 'username';
    const direction = sortConfig?.direction === 'ascending' ? 'asc' : 'desc';
    return query(
      collection(firestore, 'users'),
      orderBy(key, direction)
    );
  }, [firestore, sortConfig]);

  const { data: users, isLoading, error } = useCollection(usersQuery);

  const filteredUsers = useMemo(() => {
    if (!users) return [];
    
    return users.filter((user) => {
      const searchTermLower = searchTerm.toLowerCase();
      return (
        user.username?.toLowerCase().includes(searchTermLower) ||
        user.email?.toLowerCase().includes(searchTermLower)
      );
    });
  }, [users, searchTerm]);
  
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


  return (
    <div className="min-h-screen bg-background p-4 sm:p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center gap-4">
          <Link href="/dashboard" passHref>
            <Button variant="outline" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <h1 className="text-3xl font-bold">Users</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>User Records</CardTitle>
            <CardDescription>
              Browse and manage all registered users.
            </CardDescription>
            <div className="relative pt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by username or email..."
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
                      <TableHead>Email</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredUsers.length > 0 ? (
                      filteredUsers.map((user, index) => (
                        <TableRow key={user.id}>
                          <TableCell>{String(index + 1).padStart(3, '0')}</TableCell>
                          <TableCell className="font-medium">{user.username}</TableCell>
                          <TableCell>{user.email}</TableCell>
                          <TableCell className="text-right">
                            <UserDetailsDialog userId={user.id} />
                          </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={4}
                          className="h-24 text-center"
                        >
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
      </div>
    </div>
  );
}

    