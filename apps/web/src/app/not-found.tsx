import Link from 'next/link';
import { FileQuestion } from 'lucide-react';
import { StatusScreen } from '@/components/ui/status-screen';
import { buttonVariants } from '@/components/ui/button';

export default function NotFound() {
  return (
    <StatusScreen
      icon={FileQuestion}
      title="We couldn't find that page"
      actions={
        <>
          <Link href="/feed" className={buttonVariants({ className: 'flex-1' })}>Go to CuriousBees</Link>
          <Link href="/" className={buttonVariants({ variant: 'secondary', className: 'flex-1' })}>Back to home</Link>
        </>
      }
    >
      <p>The link may be out of date, or the page may have moved. Check the address, or head back and navigate from there.</p>
    </StatusScreen>
  );
}
