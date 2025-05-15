import ClientConfirmation from '../ClientConfirmation';

// Important: Use dynamic metadata to make Next.js treat this as a dynamic route
export const dynamic = 'force-dynamic';

export default function BookingConfirmation() {
  return <ClientConfirmation />;
}