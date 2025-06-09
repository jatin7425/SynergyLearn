
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter, usePathname } from 'next/navigation';
import PageHeader from '@/components/common/page-header';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import { db } from '@/lib/firebase';
import { collection, getDocs, query, orderBy, Timestamp, limit } from 'firebase/firestore';
import { Loader2, AlertCircle, ShieldAlert, ListOrdered, Download } from 'lucide-react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

// This should be the same as in model-settings page or centralized
const ADMIN_UID = 'Mcjp0wyJVcal3ocfav9aMOHzNzV2';

interface AuditLogEntry {
  id: string;
  timestamp: Timestamp;
  adminUid: string;
  adminEmail?: string; // Optional, for display
  actionType: string;
  details: Record<string, any>;
}

export default function AuditLogsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const { toast } = useToast();

  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [isLoadingLogs, setIsLoadingLogs] = useState(true);
  const [isAuthorizedAdmin, setIsAuthorizedAdmin] = useState(false);

  useEffect(() => {
    if (authLoading) return;

    if (!user) {
      toast({ title: "Authentication Required", description: "Please log in to access admin settings.", variant: "destructive" });
      router.push(`/login?redirect=${pathname}`);
      return;
    }

    if (user.uid === ADMIN_UID) {
      setIsAuthorizedAdmin(true);
      const fetchAuditLogs = async () => {
        setIsLoadingLogs(true);
        try {
          const logsCollectionRef = collection(db, 'auditLogs');
          // Fetch last 100 logs, ordered by timestamp descending
          const q = query(logsCollectionRef, orderBy('timestamp', 'desc'), limit(100));
          const querySnapshot = await getDocs(q);
          const logs: AuditLogEntry[] = [];
          querySnapshot.forEach((doc) => {
            logs.push({ id: doc.id, ...doc.data() } as AuditLogEntry);
          });
          setAuditLogs(logs);
        } catch (error) {
          console.error("Error fetching audit logs:", error);
          toast({ title: "Error loading logs", description: (error as Error).message, variant: "destructive" });
        } finally {
          setIsLoadingLogs(false);
        }
      };
      fetchAuditLogs();
    } else {
      setIsAuthorizedAdmin(false);
      setIsLoadingLogs(false);
      toast({ title: "Access Denied", description: "You are not authorized to view this page.", variant: "destructive" });
    }
  }, [user, authLoading, router, pathname, toast]);

  const downloadLogs = (format: 'json' | 'txt') => {
    if (auditLogs.length === 0) {
      toast({ title: "No logs to download", variant: "default" });
      return;
    }
    let dataStr: string;
    let filename: string;
    let mimeType: string;

    const logsToExport = auditLogs.map(log => ({
        ...log,
        timestamp: log.timestamp.toDate().toISOString(), // Convert Firestore Timestamp to ISO string
    }));

    if (format === 'json') {
      dataStr = JSON.stringify(logsToExport, null, 2);
      filename = 'audit_logs.json';
      mimeType = 'application/json';
    } else { // txt
      dataStr = logsToExport.map(log => 
        `Timestamp: ${log.timestamp}\nAdmin UID: ${log.adminUid}\nAdmin Email: ${log.adminEmail || 'N/A'}\nAction: ${log.actionType}\nDetails: ${JSON.stringify(log.details, null, 2)}\n-------------------\n`
      ).join('');
      filename = 'audit_logs.txt';
      mimeType = 'text/plain';
    }

    const blob = new Blob([dataStr], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast({ title: `Logs downloaded as ${format.toUpperCase()}` });
  };

  if (authLoading || (isLoadingLogs && isAuthorizedAdmin)) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-12 w-12 animate-spin text-primary" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 text-center">
        <AlertCircle className="w-16 h-16 text-destructive mb-4" />
        <h1 className="text-2xl font-bold mb-2">Authentication Required</h1>
        <Button onClick={() => router.push(`/login?redirect=${pathname}`)}>Go to Login</Button>
      </div>
    );
  }

  if (!isAuthorizedAdmin) {
    return (
      <div className="space-y-6">
        <PageHeader
          title="Admin: Audit Logs"
          description="View records of administrative actions."
        />
        <Card className="border-destructive">
          <CardHeader>
            <CardTitle className="flex items-center text-destructive">
              <ShieldAlert className="mr-2 h-5 w-5" />
              Access Denied
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-destructive-foreground">You do not have permission to access this page.</p>
            <Button variant="outline" onClick={() => router.push('/')} className="mt-4">
              Go to Dashboard
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <PageHeader
        title="Admin: Audit Logs"
        description={`Viewing the last ${auditLogs.length} administrative actions.`}
        actions={
          <div className="flex gap-2">
            <Button onClick={() => downloadLogs('json')} variant="outline" disabled={auditLogs.length === 0}>
              <Download className="mr-2 h-4 w-4" /> Download JSON
            </Button>
            <Button onClick={() => downloadLogs('txt')} variant="outline" disabled={auditLogs.length === 0}>
              <Download className="mr-2 h-4 w-4" /> Download TXT
            </Button>
          </div>
        }
      />
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <ListOrdered className="mr-2 h-5 w-5 text-primary" />
            Log Entries
          </CardTitle>
        </CardHeader>
        <CardContent>
          {isLoadingLogs ? (
             <div className="flex justify-center items-center py-10"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
          ) : auditLogs.length === 0 ? (
            <p className="text-muted-foreground text-center">No audit logs found.</p>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Timestamp</TableHead>
                    <TableHead>Admin</TableHead>
                    <TableHead>Action Type</TableHead>
                    <TableHead>Details</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {auditLogs.map((log) => (
                    <TableRow key={log.id}>
                      <TableCell className="text-xs">
                        {log.timestamp?.toDate().toLocaleString() || 'N/A'}
                      </TableCell>
                      <TableCell className="text-xs">
                        {log.adminEmail || log.adminUid}
                      </TableCell>
                      <TableCell className="font-mono text-xs">{log.actionType}</TableCell>
                      <TableCell className="text-xs">
                        <pre className="max-w-xs overflow-x-auto bg-muted p-1 rounded text-[10px]">
                          {JSON.stringify(log.details, null, 2)}
                        </pre>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
