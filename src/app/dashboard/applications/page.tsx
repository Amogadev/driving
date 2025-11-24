
'use client';

import { useState, useMemo } from 'react';
import { collection, query, where, orderBy } from 'firebase/firestore';
import { useFirestore, useCollection, useUser, useMemoFirebase } from '@/firebase';
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
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Loader2, ArrowLeft, Search, ArrowUpDown } from 'lucide-react';
import Link from 'next/link';
import { format } from 'date-fns';

type SortConfig = {
  key: string;
  direction: 'ascending' | 'descending';
};

export default function ApplicationsListPage() {
  const firestore = useFirestore();
  const { user } = useUser();
  const [searchTerm, setSearchTerm] = useState('');
  const [sortConfig, setSortConfig] = useState<SortConfig | null>({ key: 'submittedAt', direction: 'descending' });

  const applicationsQuery = useMemoFirebase(() => {
    if (!firestore || !user) return null;
    return query(
      collection(firestore, 'llr_applications'),
      where('applicantId', '==', user.uid),
      // We are ordering by submittedAt by default. Other fields might not exist on all documents.
      orderBy('submittedAt', sortConfig?.direction === 'ascending' ? 'asc' : 'desc')
    );
  }, [firestore, user, sortConfig]);

  const { data: applications, isLoading, error } = useCollection(applicationsQuery);

  const sortedAndFilteredApplications = useMemo(() => {
    if (!applications) return [];
    
    let filtered = applications.filter((app) => {
      const searchTermLower = searchTerm.toLowerCase();
      return (
        app.fullName?.toLowerCase().includes(searchTermLower) ||
        app.applicationId?.toLowerCase().includes(searchTermLower) ||
        app.phone?.includes(searchTerm)
      );
    });

    if (sortConfig && sortConfig.key !== 'submittedAt') {
      filtered.sort((a, b) => {
        const aValue = a[sortConfig.key];
        const bValue = b[sortConfig.key];
        
        if (aValue === undefined || aValue === null) return 1;
        if (bValue === undefined || bValue === null) return -1;
        
        if (aValue < bValue) {
          return sortConfig.direction === 'ascending' ? -1 : 1;
        }
        if (aValue > bValue) {
          return sortConfig.direction === 'ascending' ? 1 : -1;
        }
        return 0;
      });
    }
    
    return filtered;
  }, [applications, searchTerm, sortConfig]);
  
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
          <h1 className="text-3xl font-bold">LLR Applications</h1>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Application Records</CardTitle>
            <CardDescription>
              Browse and manage all submitted applications.
            </CardDescription>
            <div className="relative pt-4">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                placeholder="Search by name, ID, or phone..."
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
                <p>Error loading applications: {error.message}</p>
                <p className="text-sm text-muted-foreground">Please check your internet connection or security rules.</p>
              </div>
            )}
            {!isLoading && !error && (
              <div className="border rounded-md">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="cursor-pointer" onClick={() => requestSort('applicationId')}>
                        <div className="flex items-center">Application ID {getSortIndicator('applicationId')}</div>
                      </TableHead>
                      <TableHead className="cursor-pointer" onClick={() => requestSort('fullName')}>
                        <div className="flex items-center">Full Name {getSortIndicator('fullName')}</div>
                      </TableHead>
                      <TableHead>Phone</TableHead>
                      <TableHead>Vehicle Class</TableHead>
                      <TableHead className="cursor-pointer" onClick={() => requestSort('paymentStatus')}>
                         <div className="flex items-center">Payment {getSortIndicator('paymentStatus')}</div>
                      </TableHead>
                       <TableHead className="cursor-pointer" onClick={() => requestSort('submittedAt')}>
                         <div className="flex items-center">Submitted {getSortIndicator('submittedAt')}</div>
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sortedAndFilteredApplications.length > 0 ? (
                      sortedAndFilteredApplications.map((app) => (
                        <TableRow key={app.id}>
                          <TableCell className="font-medium">{app.applicationId}</TableCell>
                          <TableCell>{app.fullName}</TableCell>
                          <TableCell>{app.phone}</TableCell>
                          <TableCell>{app.classOfVehicle}</TableCell>
                          <TableCell>
                            <Badge
                              variant={
                                app.paymentStatus === 'Paid'
                                  ? 'default'
                                  : 'destructive'
                              }
                              className={app.paymentStatus === 'Paid' ? 'bg-green-500' : ''}
                            >
                              {app.paymentStatus}
                            </Badge>
                          </TableCell>
                           <TableCell>
                             {app.submittedAt?.toDate ? format(app.submittedAt.toDate(), 'PPP p') : 'N/A'}
                           </TableCell>
                        </TableRow>
                      ))
                    ) : (
                      <TableRow>
                        <TableCell
                          colSpan={6}
                          className="h-24 text-center"
                        >
                          No applications found.
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
