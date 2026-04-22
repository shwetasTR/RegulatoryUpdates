import { DataSource } from '@/lib/types';

interface FooterProps {
  timestamp: string;
  dataSource: DataSource;
}

export default function Footer({ timestamp, dataSource }: FooterProps) {
  return (
    <footer className="border-t border-border bg-card px-6 py-4 mt-8">
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          Data sources:
          <a
            href="https://www.cbp.gov/trade/automated/cargo-systems-messaging-service"
            target="_blank"
            rel="noopener noreferrer"
            className="ml-1 underline hover:text-foreground"
          >
            CBP CSMS
          </a>
          {', '}
          <a
            href="https://www.whitehouse.gov/presidential-actions/"
            target="_blank"
            rel="noopener noreferrer"
            className="underline hover:text-foreground"
          >
            White House
          </a>
        </div>
        <div>
          Last updated: {new Date(timestamp).toLocaleString()}
          {' • '}
          Source: {dataSource}
        </div>
      </div>
    </footer>
  );
}
