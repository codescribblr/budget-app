'use client';

import Image from 'next/image';
import { getIconComponent } from '@/lib/merchant-icons';

interface MerchantLogoProps {
  logoUrl?: string | null;
  iconName?: string | null;
  displayName: string;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const sizeClasses = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

const imageSizes = {
  sm: 24,
  md: 32,
  lg: 48,
};

/**
 * Reusable component for displaying merchant logos/icons in a circular container
 * Supports both uploaded logos and icon library icons
 */
export function MerchantLogo({
  logoUrl,
  iconName,
  displayName,
  size = 'md',
  className = '',
}: MerchantLogoProps) {
  const sizeClass = sizeClasses[size];
  const imageSize = imageSizes[size];

  // Priority: icon > logo > placeholder
  if (iconName) {
    const IconComponent = getIconComponent(iconName);
    if (IconComponent) {
      const iconSizeClass = size === 'sm' ? 'h-4 w-4' : size === 'md' ? 'h-6 w-6' : 'h-8 w-8';
      return (
        <div className={`${sizeClass} rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border ${className}`}>
          <IconComponent className={iconSizeClass} />
        </div>
      );
    }
  }

  if (logoUrl) {
    return (
      <div className={`${sizeClass} rounded-full bg-muted flex items-center justify-center overflow-hidden border border-border ${className}`}>
        <Image
          src={logoUrl}
          alt={displayName}
          width={imageSize}
          height={imageSize}
          className="object-cover w-full h-full"
        />
      </div>
    );
  }

  // Placeholder
  const placeholderSizeClass = size === 'sm' ? 'h-2 w-2' : size === 'md' ? 'h-3 w-3' : 'h-4 w-4';
  return (
    <div className={`${sizeClass} rounded-full bg-muted flex items-center justify-center border border-border ${className}`}>
      <div className={`${placeholderSizeClass} rounded-full bg-muted-foreground/20`} />
    </div>
  );
}
