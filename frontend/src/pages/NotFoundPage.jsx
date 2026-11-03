import { Link } from 'react-router-dom';
import { Store, Compass } from 'lucide-react';
import Button from '../components/Button';

const NotFoundPage = () => {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 py-16 text-center font-sans bg-[#F5F5F2]">
      {/* 404 Icon */}
      <div className="grid h-20 w-20 place-items-center rounded-3xl bg-[#0638C9]/10 text-[#0638C9] shadow-inner">
        <Compass className="h-10 w-10 stroke-[2] animate-pulse" />
      </div>

      {/* Error Badge */}
      <span className="mt-6 rounded-full bg-[#B7FF00] px-4 py-1 text-xs font-heading font-extrabold uppercase tracking-wider text-[#111111] shadow-sticker-sm">
        ★ 404 Page Not Found
      </span>

      {/* Heading */}
      <h1 className="mt-4 text-3xl font-heading font-black text-[#111111] sm:text-4xl tracking-tight">
        Looks Like You're Off-Campus!
      </h1>

      {/* Description */}
      <p className="mx-auto mt-3 max-w-md text-sm text-[#62666F] leading-relaxed">
        The page or listing you are looking for does not exist or may have been moved.
        Let's get you back to the main quad.
      </p>

      {/* Navigation Buttons */}
      <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
        <Link to="/">
          <Button variant="lime" size="md" icon={Store} className="uppercase text-xs">
            Return Home
          </Button>
        </Link>

        <Link to="/marketplace">
          <Button variant="white" size="md" className="uppercase text-xs">
            Browse Marketplace
          </Button>
        </Link>
      </div>
    </div>
  );
};

// Explicit default export
export default NotFoundPage;