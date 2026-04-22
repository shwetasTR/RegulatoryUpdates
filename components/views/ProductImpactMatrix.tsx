import { RegulatoryChange } from '@/lib/types';
import { PRODUCT_MODULES } from '@/lib/constants';
import { Badge } from '../ui/badge';
import { Card } from '../ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '../ui/table';

interface ProductImpactMatrixProps {
  changes: RegulatoryChange[];
}

export default function ProductImpactMatrix({ changes }: ProductImpactMatrixProps) {
  const sortedChanges = [...changes].sort((a, b) => {
    const severityOrder = { critical: 0, high: 1, medium: 2, low: 3 };
    if (severityOrder[a.severity] !== severityOrder[b.severity]) {
      return severityOrder[a.severity] - severityOrder[b.severity];
    }
    return new Date(b.publishDate).getTime() - new Date(a.publishDate).getTime();
  });

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-500/20 text-red-400 border-red-500/50';
      case 'high':
        return 'bg-amber-500/20 text-amber-400 border-amber-500/50';
      case 'medium':
        return 'bg-blue-500/20 text-blue-400 border-blue-500/50';
      case 'low':
        return 'bg-gray-500/20 text-gray-400 border-gray-500/50';
      default:
        return '';
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'CSMS':
        return 'bg-green-500/20 text-green-400';
      case 'WH':
        return 'bg-pink-500/20 text-pink-400';
      case 'OFAC':
        return 'bg-purple-500/20 text-purple-400';
      default:
        return 'bg-gray-500/20 text-gray-400';
    }
  };

  return (
    <Card className="p-6">
      <div className="mb-4">
        <h2 className="text-xl font-semibold">Product Impact Matrix</h2>
        <p className="text-sm text-muted-foreground">
          Regulatory changes mapped to affected product modules
        </p>
      </div>

      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[300px]">Change</TableHead>
              {Object.values(PRODUCT_MODULES).map((module) => (
                <TableHead key={module.id} className="text-center min-w-[80px]">
                  <div className="text-xs">{module.id}</div>
                  <div className="text-xs font-normal text-muted-foreground truncate">
                    {module.name.split(' ')[0]}
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedChanges.map((change) => (
              <TableRow key={change.id}>
                <TableCell>
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge className={getSeverityColor(change.severity)}>
                        {change.severity.toUpperCase()}
                      </Badge>
                      <Badge className={getSourceColor(change.source)}>
                        {change.source}
                      </Badge>
                    </div>
                    <div className="font-medium text-sm">{change.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {new Date(change.publishDate).toLocaleDateString()}
                    </div>
                  </div>
                </TableCell>
                {Object.keys(PRODUCT_MODULES).map((moduleId) => (
                  <TableCell key={moduleId} className="text-center">
                    {change.productModules.includes(parseInt(moduleId)) && (
                      <span className="text-green-400 text-lg">✓</span>
                    )}
                  </TableCell>
                ))}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {sortedChanges.length === 0 && (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">📊</div>
          <h3 className="text-lg font-semibold mb-2">No Product Impacts</h3>
          <p className="text-sm text-muted-foreground max-w-md mx-auto">
            No regulatory changes affecting product modules. Your products are in the clear!
          </p>
        </div>
      )}
    </Card>
  );
}
