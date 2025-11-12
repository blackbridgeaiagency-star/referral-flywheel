'use client';

/**
 * Invoice History Component
 *
 * Shows past invoices with value metrics
 */

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Button } from '../ui/button';
import { FileText, Check, Clock } from 'lucide-react';
import { format } from 'date-fns';

interface InvoiceHistoryProps {
  companyId: string;
}

interface Invoice {
  id: string;
  createdAt: string;
  periodStart: string;
  periodEnd: string;
  status: string;
  totalAmount: number;
  salesCount: number;
  referredSalesTotal: number;
  organicSalesTotal: number;
  creatorGainFromReferrals: number;
  additionalRevenue: number;
  percentageGrowth: number;
  stripeInvoiceUrl: string | null;
  paidAt: string | null;
}

export function InvoiceHistory({ companyId }: InvoiceHistoryProps) {
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/creator/${companyId}/invoices`)
      .then((res) => res.json())
      .then((data) => {
        setInvoices(data);
        setLoading(false);
      })
      .catch((error) => {
        console.error('Failed to fetch invoices:', error);
        setLoading(false);
      });
  }, [companyId]);

  if (loading) {
    return <InvoiceHistorySkeleton />;
  }

  if (!invoices || invoices.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Invoice History</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-slate-500">
            <FileText className="w-12 h-12 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No invoices yet</p>
            <p className="text-sm mt-1">
              Invoices are generated monthly when you have referred sales
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalInvoiced = invoices.reduce((sum, inv) => sum + Number(inv.totalAmount), 0);
  const totalValueGenerated = invoices.reduce(
    (sum, inv) => sum + Number(inv.creatorGainFromReferrals || inv.additionalRevenue),
    0
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Invoice History</CardTitle>
            <CardDescription>
              {invoices.length} invoice{invoices.length !== 1 ? 's' : ''} •
              Partnership since{' '}
              {format(new Date(invoices[invoices.length - 1].createdAt), 'MMM yyyy')}
            </CardDescription>
          </div>

          <div className="text-right">
            <div className="text-xs text-slate-600">Lifetime partnership value</div>
            <div className="text-xl font-bold text-green-600">
              ${totalValueGenerated.toLocaleString()} gained
            </div>
            <div className="text-sm text-slate-500">
              ${totalInvoiced.toLocaleString()} invoiced
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b text-left">
                <th className="pb-2 font-medium text-sm text-slate-600">Period</th>
                <th className="pb-2 font-medium text-sm text-slate-600 text-right">
                  Referred Sales
                </th>
                <th className="pb-2 font-medium text-sm text-slate-600 text-right">
                  You Gained
                </th>
                <th className="pb-2 font-medium text-sm text-slate-600 text-right">
                  Invoice
                </th>
                <th className="pb-2 font-medium text-sm text-slate-600 text-right">
                  Net Benefit
                </th>
                <th className="pb-2 font-medium text-sm text-slate-600">Status</th>
                <th className="pb-2 font-medium text-sm text-slate-600 text-right">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {invoices.map((invoice) => {
                const gain = Number(invoice.creatorGainFromReferrals || invoice.additionalRevenue || 0);
                const netBenefit = gain - Number(invoice.totalAmount);

                return (
                  <tr key={invoice.id} className="border-b last:border-0 hover:bg-slate-50">
                    <td className="py-3 font-medium">
                      {format(new Date(invoice.periodStart), 'MMM yyyy')}
                    </td>
                    <td className="py-3 text-right">
                      {invoice.salesCount} sales
                      <div className="text-xs text-slate-500">
                        ${Number(invoice.referredSalesTotal).toLocaleString()}
                      </div>
                    </td>
                    <td className="py-3 text-right text-green-600 font-medium">
                      +${gain.toLocaleString()}
                    </td>
                    <td className="py-3 text-right">
                      ${Number(invoice.totalAmount).toLocaleString()}
                    </td>
                    <td className="py-3 text-right font-semibold text-green-600">
                      ${netBenefit.toLocaleString()}
                    </td>
                    <td className="py-3">
                      <InvoiceStatusBadge status={invoice.status} />
                    </td>
                    <td className="py-3 text-right">
                      {invoice.stripeInvoiceUrl && (
                        <Button variant="outline" size="sm" asChild>
                          <a
                            href={invoice.stripeInvoiceUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                          >
                            View Invoice
                          </a>
                        </Button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  );
}

function InvoiceStatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { label: string; variant: 'default' | 'secondary' | 'destructive'; icon: any }
  > = {
    paid: { label: 'Paid', variant: 'default', icon: Check },
    sent: { label: 'Sent', variant: 'default', icon: Clock },
    pending: { label: 'Pending', variant: 'secondary', icon: Clock },
    overdue: { label: 'Overdue', variant: 'destructive', icon: Clock },
  };

  const { label, variant, icon: Icon } = config[status] || config.pending;

  return (
    <Badge variant={variant} className="gap-1">
      <Icon className="w-3 h-3" />
      {label}
    </Badge>
  );
}

function InvoiceHistorySkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 bg-slate-200 rounded w-1/3 animate-pulse" />
        <div className="h-4 bg-slate-200 rounded w-1/2 mt-2 animate-pulse" />
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-12 bg-slate-200 rounded animate-pulse" />
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
